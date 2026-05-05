# Busca Leilões Caixa

Site público para busca de imóveis da Caixa Econômica Federal em todo o Brasil — leilões, vendas online e venda direta.

🌐 **[buscaleiloescaixa.com.br](https://www.buscaleiloescaixa.com.br)**

---

## Visão Geral

| | |
|---|---|
| **Imóveis** | ~29.758 ativos em todos os 27 estados |
| **Atualização** | Automática 3x por dia (03h, 10h, 18h BRT) |
| **Enriquecimento** | 6x por dia — CEP, leiloeiro, FGTS, datas de leilão |
| **Geocodificação** | 100% dos imóveis com lat/lng |
| **Acesso** | Gratuito, sem cadastro |

---

## Stack

```
Frontend   →  Next.js 15 (App Router) + TypeScript + Tailwind CSS
Banco      →  MongoDB Atlas M0 (gratuito)
Scraper    →  Python 3 + Playwright (headless Chromium)
Deploy     →  Vercel (frontend) + GitHub Actions (scraper)
Analytics  →  Vercel Analytics + Google Analytics 4 + Meta Pixel
Mapas      →  Leaflet + Nominatim/OpenStreetMap
```

---

## Estrutura do Repositório

```
imoveis-caixa/
├── .github/
│   └── workflows/
│       ├── scraper.yml       # cron 3x/dia — baixa CSV da Caixa
│       └── enrich.yml        # cron 6x/dia — enriquece detalhes
├── scraper/                  # Python — coleta e enriquecimento
│   ├── scraper.py
│   ├── enrich.py
│   ├── mongo.py
│   ├── geocoder.py
│   ├── run.py
│   └── requirements.txt
├── web/                      # Next.js — frontend
│   ├── app/
│   ├── components/
│   └── lib/
├── docs/
│   ├── ARQUITETURA.md
│   ├── API.md
│   ├── SCRAPER.md
│   └── DEPLOY.md
└── README.md
```

---

## Rodando Localmente

### Frontend

```bash
cd web
cp .env.local.example .env.local   # configure as variáveis
npm install
npm run dev
# Acesse http://localhost:3000
```

### Scraper

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
cp .env.example .env   # configure as variáveis
python run.py --headless
```

---

## Documentação Completa

| Documento | Conteúdo |
|---|---|
| [ARQUITETURA.md](docs/ARQUITETURA.md) | Fluxo de dados, diagrama do sistema, decisões técnicas |
| [API.md](docs/API.md) | Todos os endpoints REST com parâmetros e exemplos |
| [SCRAPER.md](docs/SCRAPER.md) | Como o scraper funciona, comandos, manutenção |
| [DEPLOY.md](docs/DEPLOY.md) | Deploy no Vercel, configuração do GitHub Actions |

---

## Variáveis de Ambiente

### Frontend (`web/.env.local`)

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=imoveis_caixa
MONGODB_COLLECTION=imoveis
```

### Scraper (`scraper/.env`)

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=imoveis_caixa
MONGODB_COLLECTION=imoveis
```

### GitHub Actions Secrets

```
MONGODB_URI
MONGODB_DB
MONGODB_COLLECTION
```

---

## Links Úteis

- **Site:** https://www.buscaleiloescaixa.com.br
- **Vercel:** https://imoveis-caixa.vercel.app
- **Caixa (fonte oficial):** https://venda-imoveis.caixa.gov.br
- **Google Search Console:** https://search.google.com/search-console
- **MongoDB Atlas:** https://cloud.mongodb.com
