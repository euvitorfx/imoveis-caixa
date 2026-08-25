---
name: project-afiliados
description: Sistema de referral/afiliados implementado; influencers ganham % da comissão BLC
metadata:
  type: project
---

Sistema de afiliados implementado na Sprint 14 (commit 7921b8e).

**Modelo de dados:**
- `afiliados` collection: `{ nome, email, codigo, percentualComissao, ativo, userId?, criadoEm }`
- `comissoes_afiliados` collection: `{ afiliadoId, processoId, userId, valorComissaoBLC, valorAfiliado, percentual, status, criadoEm, pagoEm? }`
- User document ganha: `{ afiliadoRefId?, codigoAfiliadoRef? }` ao se cadastrar via ?ref=
- User document ganha: `{ isAfiliado: true, afiliadoId }` quando admin cria afiliado vinculado

**Fluxo:**
1. Influencer divulga `/?ref=CODIGO`
2. Middleware captura `?ref=` e seta cookie `blc_ref` (1 ano, httpOnly)
3. Register lê cookie e salva referência no user
4. Admin cadastra afiliado em `/admin` → aba "Afiliados" com form e tabela de comissões
5. Quando processo vai a "concluido" com `valorComissaoBLC`, comissão é criada automaticamente
6. Influencer vê dashboard em `/perfil` (visible quando `user.isAfiliado = true`)

**LGPD:** lista de indicados mostra apenas iniciais, data de cadastro e se tem processo ativo.

**Pagamentos:** manuais — admin marca "Pago" no painel.

**Arquivos principais:**
- `web/lib/afiliados.ts` — tipos e helpers MongoDB
- `web/app/admin/AdminAfiliados.tsx` — UI admin
- `web/app/perfil/AfiliadoDashboard.tsx` — dashboard do influencer
- `web/app/api/admin/afiliados/` — endpoints admin
- `web/app/api/perfil/afiliado/route.ts` — endpoint do influencer

**Why:** influencers parceiros divulgam o BLC e ganham comissão sobre o cashback do processo.
**How to apply:** ao tocar em processos, lembrar de incluir `valorComissaoBLC` no PUT para acionar comissão.
