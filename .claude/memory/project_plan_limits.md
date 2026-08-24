---
name: project-plan-limits
description: Limites do plano gratuito vs premium para favoritos e planilhas
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-13T02:53:52.418Z
---

Limites atuais do plano gratuito (definidos nas API routes):

- **Favoritos**: 10 imóveis (`web/app/api/favoritos/route.ts` — `LIMITE_GRATUITO = 10`)
- **Planilhas de viabilidade**: 1 análise (`web/app/api/analises/route.ts` — `LIMITE_GRATUITO = 1`)
- **Premium**: sem limites em ambos

**Why:** Plano gratuito deve ser funcional mas incentivar upgrade. 1 planilha foi escolhido para dar uma amostra sem liberar uso irrestrito.

**How to apply:** Ao implementar novas features com limite, seguir o mesmo padrão: constante `LIMITE_GRATUITO` no topo da route, verificar `session.user.plano`, retornar erro 403 com mensagem de upgrade.
