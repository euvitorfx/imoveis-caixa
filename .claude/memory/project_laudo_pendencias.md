---
name: laudo-pendencias
description: "Pendências do produto Laudo BLC para resolver após o lançamento (12/nov/2026)"
metadata:
  type: project
---

Produto lançado em 12/nov/2026. Fluxo de compra e pagamento funcionando. Gaps identificados em ordem de prioridade.

**Why:** Produto no ar mas sem interface de produção — cliente pode comprar e o laudo não pode ser entregue sem isso.

**How to apply:** Resolver na ordem abaixo. Iniciar sempre pelo item 1 pois é bloqueante para qualquer entrega real.

## Crítico — produto não funciona sem isso

1. ~~**Interface admin para produzir o laudo**~~ ✅ já existia — tela com 4 blocos, textareas, botão "Marcar como entregue" no `AdminLaudos.tsx`.

2. ~~**E-mail de entrega ao cliente**~~ ✅ resolvido em 12/nov/2026 — `PATCH /api/laudos/[id]` dispara e-mail via Resend ao detectar transição para `status: "entregue"`.

3. ~~**Exibição completa do laudo na página do cliente**~~ ✅ resolvido em 12/nov/2026 — `/laudos/[id]` agora mostra conteúdo completo (`whitespace-pre-wrap`) quando `status === "entregue"`; antes da entrega exibe aviso.

## Importante — melhora operação e experiência

4. ~~**E-mail "laudo em produção"**~~ ✅ resolvido em 12/nov/2026 — dispara ao cliente quando admin muda status para `em_producao`, com prazo de 2 dias úteis.

5. ~~**Prazo estimado visível**~~ ✅ resolvido em 12/nov/2026 — card verde em `/laudos/[id]` quando status é `pago` ou `em_producao`.

6. **Numeração sequencial corrigida** — Fix de dado: laudo #1 (criado antes do contador existir) não tem `numero`. Laudos novos recebem número corretamente. Pendente: migration manual no MongoDB para corrigir laudo antigo sem `numero`.

7. ~~**Novo PIX se QR code expirar**~~ ✅ resolvido em 12/nov/2026 — checkout detecta expiração a cada 30s, exibe botão "Gerar novo QR Code"; backend usa idempotency key com bucket de 1h para permitir renovação sem duplicar cobranças.

## Conversão — aumenta vendas

8. **Preview de laudo exemplo** — Laudo anonimizado de exemplo antes da compra ("Veja como fica"). Aumenta conversão.

9. **Contagem de laudos entregues** — Prova social no popup e checkout: "X laudos entregues".

10. **NPS / depoimento após entrega** — No e-mail de entrega, link para avaliação rápida (1–5 estrelas + comentário). Usar como prova social.

11. **Vídeo motion graphic no popup do Laudo BLC** — Vídeo curto de ~20s ao lado do popup explicando o produto com mockup animado do site. Tentativa anterior não agradou o usuário; recomeçar do zero com nova abordagem visual. Colocar via `<video autoplay muted loop>` no `web/components/LaudoPopup.tsx`, hospedar no R2.

## Arquivos relevantes

- `web/app/admin/AdminLaudos.tsx` — painel admin (onde adicionar interface de produção)
- `web/app/api/laudos/webhook/route.ts` — webhook (onde adicionar e-mail de entrega)
- `web/app/laudos/[id]/page.tsx` — página do cliente (exibição dos blocos)
- `web/app/laudos/[id]/pdf/page.tsx` — PDF do laudo (já existe, funciona)
- `web/app/laudos/checkout/[id]/page.tsx` — checkout (item 7: expiração do PIX)
- `web/lib/laudos.ts` — funções de banco (updateLaudo, getLaudoById)
