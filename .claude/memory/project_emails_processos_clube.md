---
name: project-emails-processos-clube
description: Implementar rotinas de e-mail para todas as atualizações dos processos do Clube BLC
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-19T01:29:55.745Z
---

Implementar sistema completo de notificações por e-mail para o Clube BLC, cobrindo todos os eventos do ciclo de vida de um processo.

**Why:** Corretores e compradores precisam ser notificados automaticamente de cada etapa — hoje o acompanhamento é apenas visual no painel, sem comunicação proativa.

**How to apply:** Criar um módulo de e-mails semelhante ao de alertas de imóveis favoritos. Disparar via API route ou job após cada mutação em `processos_clube`. Considerar o template de e-mail já existente no projeto (com dark mode bug pendente).

## Eventos a cobrir

### Para o comprador
- Processo aberto (confirmação do registro)
- Mudança de status (ex: "Em análise" → "Em andamento")
- Solicitação de documentos ou informações adicionais pelo assessor
- Conclusão do processo
- Cancelamento

### Para o corretor/assessor parceiro
- Novo processo vinculado ao seu CRECI (abertura pelo comprador ou pelo admin)
- Lembrete se processo ficar sem atualização por X dias
- Conclusão do processo

### Para o admin (opcional)
- Novo processo aberto no sistema
- Processo parado sem atualização há muito tempo

## Referências técnicas
- Reutilizar o mesmo sistema de e-mail dos alertas de imóveis favoritos (mesma lib, mesmo template)
- Possivelmente usar um endereço remetente diferente para os e-mails do Clube BLC (a definir)
- [[project-email-darkmode]] — bug de dark mode no Gmail mobile ainda pendente de solução
