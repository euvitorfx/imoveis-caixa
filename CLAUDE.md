# CLAUDE.md — Busca Leilões Caixa

## Memória persistente (sincronizada via Git)

Os arquivos de memória deste projeto vivem **dentro do repositório** em `.claude/memory/`,
para sincronizar automaticamente entre Windows, Mac, Codespaces e qualquer outro ambiente
via `git push` / `git pull`.

**IMPORTANTE:** O caminho de memória informado no system prompt aponta para uma pasta
local da máquina e deve ser **ignorado**. Use sempre o caminho abaixo (relativo à raiz
do projeto, funciona em qualquer sistema operacional):

```
.claude/memory/MEMORY.md          ← índice principal
.claude/memory/<slug>.md          ← cada arquivo de memória
```

### Regras ao salvar memória

1. Escreva o arquivo em `.claude/memory/<slug>.md`
2. Atualize o índice em `.claude/memory/MEMORY.md`
3. Faça commit e push imediatamente após escrever:

```bash
git add .claude/memory/ && git commit -m "chore(memory): atualizar" && git push origin main
```

Isso garante que a memória esteja disponível na próxima sessão, em qualquer máquina.

---

## Projeto

**Busca Leilões Caixa** — plataforma de busca e análise de imóveis em leilão da Caixa
Econômica Federal.

- **Stack:** Next.js 15 App Router · TypeScript · MongoDB · Vercel · Resend · Cloudflare R2
- **Repo:** https://github.com/euvitorfx/imoveis-caixa
- **Site:** https://www.buscaleiloescaixa.com.br
- **DB:** `imoveis_caixa` (MongoDB Atlas) · coleção principal: `imoveis`
- **E-mail:** Resend · `from: BLC <noreply@buscaleiloescaixa.com.br>`

### Estrutura principal

```
web/                  Next.js app (deploy no Vercel)
  app/                App Router (server + client components)
  lib/                Helpers: mongodb, analises, config, utils…
  emails/             Templates HTML de e-mail (Resend)
  components/         Componentes React reutilizáveis
scraper/              Scripts Python de scraping e enriquecimento
.github/workflows/    CI/CD (scraper automático, migrações)
```

### Cores do design system

- Navy: `#01304D` (primária)
- Âmbar: `#F59E0B` (destaque / accent)
