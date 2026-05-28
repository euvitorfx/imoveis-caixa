# Arquitetura do Sistema

## Visão Geral

O sistema é composto por dois subsistemas independentes que compartilham o mesmo banco de dados:

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS (cron)                     │
│                                                              │
│  ┌──────────────────┐        ┌──────────────────────────┐   │
│  │   scraper.yml    │        │       enrich.yml         │   │
│  │  03h/10h/18h BRT │        │ 00h/04h/08h/12h/16h/20h  │   │
│  └────────┬─────────┘        └────────────┬─────────────┘   │
│           │                               │                  │
│     run.py (Python)               enrich.py (Python)        │
│     Playwright headless            Playwright headless       │
│           │                               │                  │
└───────────┼───────────────────────────────┼─────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────────────────────────────────────────┐
│                   MongoDB Atlas M0                         │
│              DB: imoveis_caixa                             │
│         Collection: imoveis  |  _meta                      │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│                      VERCEL                                │
│                   Next.js 15                               │
│                                                            │
│   Server Components         API Routes                     │
│   (page.tsx — SSR)         (/api/imoveis)                  │
│                             (/api/filtros)                  │
│   Client Components         (/api/estatisticas)            │
│   (Filtros.tsx)             (/api/visita)                  │
│   (MapaImoveis.tsx)         (/api/status)                  │
└───────────────────────────────────────────────────────────┘
```

---

## Fluxo de Dados

### 1. Coleta (scraper.yml — 3x/dia)

```
Caixa.gov.br (download-lista.asp)
    │
    │  CSV por estado (UF) via Playwright
    ▼
run.py
    │
    ├─ _csv_to_docs()          → normaliza campos do CSV
    ├─ upsert_imoveis()        → insere/atualiza no MongoDB (ativo: true)
    ├─ marcar_inativos()       → marca ativo: false os que saíram do CSV
    └─ geocode_batch()         → geocodifica novos imóveis sem lat/lng
```

**Retry automático:** se o download de um estado falhar, o sistema tenta novamente após 10 segundos antes de desistir.

### 2. Enriquecimento (enrich.yml — 6x/dia)

```
MongoDB (imoveis onde enriched != true)
    │
    │  busca imóveis pendentes
    ▼
enrich.py
    │
    ├─ get_detalhes_imovel()   → visita página de detalhe na Caixa
    │   ├─ Detecta redirecionamento → {"_inativo": true}
    │   ├─ Detecta texto de erro   → {"_inativo": true}
    │   └─ Extrai: CEP, leiloeiro, FGTS, ocupação, datas de leilão
    │
    ├─ Se _inativo: ativo = false   (imóvel removido da Caixa)
    ├─ Se fotoUrl aponta para caixa.gov.br → upload_foto() → Cloudinary CDN
    └─ Se ok: salva campos extras + enriched = true
```

### 3. Exibição (Next.js — Vercel)

```
Usuário acessa buscaleiloescaixa.com.br
    │
    ▼
page.tsx (Server Component)
    │
    ├─ Lê searchParams da URL
    ├─ Consulta MongoDB diretamente (SSR)
    └─ Renderiza cards + paginação

Filtros.tsx (Client Component)
    │
    ├─ Lê filtros do sessionStorage (persistência de sessão)
    ├─ Chama /api/filtros para opções de cidade/bairro
    └─ Ao aplicar: gera URL com params + router.push()
```

---

## Banco de Dados

### Collection: `imoveis`

```javascript
{
  // Identificação
  hdnImovel:      "string",   // chave única da Caixa
  ativo:          true,       // false = removido/vendido

  // Localização
  estado:         "SP",
  cidade:         "SÃO PAULO",
  bairro:         "VILA MADALENA",
  endereco:       "Rua...",
  cep:            "01310-100",  // enriquecido
  lat:            -23.5505,
  lng:            -46.6333,

  // Preço
  preco:          450000,
  precoAval:      600000,
  desconto:       25,           // percentual

  // Características
  tipo:           "Apartamento",
  modalidade:     "Leilão SFI",
  financiamento:  "Sim",
  areaTotal:      80,
  areaUtil:       75,
  areaTerreno:    null,
  quartos:        2,
  vagas:          1,
  suites:         1,

  // Enriquecimento (enrich.py)
  ocupacao:       "Desocupado",
  fgts:           true,
  leiloeiro:      "Nome Leiloeiro Ltda",
  edital:         "Edital 001/2026",
  editaiUrl:      "https://...",
  matriculaUrl:   "https://...",
  dataLeilao1:    "15/06/2026",
  dataLeilao1Date: ISODate("2026-06-15"),
  dataLeilao2:    "22/06/2026",
  enriched:       true,

  // URLs
  urlDetalhe:     "https://venda-imoveis.caixa.gov.br/...",
  fotoUrl:        "https://...",

  // Histórico de preço
  historicoPreco: [
    { data: "2026-05-01T00:00:00Z", preco: 450000 }
  ],

  // Timestamps
  dataInsercao:    ISODate,
  dataAtualizacao: ISODate
}
```

### Collection: `_meta`

```javascript
// Último sync do scraper
{ key: "lastSync", ts: ISODate, totalImoveis: 29758 }

// Contador de visitas
{
  key: "visitas",
  diario:   { data: "2026-05-05", count: 142 },
  mensal:   { mes: "2026-05",     count: 3201 },
  pageviews: 15420
}
```

### Índices

```javascript
hdnImovel  → unique
estado     → ascending
cidade     → ascending
modalidade → ascending
preco      → ascending
tipo       → ascending
ativo      → ascending
dataInsercao → ascending
```

---

## Decisões Técnicas

### Por que CSV em vez de scraping página por página?
A Caixa oferece download de CSV por estado em `download-lista.asp`. É ordens de magnitude mais rápido que visitar cada imóvel individualmente — 27 downloads vs. ~30.000 requisições.

### Por que Playwright em vez de requests?
O site da Caixa usa JavaScript para renderizar o formulário de download e para os detalhes do imóvel. Requests puro não seria suficiente.

### Por que Next.js App Router com Server Components?
A listagem principal (`page.tsx`) consulta o MongoDB diretamente no servidor — sem round-trip de API, melhor SEO, primeira renderização completa para crawlers.

### Por que sessionStorage para filtros?
O usuário pode navegar para a página de detalhe e voltar esperando encontrar os mesmos filtros. O sessionStorage preserva o estado durante toda a sessão sem precisar de backend.

### Por que Nominatim (OpenStreetMap) para geocodificação?
Gratuito, sem limite de uso com espera de 1s entre requisições. Para ~30.000 imóveis geocodificados uma única vez, é a opção ideal.

### Por que MongoDB Atlas M0?
Tier gratuito (512MB) suficiente para ~30.000 documentos com os campos do projeto. Sem custo operacional para o volume atual.

### Por que Cloudinary para as fotos?
O Vercel bloqueia requisições diretas a `venda-imoveis.caixa.gov.br` por CORS. As fotos são migradas para o Cloudinary CDN pelo `enrich.py`, resolvendo o problema tanto na exibição web quanto no PDF (que precisa de URL CORS-permitida para incluir a imagem).
