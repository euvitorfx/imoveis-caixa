# Scraper — Documentação

O scraper coleta imóveis do site oficial da Caixa Econômica Federal e armazena no MongoDB Atlas.

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `run.py` | Ponto de entrada principal — orquestra scraping completo |
| `scraper.py` | Download de CSV + extração de detalhes via Playwright |
| `enrich.py` | Enriquecimento incremental com dados da página de detalhe |
| `mongo.py` | Operações com MongoDB (upsert, marcar inativos, sync) |
| `geocoder.py` | Geocodificação via Nominatim/OpenStreetMap |
| `geocode_run.py` | Geocodificação em massa com ETA e retomada |
| `requirements.txt` | Dependências Python |

---

## Configuração

### Pré-requisitos

```bash
Python 3.11+
pip install -r requirements.txt
playwright install chromium
playwright install-deps chromium
```

### Variáveis de Ambiente

Crie o arquivo `scraper/.env`:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/
MONGODB_DB=imoveis_caixa
MONGODB_COLLECTION=imoveis
```

---

## Comandos

### run.py — Scraping Completo

```bash
# Todos os 27 estados
python run.py --headless

# Estados específicos
python run.py --headless --estados SP RJ MG

# Sem visitar páginas de detalhe (mais rápido, sem foto)
python run.py --headless --sem-detalhes

# Sem geocodificar imóveis novos
python run.py --headless --sem-geocode

# Com janela do navegador visível (debug local)
python run.py
```

### enrich.py — Enriquecimento de Detalhes

```bash
# Processa todos os imóveis pendentes (enriched != true)
python enrich.py --headless

# Limita a N imóveis por execução
python enrich.py --headless --limite 200

# Filtra por estado
python enrich.py --headless --estado SP

# Reprocessa mesmo os já enriquecidos (útil para detectar imóveis vendidos)
python enrich.py --headless --reprocessar

# Forçar verificação de imóveis vendidos em um estado específico
python enrich.py --headless --reprocessar --estado PE
```

### geocode_run.py — Geocodificação em Massa

```bash
# Geocodifica todos os imóveis sem lat/lng
python geocode_run.py

# Com limite
python geocode_run.py --limite 1000
```

---

## Como Funciona o Scraping

### 1. Download do CSV

A Caixa disponibiliza um CSV por estado em:
```
https://venda-imoveis.caixa.gov.br/sistema/download-lista.asp
```

O scraper usa Playwright para selecionar o estado e capturar o download automaticamente. O CSV contém campos como: N° do imóvel, UF, Cidade, Bairro, Endereço, Preço, Valor de avaliação, Desconto, Modalidade de venda, Descrição, Link de acesso.

### 2. Parsing do CSV

A função `_csv_to_docs()` em `scraper.py` normaliza os campos:
- Converte preços do formato brasileiro (`1.234,56` → `1234.56`)
- Extrai tipo, área, quartos, vagas e suítes do campo "Descrição"
- Reconstrói a URL de detalhe a partir do `hdnImovel` quando truncada

### 3. Upsert no MongoDB

A função `upsert_imoveis()` em `mongo.py`:
- Usa `hdnImovel` como chave única (índice único)
- `$set` atualiza todos os campos do imóvel
- `$push` adiciona ao histórico de preço apenas se o preço mudou
- `$setOnInsert` define `dataInsercao` somente na primeira inserção

### 4. Marcação de Inativos

Após o upsert de cada estado, `marcar_inativos(estado, hdns)`:
- Recebe a lista de `hdnImovel` presentes no CSV atual
- Marca como `ativo: false` qualquer imóvel daquele estado que **não** esteja na lista
- Isso garante que imóveis vendidos/retirados sejam removidos automaticamente

**Retry automático:** se o download falhar, o sistema tenta novamente após 10 segundos. Se falhar nas 2 tentativas, o estado é listado no resumo final e os imóveis existentes permanecem inalterados até a próxima execução bem-sucedida.

### 5. Geocodificação

Após o scraping, `geocode_batch()` processa imóveis novos sem lat/lng:
- Usa a API Nominatim (OpenStreetMap) — gratuita
- Intervalo de 1,1s entre requisições (respeita o rate limit)
- Monta a query com: endereço + cidade + estado + "Brasil"
- Salva `lat` e `lng` no documento

---

## Como Funciona o Enriquecimento

O `enrich.py` visita a página de detalhe de cada imóvel na Caixa para extrair campos não disponíveis no CSV:

### Campos Extraídos

| Campo | Como detectado |
|---|---|
| `cep` | Regex: `CEP: XXXXX-XXX` |
| `leiloeiro` | Regex: `Leiloeiro(a): ...` |
| `edital` | Regex: `Edital: ...` |
| `editaiUrl` | `onclick="ExibeDoc('...edital...pdf')"` |
| `matriculaUrl` | `onclick="ExibeDoc('...matricula...pdf')"` |
| `ocupacao` | Regex: `Desocupado` ou `Ocupado` |
| `fgts` | Regex: `Permite utilização de FGTS` |
| `dataLeilao1` | Regex: `Data do 1° Leilão DD/MM/YYYY` |
| `dataLeilao1Date` | ISODate convertido de dataLeilao1 |
| `dataLeilao2` | Regex: `Data do 2° Leilão DD/MM/YYYY` |
| `dataLeilao1` (Licitação) | Regex: `Data da Licitação Aberta - DD/MM/YYYY` |

### Detecção de Imóvel Removido

Antes de extrair campos, o enrich verifica se o imóvel ainda existe:

1. **Redirecionamento:** se a URL após o carregamento não contiver `detalhe-imovel.asp`, o imóvel foi removido
2. **Texto de erro:** se a página contiver frases como "imóvel não encontrado", "registro não encontrado", etc.

Quando detectado, o sistema:
- Define `ativo: false` no MongoDB
- Define `enriched: true` (para não reprocessar)
- Loga: `⚠ Desativado: XXXXX (página não encontrada na Caixa)`

---

## Execução Automática (GitHub Actions)

### scraper.yml

```yaml
schedule:
  - cron: "0 6 * * *"    # 03:00 BRT
  - cron: "0 13 * * *"   # 10:00 BRT
  - cron: "0 21 * * *"   # 18:00 BRT

comando: python run.py --headless --sem-detalhes
```

`--sem-detalhes` pula a visita às páginas de detalhe durante o scraping — apenas baixa o CSV. Os detalhes são coletados separadamente pelo `enrich.yml`.

### enrich.yml

```yaml
schedule: 6x por dia (00h, 04h, 08h, 12h, 16h, 20h BRT)
limite: 700 imóveis por execução = ~4.200/dia

comando: python enrich.py --headless --limite 700
```

---

## Manutenção

### Verificar imóveis suspeitos em um estado

```bash
python enrich.py --reprocessar --estado PE --headless
```

Revisita todos os imóveis ativos do estado, mesmo os já enriquecidos, e desativa os que não estão mais disponíveis na Caixa.

### Reprocessar imóvel específico

```python
# No Python interativo
from scraper import CaixaScraper
s = CaixaScraper(headless=False)
result = s.get_detalhes_imovel("12345678")
print(result)
s.close()
```

### Verificar totais por estado

```python
from mongo import total_por_estado
print(total_por_estado())
```

---

## Limitações Conhecidas

| Limitação | Causa | Impacto |
|---|---|---|
| Lag de 1-3 dias para imóveis vendidos | CSV da Caixa atualizado em lote | Imóvel pode aparecer no site após ser vendido |
| Datas de leilão para Venda Online | Countdown em JavaScript externo | Campo `dataLeilao1` não disponível para esta modalidade |
| Rate limit Nominatim | 1 req/s máximo | Geocodificação em massa é lenta (~8h para 30k imóveis) |
| Fotos | Padrão fixo `F{hdn}21.jpg` | Algumas fotos podem não existir (404) |
