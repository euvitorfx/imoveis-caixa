---
name: feedback-callbackurl
description: Sempre passar callbackUrl nos links de login que partem de páginas protegidas
metadata: 
  node_type: memory
  type: feedback
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-13T02:53:56.702Z
---

Todo link `href="/login"` dentro de uma página que exige autenticação deve incluir `?callbackUrl=/caminho/da/pagina`.

**Why:** Sem o callbackUrl, após o login o usuário vai para a home (`/`) em vez de voltar para onde estava. Encontrado em `/ferramentas/viabilidade` — usuário clicou em "Entrar na conta" e após login foi para a home.

**How to apply:** Sempre que criar um bloco de "faça login para continuar" em qualquer página, passar o caminho atual como `callbackUrl`. A página de login já lê esse parâmetro e redireciona corretamente após autenticação.
