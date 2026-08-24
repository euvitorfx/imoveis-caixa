---
name: project-email-darkmode
description: E-mail de boas-vindas com bug de cores no Gmail dark mode — pendente de investigação
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-13T21:01:48.833Z
---

Template de boas-vindas (`web/emails/boasVindas.ts`) funciona corretamente em light mode mas exibe cores distorcidas no Gmail mobile em dark mode.

**Why:** Gmail mobile dark mode ignora `bgcolor`, `background-color` inline e `@media (prefers-color-scheme: dark)` — aplica sua própria paleta escura que distorce o amber (#F59E0B) e o navy (#01304D).

**Tentativas já feitas (sem sucesso):**
- `bgcolor` HTML attribute + `background-color` CSS inline
- `data-ogsc` / `data-ogsb` selectors
- `<meta name="color-scheme" content="light">` e `"light dark"`
- Dark mode nativo com `@media (prefers-color-scheme: dark)`

**How to apply:** Ao retomar, investigar:
1. Usar imagens (PNG/GIF 1px) para barras de cor críticas — imagens não são alteradas pelo Gmail
2. Testar com Litmus ou Email on Acid para diagnóstico visual cross-client
3. Avaliar se o template atual (dark mode nativo) já é aceitável para uso em produção
