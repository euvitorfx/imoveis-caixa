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

**Próximas correções pendentes (por ordem de impacto):**
1. `/imoveis/[estado]` e `/imoveis/[estado]/[cidade]` — remover `force-dynamic`, mover paginação `?page=N` para client-side, adicionar `revalidate = 1800`
2. Home `/` — separar shell estático da listagem dinâmica (refactor maior)

**How to apply:** Monitorar dashboard Vercel nos dias seguintes ao deploy. Espera-se redução expressiva do Fluid CPU com a mudança das páginas de imóvel.
