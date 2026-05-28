# Deploy — Documentação

---

## Visão Geral

O projeto tem dois ambientes de deploy independentes:

| Componente | Plataforma | Trigger |
|---|---|---|
| Frontend (Next.js) | Vercel | Push na branch `main` |
| Scraper (Python) | GitHub Actions | Cron automático + push |

---

## Frontend — Vercel

### Configuração Inicial

1. Acesse [vercel.com](https://vercel.com) e conecte o repositório GitHub
2. Framework: **Next.js** (detectado automaticamente)
3. Root Directory: `web`
4. Build Command: `npm run build` (padrão)

### Variáveis de Ambiente no Vercel

No painel do projeto → **Settings → Environment Variables**:

```
MONGODB_URI        = mongodb://admin:%40Acesso00@ac-jmn2ibr-shard-00-00...  (URI direta, não srv)
MONGODB_DB         = imoveis_caixa
MONGODB_COLLECTION = imoveis
CLOUDINARY_CLOUD_NAME = dhh78ri31
CLOUDINARY_API_KEY    = (ver web/.env.local)
CLOUDINARY_API_SECRET = (ver web/.env.local)
VERCEL_API_TOKEN      = (token da Vercel para analytics)
VERCEL_PROJECT_ID     = prj_XpgXS1P5VDqlC7KkXxK70fwt5Ea0
```

> ⚠️ **Importante:** usar a URI direta (`mongodb://`) e não a SRV (`mongodb+srv://`). A URI SRV com as credenciais antigas causou o site fora do ar em 28/mai/2026.

Marcar como ativas para: **Production** e **Preview**.

### Deploy Automático

Todo push na branch `main` dispara um deploy automático no Vercel. Não é necessária nenhuma ação manual.

### Domínio Personalizado

- **Domínio:** `buscaleiloescaixa.com.br`
- **DNS:** Hostinger → Vercel
- **Configuração no Vercel:** Settings → Domains → Add Domain
- **SSL:** Provisionado automaticamente pelo Vercel (Let's Encrypt)

### Verificar Deploy

```
https://www.buscaleiloescaixa.com.br/api/health
→ { "ok": true }
```

---

## Scraper — GitHub Actions

### Configuração dos Secrets

No repositório GitHub → **Settings → Secrets and variables → Actions**:

```
MONGODB_URI           = mongodb://admin:%40Acesso00@...  (mesma URI do Vercel)
MONGODB_DB            = imoveis_caixa
MONGODB_COLLECTION    = imoveis
CLOUDINARY_CLOUD_NAME = dhh78ri31
CLOUDINARY_API_KEY    = (ver scraper/.env)
CLOUDINARY_API_SECRET = (ver scraper/.env)
```

> ⚠️ **Atenção:** o `enrich.yml` **exige** os secrets do Cloudinary. Sem eles o workflow falha na importação do `foto_upload.py` antes de executar qualquer linha — erro `KeyError: CLOUDINARY_CLOUD_NAME`. Isso causou 23 dias de falha silenciosa (05/mai a 28/mai/2026).

### Workflows

#### scraper.yml — Coleta de Dados

```
Arquivo: .github/workflows/scraper.yml
Cron:    03:00, 10:00, 18:00 BRT (06:00, 13:00, 21:00 UTC)
Timeout: 60 minutos
Runner:  ubuntu-22.04
```

**O que faz:**
1. Instala Python 3.11 + dependências
2. Instala Playwright + Chromium
3. Executa `python run.py --headless --sem-detalhes`
4. Baixa CSV de todos os 27 estados
5. Faz upsert no MongoDB
6. Marca inativos os imóveis removidos da Caixa

#### enrich.yml — Enriquecimento

```
Arquivo: .github/workflows/enrich.yml
Cron:    6x por dia (00h, 04h, 08h, 12h, 16h, 20h BRT)
Limite:  700 imóveis por execução (~4.200/dia)
Runner:  ubuntu-22.04
```

**O que faz:**
1. Busca imóveis sem enriquecimento (`enriched != true`)
2. Visita a página de detalhe de cada um na Caixa
3. Extrai CEP, leiloeiro, FGTS, ocupação, datas de leilão
4. Detecta e desativa imóveis removidos da Caixa
5. Faz upload da foto para o Cloudinary (se ainda apontar para caixa.gov.br)
6. Salva campos extras no MongoDB

### Ativar os Workflows

Workflows com `schedule` só são ativados automaticamente após o **primeiro trigger manual**:

1. No GitHub: **Actions → scraper.yml → Run workflow**
2. Aguardar completar
3. A partir daí o cron dispara automaticamente

### Monitorar Execuções

GitHub → **Actions** → selecionar o workflow → ver logs de cada execução.

**Sinal de sucesso no log:**
```
✓ SP: 8420 imóveis | +12 novos | ~45 atualizados | 3 marcados inativos | 47s
✓ RJ: 3210 imóveis | +5 novos | ~18 atualizados | 1 marcados inativos | 38s
...
RESUMO FINAL
  Imóveis processados : 29758
  Inseridos (novos)   : 47
  Atualizados         : 312
```

**Sinal de falha com retry:**
```
⚠ PE: download falhou, nova tentativa em 10s...
✓ PE: 1575 imóveis | +0 novos | ~8 atualizados | 0 marcados inativos | 52s
```

---

## MongoDB Atlas

### Configuração do Cluster

- **Tier:** M0 (gratuito, 512MB)
- **Cluster:** `imoveis-caixa.98n0hxa.mongodb.net`
- **DB:** `imoveis_caixa`
- **Collections:** `imoveis`, `_meta`

### Acesso de Rede

No Atlas → **Network Access**: adicionar `0.0.0.0/0` (allow from anywhere) para que o Vercel e GitHub Actions consigam conectar de IPs variáveis.

### String de Conexão

```
mongodb+srv://USUARIO:SENHA@imoveis-caixa.98n0hxa.mongodb.net/
```

---

## Procedimento de Atualização

### Deploy apenas do frontend

```bash
cd web
# faça as alterações
git add .
git commit -m "feat: descrição da mudança"
git push origin main
# Vercel faz deploy automático em ~1 minuto
```

### Deploy do scraper

```bash
# alterações em scraper/
git add scraper/
git commit -m "fix: descrição da correção"
git push origin main
# GitHub Actions usa o novo código na próxima execução automática
# Para testar imediatamente: Actions → Run workflow manualmente
```

### Atualizar token do GitHub (quando expirar)

```bash
# Gerar novo token em github.com → Settings → Developer settings → Personal access tokens
# Escopos necessários: repo, workflow

git remote set-url origin https://SEU_TOKEN@github.com/euvitorfx/imoveis-caixa.git
git push origin main
```

---

## Troubleshooting

### Site não atualiza após push

1. Verificar se o deploy foi disparado no painel Vercel
2. Checar se há erros de build em **Deployments → último deploy → Build Logs**
3. Erro comum: variável de ambiente ausente → adicionar em Settings → Environment Variables

### Scraper ou Enrich falhou no GitHub Actions

1. Actions → workflow → execução com ❌ → ver logs completos
2. Erros comuns:
   - `MONGODB_URI not set` → verificar secrets
   - `KeyError: CLOUDINARY_CLOUD_NAME` → secrets do Cloudinary ausentes no GitHub Actions (ver seção Configuração dos Secrets)
   - `bad auth: authentication failed` → MONGODB_URI com senha errada — atualizar secret no GitHub e env var no Vercel
   - `Timeout downloading CSV` → site da Caixa instável, retry automático deve resolver
   - `playwright: browser not found` → passo de instalação falhou, rerun the workflow

### Imóvel aparece no site mas foi vendido

O imóvel provavelmente ainda está no CSV da Caixa. Para forçar verificação:

```bash
cd scraper
python enrich.py --reprocessar --estado XX --headless
```

Substitua `XX` pelo estado do imóvel. O enrich visitará todas as páginas de detalhe e desativará os imóveis removidos.

### Contador de visitas zerou

O contador diário reseta à meia-noite em UTC-3 (horário de Brasília). Se o campo `diario.data` no documento `_meta.visitas` for diferente da data atual, o contador exibe 0 — comportamento esperado.
