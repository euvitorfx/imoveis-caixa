---
name: project-enrichment-matricula
description: Re-enriquecimento de matrículas concluído — 9.855 imóveis com matriculaUrl (39%)
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-12T11:44:27.000Z
---

Re-enriquecimento das propriedades com `enriched: true` mas sem `matriculaUrl` foi concluído para todos os 27 estados.

**Why:** O workflow completo sem filtro dava timeout em 6h. Solução: rodar por estado em paralelo.

**Status final (2026-08-12):**
- Todos os 27 estados: ✅ concluídos
- Com `matriculaUrl`: 9.855 (39.0%) — eram 6.978 (28.4%) antes
- Enriquecido sem PDF: 10.719 (42.4%)
- Não enriquecido ainda: 4.720 (18.7%) — workflow diário em andamento

**Fotos (2026-08-12):**
- URL ainda no caixa.gov.br: 837 (3.4%) — imóveis sem foto válida na Caixa
- Migradas para R2: ~24.457

**Bug corrigido (commit 76ccee4):**
O `enrich.py` sobrescrevia URLs R2 já migradas com URLs novas da Caixa vindas do scraper.
Fix: usa `update.get("fotoUrl")` antes de `doc.get("fotoUrl")` no check de migração.

**How to apply:** Atividade concluída. O workflow diário (`enrich.yml`) está processando os 4.720 restantes sem enriquecimento (~700/rodada). Não precisa de ação manual.
