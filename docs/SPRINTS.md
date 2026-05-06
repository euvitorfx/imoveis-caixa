# Sprints — Buscador de Imóveis Caixa

Registro de sprints concluídas e planejadas para o projeto.

---

## ✅ Sprint 1 — Estrutura base + Scraper
- Estrutura do projeto (scraper Python + Next.js 15 + MongoDB Atlas)
- `scraper.py` para todos os 27 estados
- `mongo.py` (conexão e upsert)
- `run.py` principal

## ✅ Sprint 2 — Enriquecimento de dados
- `enrich.py`: geocodificação via Google Maps API
- Campos adicionados: `lat`, `lng`, `bairro`, `cidadeNormalizada`
- Integração com MongoDB Atlas (upsert por `hdnImovel`)

## ✅ Sprint 3 — Site público (MVP)
- Next.js 15 App Router
- Listagem por estado e cidade
- Página de detalhe do imóvel
- Barra de busca e filtros básicos
- Deploy na Vercel: https://imoveis-caixa.vercel.app

## ✅ Sprint 4 — Mapa interativo
- Página `/mapa` com Leaflet.js
- Marcadores por imóvel com popup de preço
- Filtro por estado no mapa

## ✅ Sprint 5 — Favoritos + Exportação PDF
- `BotaoFavorito.tsx` com persistência em localStorage
- Página `/favoritos` com lista de imóveis salvos
- `BotaoPDF.tsx` — exportação via `@react-pdf/renderer`
- Botão favorito inline na página de detalhe (`variant="inline"`)

## ✅ Sprint 6 — Fotos via Cloudinary + PDF com foto
- `scraper/foto_upload.py`: upload on-demand para Cloudinary
- `scraper/migrar_fotos.py`: migração em lote de ~29k imóveis
- `/api/proxy-imagem-b64`: verifica Cloudinary, faz upload se necessário
- PDF agora inclui foto do imóvel (CORS resolvido via Cloudinary CDN)
- `enrich.py` atualizado para migrar foto no enriquecimento

## ✅ Sprint 7 — Analytics + Contadores + Force-dynamic
- Integração com Vercel Analytics REST API
- `/api/analytics`: proxy server-side com cache de 1h
- `ContadorVisitas.tsx`: pageviews sincronizados com Vercel Analytics
- `export const dynamic = "force-dynamic"` nas páginas de listagem
- Dois novos cards na página de Estatísticas (pageviews + visitantes únicos)

---

## 🎨 Sprint 8 — Redesign Visual (planejada)

**Design escolhido:** Navy Bold  
**Arquivo de referência:** `/tmp/mockups-hibridos3.html` (tema A)  
**Status:** Aguardando início — não implementar no site atual sem aprovação

### Sistema de design definido

| Elemento | Valor |
|---|---|
| Background principal | `#060d1f` |
| Background header/hero | `#01112c` |
| Background cards | `#0d1930` |
| Borda header (inferior) | `3px solid #F7A800` |
| Cor de destaque primária | `#F7A800` (ouro Caixa) |
| Cor de destaque secundária | `#ea580c` (laranja) |
| Fonte | Plus Jakarta Sans (400–900) |
| Tipografia headers | Uppercase, weight 900, letter-spacing negativo |

### Componentes a implementar

- [ ] **Carrossel principal** (logo abaixo do menu)
  - Slide 1: Hero atual (título uppercase + stats + botões CTA)
  - Slide 2: "Como funciona — até 50% off"
  - Slide 3: "Salve favoritos e receba alertas"
  - Cada slide é um componente independente — construir e aprovar um a um
  - Testar na branch de preview antes de ir ao ar

- [ ] **Header** — navy com borda dourada de 3px, logo uppercase, nav com underline dourado no hover, botão Favoritos com borda dourada

- [ ] **Barra de busca** — fundo `#071a3e`, inputs com `border-bottom: 2px solid #F7A800`, botão buscar sólido ouro

- [ ] **Cards de imóvel** — fundo `#0d1930`, borda sutil, hover eleva + borda ouro, badge de desconto ouro no canto, badge de modalidade com bordas douradas

- [ ] **Página de detalhe** — revisar para adequar ao novo visual

- [ ] **Página de favoritos** — revisar para adequar ao novo visual

- [ ] **Página de mapa** — revisar header e controles

- [ ] **Página de estatísticas** — revisar cards e cores

- [ ] **Páginas por estado/cidade** — herdam automaticamente via Tailwind (revisar)

### Processo de implementação acordado
1. Criar branch `redesign/navy-bold` no Git
2. Vercel gera preview URL automática para testes
3. Construir e aprovar cada componente individualmente antes do próximo
4. Testar no celular e desktop via preview URL
5. Merge para `main` somente com aprovação total

---

## 📋 Backlog (futuras sprints)

- **Sprint 9 — Alertas por e-mail**: notificar usuários quando imóvel favoritado mudar de preço ou tiver leilão próximo
- **Sprint 10 — Área de membros**: cadastro, login, favoritos em nuvem (sincronizado entre dispositivos)
- **Sprint 11 — Blog/Conteúdo**: artigos sobre como comprar imóveis da Caixa, guias de leilão
- **Sprint 12 — App mobile**: versão PWA ou React Native
- **Sprint 13 — Análise IA por imóvel**: consulta jurídica e fiscal automatizada na página de detalhe

---

## 🤖 Sprint 13 — Análise IA por imóvel (detalhamento)

**Objetivo:** Botão "Analisar com IA" na página de detalhe de cada imóvel. A IA lê os documentos oficiais e retorna um relatório em linguagem simples com pontos de atenção e alertas de risco.

**Status:** Backlog — não iniciar sem conclusão da Sprint 8 (redesign)

### Como vai funcionar

1. O scraper baixa e salva no Cloudinary o edital (PDF) e a matrícula (PDF) de cada imóvel
2. Usuário clica em "Analisar com IA" na página do imóvel
3. Backend chama a API da Anthropic (Claude Haiku) com os documentos + diretrizes configuradas
4. Resultado é salvo no MongoDB (`analiseIA: { resumo, alertas, pontos, dataAnalise }`)
5. Próximas visitas exibem o resultado em cache — API só é chamada uma vez por imóvel

### Fontes de dados e APIs mapeadas

| O que verifica | Fonte / API | Custo estimado |
|---|---|---|
| Processos judiciais do proprietário | **CNJ Datajud** (gratuito) | R$ 0,00 |
| Ônus, penhoras e restrições na matrícula | **Infosimples + ARISP** (SP) / **ONR** (nacional) | R$ 0,08/imóvel |
| Dívidas de IPTU | **Infosimples** (SP e RJ) | R$ 0,00–0,04/imóvel |
| Certidão Negativa Federal (CND) | **Infosimples** | R$ 0,06/imóvel |
| Leitura e resumo do edital e matrícula | **Claude Haiku 4.5** (Anthropic API) | ~R$ 0,005/análise |
| Dívidas de condomínio | ❌ Não automatizável — sem base pública | Manual |
| IPTU fora de SP e RJ | ❌ Sem API disponível | Manual |

**Custo total estimado por imóvel em SP: ~R$ 0,19**
**Para 1.000 análises/mês: ~R$ 190,00**

### O que a IA vai analisar (diretrizes configuráveis)

- Imóvel está ocupado ou desocupado?
- Há dívidas de IPTU declaradas?
- Há dívidas de condomínio declaradas no edital?
- Valor mínimo de lance (1º e 2º leilão)
- Financiamento e FGTS são aceitos?
- Há ônus, penhoras ou hipotecas registradas na matrícula?
- Há ações judiciais ativas envolvendo o proprietário?
- Há restrições ou irregularidades registradas?
- Resumo geral em linguagem simples (acessível para leigos)
- Classificação de risco: 🟢 Baixo / 🟡 Atenção / 🔴 Alto risco

### Componentes a desenvolver

- [ ] `scraper/download_docs.py` — baixar edital e matrícula e salvar no Cloudinary
- [ ] `/api/analise-ia/route.ts` — endpoint que orquestra as consultas e chama o Claude
- [ ] `lib/anthropic.ts` — cliente da API Anthropic com prompt de diretrizes configurável
- [ ] `lib/infosimples.ts` — cliente para IPTU, matrícula e CND
- [ ] `lib/datajud.ts` — cliente CNJ Datajud para processos por CPF
- [ ] `components/BotaoAnaliseIA.tsx` — botão + modal de resultado na página de detalhe
- [ ] `components/RelatorioIA.tsx` — exibição formatada do relatório (alertas, score, itens)
- [ ] MongoDB: campo `analiseIA` no documento do imóvel (cache do resultado)

### Aviso legal a exibir no site

> *"Análise gerada automaticamente com base nos documentos disponibilizados pela Caixa Econômica Federal e fontes públicas. Não substitui assessoria jurídica especializada. Para imóveis acima de R$ 300 mil, recomendamos consultar um advogado."*

### Limitações conhecidas (documentadas desde o planejamento)

- Dívidas de condomínio não têm base pública — sempre informar ao usuário
- IPTU com API disponível apenas para SP e RJ (Infosimples)
- Processos judiciais: CNJ Datajud não retorna processos sigilosos nem em tempo real
- Cruzamento matrícula → CPF do proprietário → processos ainda requer etapa manual ou extração via Claude do PDF da matrícula
