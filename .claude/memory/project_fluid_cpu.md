---
name: project-fluid-cpu
description: Vercel Fluid Active CPU atingiu 100% do free tier (4h); correção de polling aplicada em ago/2026; verificar resultado em set/2026
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-19T11:59:48.794Z
---

Em agosto/2026 o Vercel enviou alerta de 100% do Fluid Active CPU (4h/mês, plano free).

**Investigação em 19/08/2026:** Com apenas 6 visitas no dia e uso já em ~5 min, confirmou-se que o problema NÃO é tráfego de usuários. Causa real identificada:

1. **Sitemap (principal culpado):** `sitemap.ts` com `revalidate=3600` carregava 25k+ documentos + 27 queries `distinct` a cada hora. Google crawlea o sitemap múltiplas vezes/dia → ~24 regenerações/dia × ~10s CPU = ~4 minutos/dia só do sitemap.

2. **Status page polling (secundário):** 30s de intervalo enquanto aba aberta. Contribuição real menor do que estimado inicialmente.

3. **Crons no `vercel.json`:** `alertas-novos` e `alertas-mudancas` rodam no Vercel Fluid, mas são quase 100% I/O bound (MongoDB + Resend) — contribuição de CPU ativa estimada em <5s/execução. Não vale migrar agora.

**Correções aplicadas:**
- `sitemap.ts`: revalidate 3600 → 86400 (1h → 24h) — maior impacto, ~4 min/dia a menos
- `/admin/status`: polling 30s → 120s + pause quando aba em segundo plano

**How to apply:** Monitorar dashboard Vercel (vercel.com/dashboard/usage) por 3–5 dias após 19/08/2026. Espera-se redução de ~80% no consumo. Se ainda alto, próximo passo é ISR nas páginas `/imoveis/[estado]` e `/imoveis/[estado]/[cidade]` (atualmente force-dynamic, alto tráfego de crawlers).
