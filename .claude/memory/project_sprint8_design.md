---
name: project-sprint8-design
description: Design final escolhido para Sprint 8 — Petróleo & Âmbar (#0C4A6E + #F59E0B)
metadata: 
  node_type: memory
  type: project
  originSessionId: cbcc678a-f982-49a7-a6f3-07e3d61818a6
  modified: 2026-08-10T15:31:14.729Z
---

Design final escolhido para a Sprint 8: **Petróleo & Âmbar** (opção A da segunda rodada de seleção).

**Why:** Usuário rejeitou Escuro & Coral e Branco Nítido. Uma segunda rodada com 4 novas opções foi apresentada, e o usuário escolheu A — Petróleo & Âmbar.

**How to apply:** Usar esta paleta ao implementar qualquer mudança visual. Branch `redesign/petroleo-ambar` contém a implementação completa. Não propor outras direções sem solicitação.

## Sistema de cores

| Token | Valor | Uso |
|---|---|---|
| Header / Hero bg | `#0C4A6E` | Petróleo escuro |
| Acento âmbar | `#F59E0B` | Borda header, CTA no hero, badges de desconto |
| Acento âmbar hover | `#D97706` | Hover states |
| Links / Labels / CTAs em fundo claro | `#0C4A6E` | Petróleo usado como accent no body |
| Texto no hero | `#FFFFFF` | Branco sobre petróleo |
| Texto dark (CTA âmbar) | `#1C1917` | Contraste sobre âmbar |
| Background body/cards | `#F8FAFC` | Cinza clarinho frio |

## Estrutura visual

- **Header**: fundo `#0C4A6E`, borda inferior `3px solid #F59E0B`, nav texto branco 75%, coração favoritos âmbar
- **Hero**: fundo `#0C4A6E`, eyebrow âmbar, h1 branco com span âmbar, stats brancos, CTA primário âmbar com texto escuro, CTA secundário outline branco
- **Body**: background `#F8FAFC`, cards brancos, badges desconto âmbar com texto escuro, badge modalidade petróleo
- **Filtros**: label e botão Buscar petróleo `#0C4A6E`, focus ring petróleo
- **Footer**: bg `#F8FAFC`, borda topo âmbar, link email petróleo

## Histórico de decisão

1. **Navy Bold** — rejeitado na sessão anterior
2. **Escuro & Coral** (`#1a1a2e` + `#E83A3A`) — implementado, depois rejeitado
3. **Branco Nítido** (`#FFFFFF` + `#4338CA`) — implementado, depois rejeitado
4. Segunda rodada (4 novas opções em 10/08/2026):
   - A — Petróleo & Âmbar `#0C4A6E + #F59E0B` → **ESCOLHIDO**
   - B — Floresta & Ouro `#14532D + #CA8A04`
   - C — Carvão & Ciano `#18181B + #06B6D4`
   - D — Mel & Pedra `#FFFBEB + #B45309`
