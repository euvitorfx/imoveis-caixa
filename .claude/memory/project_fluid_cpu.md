---
name: project-fluid-cpu
description: Vercel Fluid Active CPU — picos em ago/2026; 3 rodadas de investigação e correção
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-09-02T00:00:00.000Z
---

## O que conta como Fluid Active CPU (diagnóstico correto)

Vercel Fluid CPU = tempo que o Node.js passa **executando JavaScript ativamente**.
- NÃO conta: espera por MongoDB (I/O assíncrono), espera por rede
- CONTA: renderização React Server Components (JSX→HTML), serialização, cálculos síncronos

A solução correta é **Full Route Cache (ISR/revalidate)**: resposta HTML armazenada no CDN do Vercel.
Requests subsequentes à mesma URL são servidos do CDN — ZERO invocação de função serverless.

`unstable_cache` (adicionado na Rodada 2) NÃO resolve o problema porque:
- Economiza tempo de I/O MongoDB (que não conta)
- O React Server Component ainda renderiza em todo request (que conta)

## Rodada 1 — 19/08/2026
**Causas e correções:**
- `sitemap.ts`: revalidate 3600 → 86400 (carregava 25k docs por hora)
- `/admin/status`: polling 30s → 120s + pause quando aba oculta

## Rodada 2 — 31/08/2026 (diagnóstico incorreto)
**Tentou**: `unstable_cache` para queries MongoDB nas páginas de estado/cidade/home + otimização `/api/visita`.
**Resultado**: sem melhoria visível (conforme confirmado pelo usuário).
**Por quê falhou**: MongoDB I/O não conta como Fluid CPU; a renderização React ainda ocorria em todo request.

## Rodada 3 — 02/09/2026 (diagnóstico correto)
**Causa raiz identificada**: Páginas de imóvel `/imovel/[id]` sem `revalidate` + lendo `searchParams` (tornando-as dinâmicas). Com ~30k imóveis crawleados pelo Google, cada URL é renderizada em todo request: 4 queries MongoDB + renderização React completa.

**Correção aplicada (commit f46c192)**:
- `export const revalidate = 3600` em `/imovel/[id]/page.tsx`
- `searchParams` removido do Server Component (o link `?volta=` movido para `VoltaLink.tsx` client-side)
- Resultado esperado: ~30k páginas de imóvel servidas do CDN; apenas o primeiro request por URL por hora invoca função serverless

**Fix 2 aplicado (commit ad866af — 02/09/2026):**
- `/imoveis/[estado]` e `/imoveis/[estado]/[cidade]`: `searchParams` removido → ISR habilitado com `revalidate = 1800`
- Novo componente `ListagemPaginada.tsx`: página 1 via initialData (ISR), páginas 2+ via fetch para `/api/imoveis/listagem`
- Nova API route `/api/imoveis/listagem` com `revalidate = 1800`
- Bug corrigido em `Paginacao.tsx`: caminho hardcoded `/?` → `usePathname()`

**Fix 3 aplicado (commit 69ece47 — 03/09/2026):**
- Home `/`: removido `force-dynamic`; adicionado `revalidate = 300`
- Novo componente `ListagemHome.tsx`: sem filtros → initialData (ISR), filtros ativos → fetch para `/api/imoveis/busca`
- Nova API route `/api/imoveis/busca` com todos os filtros da home
- `totalBusca` em HeroCarousel era passado mas nunca usado — simplificado

**Páginas cobertas por ISR após as 3 rodadas:**
- `/imovel/[id]` — revalidate 3600 (~30k páginas)
- `/imoveis/[estado]` — revalidate 1800 (27 páginas)
- `/imoveis/[estado]/[cidade]` — revalidate 1800 (centenas de páginas)
- `/` (home) — revalidate 300 (página mais visitada)

**Próximas correções:**
- Nenhuma identificada ainda. Monitorar Vercel após deploy.

**How to apply:** Monitorar dashboard Vercel nos dias seguintes ao deploy. Espera-se redução expressiva do Fluid CPU com as mudanças das páginas de imóvel + estado + cidade.
