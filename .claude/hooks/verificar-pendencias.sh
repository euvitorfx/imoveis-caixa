#!/bin/bash
# Roda automaticamente após cada resposta do Claude (hook: Stop)
# Lembra o Claude de atualizar memória e roadmap no MongoDB após alterações de código

# Arquivos do último commit
LAST=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)

# Mudanças em código da app no último commit (excluindo scripts de infra e memória)
LAST_APP=$(echo "$LAST" | grep -E "^web/app/|^web/components/|^web/lib/|^web/emails/" | grep -v "admin/status" | head -5)

# Mudanças não commitadas em código da app
UNSTAGED=$(git diff --name-only 2>/dev/null | grep -E "^web/app/|^web/components/|^web/lib/|^web/emails/" | grep -v "admin/status" | head -5)

# Nada relevante — sai silenciosamente
if [ -z "$LAST_APP" ] && [ -z "$UNSTAGED" ]; then
  exit 0
fi

# Avaliar cada item
if echo "$LAST" | grep -q "\.claude/memory/"; then
  MEMORY_OK="✅"
else
  MEMORY_OK="❌"
fi

if [ -z "$UNSTAGED" ]; then
  COMMIT_OK="✅"
else
  COMMIT_OK="❌"
fi

# Tudo ok — sai silenciosamente
if [ "$MEMORY_OK" = "✅" ] && [ "$COMMIT_OK" = "✅" ]; then
  exit 0
fi

# Exibe o aviso (dirigido ao Claude, não ao usuário)
echo ""
echo "┌──────────────────────────────────────────────────────┐"
echo "│  🤖 CHECKLIST PÓS-IMPLEMENTAÇÃO (para o Claude)     │"
echo "└──────────────────────────────────────────────────────┘"

if [ -n "$LAST_APP" ]; then
  echo "Código alterado no último commit:"
  echo "$LAST_APP" | while read -r f; do [ -n "$f" ] && echo "  · $f"; done
fi

if [ -n "$UNSTAGED" ]; then
  echo "Código alterado sem commit:"
  echo "$UNSTAGED" | while read -r f; do [ -n "$f" ] && echo "  · $f"; done
fi

echo ""
echo "  $COMMIT_OK  Commit + push realizado"
echo "  $MEMORY_OK  Memória (.claude/memory/) atualizada"
echo ""
echo "  📋 Roadmap — executar se features foram entregues:"
echo "     node web/scripts/atualizar-status.mjs feito \"Título do item\""
echo "     node web/scripts/atualizar-status.mjs sprint <num> \"<título>\" \"item1|item2\""
echo "     node web/scripts/atualizar-status.mjs listar   ← ver todos os itens"
echo ""
echo "  ↳ Corrija os itens ❌ antes de prosseguir."
echo ""
