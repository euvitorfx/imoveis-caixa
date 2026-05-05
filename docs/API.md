# Documentação da API

Base URL: `https://www.buscaleiloescaixa.com.br/api`

Todos os endpoints são públicos (sem autenticação). Retornam JSON.

---

## GET /api/imoveis

Lista imóveis com filtros, ordenação e paginação.

### Parâmetros de Query

| Parâmetro | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `estado` | string | UF(s) separadas por vírgula | `SP` ou `SP,RJ,MG` |
| `cidade` | string | Cidade(s) separadas por vírgula | `SAO PAULO` ou `CAMPINAS,SANTOS` |
| `bairro` | string | Bairro(s) separados por vírgula | `CENTRO,VILA MADALENA` |
| `endereco` | string | Busca parcial no nome da rua | `avenida paulista` |
| `tipo` | string | Tipo(s) separados por vírgula | `Apartamento` ou `Casa,Apartamento` |
| `modalidade` | string | Modalidade(s) separadas por vírgula | `Leilão SFI` |
| `precoMin` | number | Preço mínimo em R$ | `100000` |
| `precoMax` | number | Preço máximo em R$ | `500000` |
| `areaMin` | number | Área total mínima em m² | `50` |
| `areaMax` | number | Área total máxima em m² | `200` |
| `quartos` | number | Mínimo de quartos | `2` |
| `vagas` | number | Mínimo de vagas | `1` |
| `suites` | number | Mínimo de suítes | `1` |
| `ocupacao` | string | `Desocupado` ou `Ocupado` | `Desocupado` |
| `fgts` | string | `sim` para aceita FGTS | `sim` |
| `leilaoAgendado` | string | `sim` para somente com leilão futuro | `sim` |
| `financiamento` | string | `sim` para aceita financiamento | `sim` |
| `descontoMin` | number | Desconto mínimo em % | `30` |
| `ordenar` | string | Critério de ordenação (ver tabela abaixo) | `preco_asc` |
| `page` | number | Página (default: 1) | `2` |
| `limit` | number | Itens por página (max: 48, default: 24) | `24` |

### Valores de `ordenar`

| Valor | Descrição |
|---|---|
| `preco_asc` | Menor preço primeiro (padrão) |
| `preco_desc` | Maior preço primeiro |
| `desconto_desc` | Maior desconto primeiro |
| `area_desc` | Maior área primeiro |
| `leilao_prox` | Leilão mais próximo primeiro |
| `recente` | Adicionado recentemente |
| `antigo` | Adicionado há mais tempo |

### Resposta

```json
{
  "imoveis": [
    {
      "_id": "...",
      "hdnImovel": "12345678",
      "estado": "SP",
      "cidade": "SÃO PAULO",
      "bairro": "VILA MADALENA",
      "endereco": "Rua Harmonia, 123",
      "preco": 450000,
      "precoAval": 600000,
      "desconto": 25,
      "modalidade": "Leilão SFI",
      "financiamento": "Sim",
      "tipo": "Apartamento",
      "areaTotal": 80,
      "areaUtil": 75,
      "quartos": 2,
      "vagas": 1,
      "fotoUrl": "https://...",
      "urlDetalhe": "https://...",
      "dataLeilao1": "15/06/2026"
    }
  ],
  "total": 1250,
  "page": 1,
  "totalPages": 53
}
```

### Exemplos

```bash
# Apartamentos em SP e RJ abaixo de R$300k
GET /api/imoveis?estado=SP,RJ&tipo=Apartamento&precoMax=300000

# Imóveis com leilão agendado, desocupados, aceita FGTS
GET /api/imoveis?leilaoAgendado=sim&ocupacao=Desocupado&fgts=sim&ordenar=leilao_prox

# Casas com desconto acima de 40% em Minas Gerais
GET /api/imoveis?estado=MG&tipo=Casa&descontoMin=40&ordenar=desconto_desc
```

---

## GET /api/filtros

Retorna as opções disponíveis para os filtros de cidade, bairro, tipo e modalidade, filtradas pelo contexto atual.

### Parâmetros de Query

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `estado` | string | UF(s) separadas por vírgula — filtra as cidades retornadas |
| `cidade` | string | Cidade(s) separadas por vírgula — filtra os bairros retornados |

### Resposta

```json
{
  "cidades": ["CAMPINAS", "GUARULHOS", "SANTOS", "SÃO PAULO"],
  "bairros": ["CENTRO", "JARDIM PAULISTA", "VILA MADALENA"],
  "tipos": ["Apartamento", "Casa", "Terreno"],
  "modalidades": ["Leilão SFI", "Licitação Aberta", "Venda Direta Online"]
}
```

### Comportamento
- `cidades` só é retornado se `estado` for informado
- `bairros` só é retornado se `cidade` for informado
- `tipos` e `modalidades` sempre retornam (filtrados pelo estado/cidade se informados)
- Suporta múltiplos estados: `?estado=SP,RJ` retorna cidades dos dois estados combinados

---

## GET /api/estatisticas

Retorna 7 métricas calculadas em tempo real sobre o acervo atual.

### Resposta

```json
{
  "totalAtivos": 29758,
  "maisBarato": {
    "preco": 5300,
    "cidade": "ARCOVERDE",
    "estado": "PE",
    "tipo": "Casa",
    "hdnImovel": "..."
  },
  "maiorDesconto": {
    "desconto": 72,
    "preco": 45000,
    "cidade": "...",
    "estado": "..."
  },
  "abaixo100k": 1842,
  "desconto50mais": 312,
  "novos24h": 47,
  "mediaPrecoPorEstado": [
    { "estado": "SP", "mediaPreco": 285000, "total": 8420 },
    { "estado": "RJ", "mediaPreco": 195000, "total": 3210 }
  ]
}
```

---

## GET /api/status

Status do sistema — última atualização do scraper e total de imóveis.

### Resposta

```json
{
  "lastSync": "2026-05-05T06:00:00Z",
  "totalImoveis": 29758
}
```

---

## GET /api/visita

Retorna contadores de visitas do site.

### Resposta

```json
{
  "diario": 142,
  "mensal": 3201,
  "pageviews": 15420
}
```

---

## POST /api/visita

Registra uma visita/pageview. Chamado automaticamente pelo componente `RegistraVisita.tsx`.

### Body

```json
{ "novaSessao": true }
```

- `novaSessao: true` → incrementa contadores diário e mensal (além do pageview)
- `novaSessao: false` → incrementa apenas o contador de pageviews

### Resposta

```json
{ "ok": true }
```

---

## GET /api/corretores/lista

Lista os corretores aprovados e ativos cadastrados no sistema.

### Resposta

```json
[
  {
    "nome": "João Silva",
    "slug": "joao-silva",
    "estado": "SP",
    "telefone": "11999999999",
    "descricao": "...",
    "foto": "..."
  }
]
```

---

## GET /api/health

Health check simples para monitoramento.

### Resposta

```json
{ "ok": true }
```

---

## Notas Gerais

### Lógica de filtros multi-valor
Os filtros `estado`, `cidade`, `bairro`, `tipo` e `modalidade` aceitam múltiplos valores separados por vírgula. Internamente o sistema usa o operador `$in` do MongoDB:

```
?estado=SP,RJ  →  { estado: { $in: ["SP", "RJ"] } }
```

### Cálculo de desconto
O filtro `descontoMin` usa a fórmula: `desconto = 1 - (preco / precoAval)`. É calculado via `$expr` do MongoDB para garantir precisão independente do valor armazenado no campo `desconto`.

### Paginação
A listagem principal usa 24 itens por página. O endpoint aceita até 48 via parâmetro `limit`.
