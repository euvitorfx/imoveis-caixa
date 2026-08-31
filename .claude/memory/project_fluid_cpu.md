---
name: project-fluid-cpu
description: Vercel Fluid Active CPU — picos em ago/2026; correções aplicadas em duas rodadas; verificar resultado em set/2026
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-31T00:00:00.000Z
---

## Histórico de investigações e correções

### Rodada 1 — 19/08/2026
**Sintoma:** alerta de 100% do Fluid Active CPU (4h/mês, plano free) com apenas 6 visitas/dia.

**Causas identificadas:**
1. `sitemap.ts` — revalidate=3600, carregava 25k+ docs + 27 queries `distinct` a cada hora. Crawlers Google regeneravam ~24×/dia.
2. `/admin/status` polling — 30s de intervalo enquanto aba aberta.

**Correções aplicadas:**
- `sitemap.ts`: revalidate 3600 → 86400
- `/admin/status`: polling 30s → 120s + pause quando aba oculta

---

### Rodada 2 — 31/08/2026
**Sintoma:** uso dobrou a partir de 11/08/2026 (visto em screenshot do Vercel) apesar das correções anteriores.

**Investigação:** identificadas páginas force-dynamic de alto tráfego rodando queries MongoDB a cada request:
- Home `/` — force-dynamic, 2 MongoDB queries (find + count) em todo request
- `/imoveis/[estado]` — force-dynamic, 4 queries paralelas por request (crawlers Google em 27 estados)
- `/imoveis/[estado]/[cidade]` — force-dynamic, 3 queries + distinct por request (centenas de cidades)
- `/api/visita POST` — chamado em todo page load; sempre fazia `findOne` no _meta + `updateOne` + `auth()` + `users.updateOne`

**Correções aplicadas (commit 233aec9):**
- `unstable_cache` (1800s) em `getData()` nas páginas `/imoveis/[estado]` e `/imoveis/[estado]/[cidade]`
- `unstable_cache` (300s) em `queryImoveis()` e (3600s) em `getTotalImoveis()` na home
- `/api/visita POST`: fast path para `novaSessao=false` (maioria dos requests) — elimina `findOne`, faz apenas um `$inc` atômico; rastreamento do usuário logado é fire-and-forget

**Por que `unstable_cache` funciona mesmo com force-dynamic:** o Next.js Data Cache é independente do Full Route Cache. Mesmo com a página re-renderizando por request (devido a `searchParams`), o resultado da função MongoDB é servido do cache por 30 min na maioria dos hits.

**How to apply:** Monitorar dashboard Vercel em set/2026. Se ainda alto, próximo passo é verificar se há outros endpoints frequentes sem cache.
