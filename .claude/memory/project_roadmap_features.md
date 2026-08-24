---
name: roadmap-features-blc
description: "Lista completa de 62 features para implementar no BLC, organizada em 9 categorias, aprovada pelo usuário para consulta em futuras sessões"
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-17T21:50:27.813Z
---

Roadmap completo de features do Busca Leilões Caixa, levantado após análise do concorrente armt.app.

**Artifact permanente:** https://claude.ai/code/artifact/868797d1-33f3-4c33-81c6-b8c32dc8fb44

**Why:** Após análise detalhada do armt.app (concorrente gestor de portfólio), o usuário aprovou a expansão do BLC de buscador especializado Caixa para gestor completo de portfólio, mantendo o Clube BLC (cashback) como diferencial exclusivo.

**How to apply:** Ao iniciar qualquer nova feature, consultar o artifact acima para verificar o escopo exato aprovado e evitar retrabalho. Sempre perguntar qual categoria o usuário quer atacar antes de implementar.

## Resumo das 9 categorias (62 features no total)

- 🧮 **Calculadora & Análise Financeira** (10) — ROI, TIR, CDI, índices, custos detalhados, pré-preenchida com dados Caixa
- 📋 **Portfólio de Imóveis** (8) — Kanban, cadastro manual, métricas, notas, etiquetas
- 🔔 **Alertas & Notificações** (8) — WhatsApp, Google Calendar, lembretes de habilitação, ROI mínimo
- ⚖️ **IA Jurídica & Documentos** (6) — Chat especializado Caixa, análise de edital/matrícula/processo
- 🤝 **Cotização de Sócios** (5) — divisão de custos e lucro entre parceiros
- 🏠 **Pós-Arremate** (7) — pipeline registral, despesas, cashback BLC vinculado ao arremate
- 💰 **Clube BLC** (6) — dashboard cashback, simulador, badge nos imóveis, fluxo de solicitação
- 📈 **Crescimento & Marketing** (6) — referral, blog, comunidade, compartilhamento de análise
- ⚙️ **Plataforma** (6) — gateway de pagamento, notificações in-app, PWA, dark mode e-mail

## Já implementado (não reimplementar)
- Alertas de novos imóveis por e-mail ✓
- Alertas de mudanças em favoritos por e-mail ✓
- Favoritos com badges de novidades e removidos do acervo ✓
- Preferências de região (estado/cidade) com radio buttons ✓
- LGPD one-click unsubscribe nos e-mails ✓
- Login com redirect callbackUrl ✓
- Fotos migradas para R2 ✓

## 10 Exclusivos BLC (★) — não existem em nenhum concorrente
1. Calculadora pré-preenchida com dados da Caixa
2. Chat jurídico treinado nas regras da Caixa
3. Resumo de risco automático dos imóveis Caixa
4. Cashback Clube BLC vinculado ao arremate
5. Dashboard de cashback acumulado
6. Processo de solicitação de cashback
7. Simulador de cashback integrado à calculadora
8. Página do Clube BLC
9. Badge "Clube BLC" nos imóveis elegíveis
10. Comparação "Buscar imóveis similares" na base Caixa
