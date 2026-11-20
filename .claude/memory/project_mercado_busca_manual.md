---
name: project_mercado_busca_manual
description: Permissões necessárias e estratégia para busca manual de comparáveis de mercado nos laudos via Claude browser
metadata:
  type: project
---

# Busca manual de comparáveis (Claude browser)

## Estratégia implementada

A busca de comparáveis nos laudos usa dois modos:
1. **Automático (POST `/api/admin/laudos/[id]/mercado`)**: Serper.dev → Google CSE como fallback, 4 queries otimizadas por tipo de imóvel
2. **Manual (PUT `/api/admin/laudos/[id]/mercado`)**: Claude navega portais no built-in browser e submete array de `AnuncioComparavel[]`

## Lógica de busca por tipo

- **Apartamento**: queries priorizam nome do condomínio/empreendimento extraído de `imovelData.empreendimento` / regex em `d.descricao` ou `imovelDescricao` → portais (OLX, ZAP, VivaReal) com nome do condomínio → bairro + características
- **Casa**: queries priorizam rua exata → portais com rua → bairro → região
- **Outros**: lógica genérica (rua → bairro → portais → região)

## Status dos portais no built-in browser (nov/2026)

| Portal | Status | Observação |
|---|---|---|
| **OLX** (olx.com.br) | ✅ Funciona | Melhor para MCMV/Tenda; `navigate` + `get_page_text`; sem login |
| **Imovelweb** (imovelweb.com.br) | ✅ Funciona | `navigate` + `get_page_text`; filtros de URL nem sempre funcionam |
| **VivaReal** (vivareal.com.br) | ✅ Funciona | Funciona mas pode retornar 0 resultados em bairros populares |
| **ZAP Imóveis** (zapimoveis.com.br) | ⚠️ Parcial | `navigate` ok; `javascript_tool` bloqueado; usar `get_page_text` |
| **QuintoAndar** (quintoandar.com.br) | ⚠️ Parcial | Funciona mas filtro de bairro por URL não funciona |
| **Mercado Livre** (mercadolivre.com.br) | ❌ Bloqueado | Redireciona para login; pular |

## Permissões a liberar para sessões futuras

Adicionar ao `settings.json` ou aprovar nos prompts de permissão:

```json
{
  "allowedDomains": [
    "olx.com.br",
    "sp.olx.com.br",
    "imovelweb.com.br",
    "vivareal.com.br",
    "zapimoveis.com.br",
    "quintoandar.com.br"
  ]
}
```

**Claude in Chrome extension (mcp__claude-in-chrome__)**: OLX bloqueado ("Permission denied for this action on this domain"). Usar o built-in browser para todos os portais imobiliários.

## Custo estimado por laudo

| Componente | Custo estimado |
|---|---|
| Serper.dev (4 queries automáticas) | ~$0.002 / laudo |
| Busca manual Claude browser (opcional) | ~$0.15–$0.30 em tokens |
| **Total busca automática** | **~R$ 0,01** |
| **Total busca manual** | **~R$ 1,50 adicional** |

Ambos são irrelevantes em relação ao preço do laudo (R$ 97–R$ 297).

## Teste concluído: Laudo #0004

Empreendimento Hárpia (Tenda), Rua Dom Salomão Ferraz, 4, Vila Andrade, SP:
- Leilão: R$ 120.883 (43m², 2 quartos)
- Comparáveis encontrados no OLX (mesma busca manual):
  1. Ed. Hárpia R$ 350.000 (43m², **mesmo edifício**) — `relevancia: "endereco"`
  2. Residencial Harpa R$ 250.000 (42m², **mesmo edifício**) — `relevancia: "endereco"`
  3. Tenda Sicília R$ 223.035 (44m², Vila Andrade) — `relevancia: "bairro"`
  4. Tenda Santo Amaro R$ 217.137 (42m², Vila Andrade) — `relevancia: "bairro"`
- **Mediana de mercado: R$ 236.518** → leilão = **51% do valor de mercado**

**Why:** Portais premium (ZAP, VivaReal) não têm listagens de MCMV/Tenda; OLX é a melhor fonte para esses imóveis.
**How to apply:** Para laudos de imóveis MCMV/Tenda/CDHU, sempre priorizar OLX na busca manual.
