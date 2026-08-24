---
name: project-r2-migration
description: "Migração de fotos para Cloudflare R2 — 27 jobs disparados, verificar conclusão e testar PDF"
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-11T22:34:51.083Z
---

27 jobs de migração de fotos foram disparados em paralelo no GitHub Actions em 2026-08-11.

**Why:** Cloudinary estava com conta desabilitada (401). Migração para R2 gratuito (10GB, egress grátis).

**Estado da migração quando disparada:**
- 32.856 imóveis com fotoUrl apontando para caixa.gov.br
- 0 fotos no R2 ainda
- Jobs por estado (os maiores: RJ 8.161, GO 4.268, SP 2.867)

**Como verificar:**
```python
# cd scraper && python check_fotos2.py
# Deve mostrar Total com URL R2: ~24k
```

**Após confirmar conclusão:**
1. Verificar PDF de um imóvel na produção — foto deve aparecer
2. Se algum estado falhou, re-rodar individualmente via GitHub Actions → Migração de Fotos → Run workflow → colocar o estado

**Acompanhar:** https://github.com/euvitorfx/imoveis-caixa/actions

**How to apply:** Sempre que o usuário mencionar "foto", "PDF sem foto" ou "migração", verificar se os jobs concluíram.
