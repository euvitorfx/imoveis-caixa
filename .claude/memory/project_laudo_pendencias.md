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

1. **Interface admin para produzir o laudo** — Tela no painel admin onde o admin clica em um laudo pago, muda status para "em_producao", preenche os 4 blocos (mercado, matrícula, jurídica, viabilidade) com texto, marca cada bloco como concluído e muda para "entregue". Sem isso o laudo não pode ser entregue.

2. **E-mail de entrega ao cliente** — Quando admin marcar como "entregue", disparar e-mail automático com link direto para o laudo. Hoje só existe e-mail de confirmação de pagamento.

3. **Exibição completa do laudo na página do cliente** — `/laudos/[id]` trunca o conteúdo em 200 chars. Quando entregue, mostrar conteúdo completo ou redirecionar direto para o PDF.

## Importante — melhora operação e experiência

4. **E-mail "laudo em produção"** — Quando admin iniciar a produção, enviar e-mail ao cliente: "Começamos a trabalhar no seu laudo. Prazo estimado: X dias úteis."

5. **Prazo estimado visível** — Mostrar "prazo estimado: X dias úteis" na página `/laudos/[id]` logo após o pagamento.

6. **Numeração sequencial corrigida** — Laudo #1 (primeiro comprado) não tem número; laudo #2 tem `numero: '1'`. Campo existe mas não está sendo aplicado consistentemente na criação.

7. **Novo PIX se QR code expirar** — QR PIX do MP expira em 30 minutos. Detectar expiração e gerar novo QR automaticamente no checkout.

## Conversão — aumenta vendas

8. **Preview de laudo exemplo** — Laudo anonimizado de exemplo antes da compra ("Veja como fica"). Aumenta conversão.

9. **Contagem de laudos entregues** — Prova social no popup e checkout: "X laudos entregues".

10. **NPS / depoimento após entrega** — No e-mail de entrega, link para avaliação rápida (1–5 estrelas + comentário). Usar como prova social.

## Arquivos relevantes

- `web/app/admin/AdminLaudos.tsx` — painel admin (onde adicionar interface de produção)
- `web/app/api/laudos/webhook/route.ts` — webhook (onde adicionar e-mail de entrega)
- `web/app/laudos/[id]/page.tsx` — página do cliente (exibição dos blocos)
- `web/app/laudos/[id]/pdf/page.tsx` — PDF do laudo (já existe, funciona)
- `web/app/laudos/checkout/[id]/page.tsx` — checkout (item 7: expiração do PIX)
- `web/lib/laudos.ts` — funções de banco (updateLaudo, getLaudoById)
