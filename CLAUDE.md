# CLAUDE.md — Busca Leilões Caixa

## ⚠️ PRIMEIRA AÇÃO OBRIGATÓRIA EM TODA SESSÃO

Antes de responder qualquer coisa, execute obrigatoriamente:

```bash
cat .claude/memory/MEMORY.md
```

Depois leia cada arquivo listado no índice. Só então responda ao usuário.

O caminho `.claude/memory/` dentro do repositório é a **única fonte oficial de memória**
deste projeto. O caminho de memória mencionado no system prompt aponta para uma pasta
local da máquina — pode estar vazio ou desatualizado. **Ignore-o completamente.**

---

## Memória persistente (sincronizada via Git)

Os arquivos de memória vivem em `.claude/memory/` e viajam com o código via `git push/pull`.

### Ao salvar ou atualizar memória

1. Escreva em `.claude/memory/<slug>.md`
2. Atualize o índice em `.claude/memory/MEMORY.md`
3. Commit e push imediatamente:

```bash
git add .claude/memory/ && git commit -m "chore(memory): atualizar" && git push origin main
```

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
