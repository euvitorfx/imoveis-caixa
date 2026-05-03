# Guia do Administrador — Buscador de Imóveis Caixa

Referência rápida para as principais tarefas de administração do sistema.

---

## Índice
1. [Verificar se o site está no ar](#1-verificar-se-o-site-está-no-ar)
2. [Fazer deploy de uma atualização](#2-fazer-deploy-de-uma-atualização)
3. [Rodar o scraper manualmente](#3-rodar-o-scraper-manualmente)
4. [Rodar a geocodificação em massa](#4-rodar-a-geocodificação-em-massa)
5. [Ver logs do scraper automático](#5-ver-logs-do-scraper-automático)
6. [Verificar o banco de dados](#6-verificar-o-banco-de-dados)
7. [Renovar o token do GitHub](#7-renovar-o-token-do-github)
8. [Atualizar variáveis de ambiente](#8-atualizar-variáveis-de-ambiente)
9. [Verificar erros no Vercel](#9-verificar-erros-no-vercel)
10. [Pausar ou desativar o scraper automático](#10-pausar-ou-desativar-o-scraper-automático)

---

## 1. Verificar se o site está no ar

**Onde:** Navegador  
**URL:** https://imoveis-caixa.vercel.app

Para diagnóstico técnico (conexão com banco, total de imóveis):
```
https://imoveis-caixa.vercel.app/api/health
```
Retorna JSON com status do MongoDB e total de imóveis. Se aparecer `"ok": true`, tudo funcionando.

---

## 2. Fazer deploy de uma atualização

Toda vez que você fizer `git push`, o Vercel detecta automaticamente e faz o deploy em ~1 minuto.

**Onde:** Terminal do Mac  
**Pasta:** `/Users/macbookpro/Documents/Desenvolvimento Code/imoveis-caixa`

```bash
cd "/Users/macbookpro/Documents/Desenvolvimento Code/imoveis-caixa"

# Verificar o que mudou
git status

# Adicionar e commitar
git add -A
git commit -m "descrição do que foi alterado"

# Enviar para o GitHub (Vercel faz deploy automaticamente)
git push origin main
```

**Se aparecer erro de autenticação no push** (token expirado):
1. Acesse: https://github.com/settings/tokens
2. Clique em **Generate new token (classic)**
3. Escopos necessários: `repo` + `workflow`
4. Copie o token gerado e rode:
```bash
git remote set-url origin https://SEU_TOKEN@github.com/euvitorfx/imoveis-caixa.git
git push origin main
```

**Acompanhar o deploy:**  
Site: https://vercel.com/euvitorfx/imoveis-caixa → aba **Deployments**

---

## 3. Rodar o scraper manualmente

Use quando quiser forçar uma atualização imediata dos imóveis sem esperar o cron automático.

**Onde:** Terminal do Mac  
**Pasta:** `/Users/macbookpro/Documents/Desenvolvimento Code/imoveis-caixa/scraper`

```bash
cd "/Users/macbookpro/Documents/Desenvolvimento Code/imoveis-caixa/scraper"

# Atualizar todos os 27 estados (demora ~10-20 min)
python3 run.py --headless

# Atualizar só um ou mais estados específicos (mais rápido)
python3 run.py --headless --estados RN SP MG

# Sem geocodificar após o scrape (mais rápido ainda)
python3 run.py --headless --sem-geocode
```

> **Obs:** O scraper também roda automaticamente 3x por dia via GitHub Actions:
> 03h, 10h e 18h (horário de Brasília). Só use o manual se precisar forçar agora.

---

## 4. Rodar a geocodificação em massa

Use para geocodificar imóveis que ainda não têm coordenadas (necessário para aparecerem no mapa).

**Onde:** Terminal do Mac  
**Pasta:** `/Users/macbookpro/Documents/Desenvolvimento Code/imoveis-caixa/scraper`

```bash
cd "/Users/macbookpro/Documents/Desenvolvimento Code/imoveis-caixa/scraper"

# Ver quantos faltam sem rodar nada
python3 geocode_run.py --dry-run

# Rodar (pode pausar com Ctrl+C e retomar depois — continua de onde parou)
python3 geocode_run.py

# Só estados específicos
python3 geocode_run.py --estados RN SP

# Reprocessar imóveis que falharam antes (lat=null)
python3 geocode_run.py --retry-falhas
```

> **Atenção:** A geocodificação é lenta (~1 imóvel/segundo) por respeitar o limite
> gratuito do Nominatim. Para ~29.000 imóveis leva cerca de 9 horas. Deixe o Terminal
> aberto e o Mac plugado na tomada. Pode pausar a qualquer momento com **Ctrl+C**.

---

## 5. Ver logs do scraper automático

O scraper roda automaticamente no GitHub Actions 3x por dia. Para ver se rodou com sucesso:

**Onde:** GitHub  
**URL:** https://github.com/euvitorfx/imoveis-caixa/actions

- Clique no workflow mais recente **"Scraper Caixa Imóveis"**
- Clique em **scrape** para ver o log completo
- Verde ✅ = sucesso | Vermelho ❌ = falhou

**Se falhou:** clique no job com erro para ver a mensagem. Causas comuns:
- Token/senha do MongoDB expirou → atualizar Secret no GitHub
- Site da Caixa fora do ar → aguardar e o próximo cron tentará novamente

---

## 6. Verificar o banco de dados

**Onde:** MongoDB Atlas (navegador)  
**URL:** https://cloud.mongodb.com

1. Faça login → clique no cluster **imoveis-caixa**
2. Clique em **Browse Collections**
3. Banco: `imoveis_caixa` | Collection: `imoveis`

**Consultas úteis no Atlas (aba Filter):**
```json
// Total de imóveis ativos
{ "ativo": true }

// Imóveis sem coordenadas (não aparecem no mapa)
{ "ativo": true, "lat": { "$exists": false } }

// Imóveis de um estado específico
{ "estado": "RN", "ativo": true }

// Imóveis com desconto acima de 30%
{ "ativo": true, "$expr": { "$gte": [{ "$subtract": [1, { "$divide": ["$preco", "$precoAval"] }] }, 0.3] } }
```

**Ver última atualização do scraper:**  
Collection `_meta` → documento com `key: "lastSync"`

**Ver contadores de visitas:**  
Collection `_meta` → documento com `key: "visitas"`

---

## 7. Renovar o token do GitHub

Os tokens expiram. Quando o `git push` der erro de autenticação:

**Onde:** GitHub  
**URL:** https://github.com/settings/tokens

1. Clique em **Generate new token (classic)**
2. Defina um nome (ex: "imoveis-caixa deploy")
3. Expiração: recomendo **90 dias** ou **No expiration**
4. Escopos: marque `repo` (todos) + `workflow`
5. Clique **Generate token** e copie imediatamente (só aparece uma vez)

**No Terminal:**
```bash
cd "/Users/macbookpro/Documents/Desenvolvimento Code/imoveis-caixa"
git remote set-url origin https://SEU_TOKEN@github.com/euvitorfx/imoveis-caixa.git
git push origin main
```

**Se também precisar atualizar os Secrets do GitHub Actions** (para o scraper automático):  
URL: https://github.com/euvitorfx/imoveis-caixa/settings/secrets/actions  
Secrets necessários: `MONGODB_URI`, `MONGODB_DB`, `MONGODB_COLLECTION`

---

## 8. Atualizar variáveis de ambiente

### No Vercel (frontend)
**Onde:** https://vercel.com/euvitorfx/imoveis-caixa/settings/environment-variables

Variáveis necessárias:
| Nome | Descrição |
|------|-----------|
| `MONGODB_URI` | URI de conexão do MongoDB Atlas |
| `MONGODB_DB` | Nome do banco (`imoveis_caixa`) |
| `MONGODB_COLLECTION` | Nome da collection (`imoveis`) |

Após alterar: vá em **Deployments** → clique nos 3 pontinhos do último deploy → **Redeploy**.

### No GitHub Actions (scraper)
**Onde:** https://github.com/euvitorfx/imoveis-caixa/settings/secrets/actions

Mesmas 3 variáveis acima. Altere e o próximo cron já usará os novos valores.

### No scraper local
**Arquivo:** `/Users/macbookpro/Documents/Desenvolvimento Code/imoveis-caixa/scraper/.env`  
Edite com VS Code ou qualquer editor de texto.

---

## 9. Verificar erros no Vercel

**Onde:** https://vercel.com/euvitorfx/imoveis-caixa

- **Aba Deployments:** histórico de deploys, status e logs de build
- **Aba Functions:** logs em tempo real das rotas de API (`/api/imoveis`, `/api/visita`, etc.)
- **Aba Analytics:** visitas, performance, Core Web Vitals

Se uma página der erro 500, vá em **Functions** e procure o log da rota correspondente.

---

## 10. Pausar ou desativar o scraper automático

### Pausar temporariamente
**Onde:** https://github.com/euvitorfx/imoveis-caixa/actions  
Clique no workflow **"Scraper Caixa Imóveis"** → botão **"..."** no canto superior direito → **Disable workflow**

Para reativar: mesmo caminho → **Enable workflow**

### Alterar horários do cron
**Arquivo:** `.github/workflows/scraper.yml`  
Horários atuais (UTC → BRT = UTC-3):
```yaml
- cron: "0 6 * * *"    # 03:00 BRT
- cron: "0 13 * * *"   # 10:00 BRT
- cron: "0 21 * * *"   # 18:00 BRT
```
Edite, faça commit e push. Conversor de horários: https://crontab.guru

---

## Referências rápidas

| O que | Onde |
|-------|------|
| Site ao vivo | https://imoveis-caixa.vercel.app |
| Diagnóstico | https://imoveis-caixa.vercel.app/api/health |
| Repositório | https://github.com/euvitorfx/imoveis-caixa |
| Logs Actions | https://github.com/euvitorfx/imoveis-caixa/actions |
| Deploy Vercel | https://vercel.com/euvitorfx/imoveis-caixa |
| Banco MongoDB | https://cloud.mongodb.com |
| Tokens GitHub | https://github.com/settings/tokens |
| Secrets Actions | https://github.com/euvitorfx/imoveis-caixa/settings/secrets/actions |
| Env Vars Vercel | https://vercel.com/euvitorfx/imoveis-caixa/settings/environment-variables |
