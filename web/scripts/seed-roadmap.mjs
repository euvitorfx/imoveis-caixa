/**
 * Popula as coleções `sprints` e `roadmap_items` no MongoDB com os dados
 * atuais da página /admin/status. Seguro para re-executar (upsert por título).
 *
 * Uso: node web/scripts/seed-roadmap.mjs
 * Executar da raiz do projeto.
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(filePath) {
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // usa env vars existentes
  }
}

loadEnv(resolve("web/.env.local"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

if (!MONGODB_URI || !MONGODB_DB) {
  console.error("❌ MONGODB_URI e MONGODB_DB são obrigatórios no .env.local");
  process.exit(1);
}

// ── Dados das sprints ──────────────────────────────────────────────────────
const SPRINTS = [
  { num: "1", title: "SEO Técnico + Analytics", items: ["Google Analytics 4", "Meta Pixel", "Vercel Analytics"] },
  { num: "2", title: "Páginas SEO por Estado/Cidade", items: ["/imoveis/[estado]", "/imoveis/[estado]/[cidade]", "Bandeiras dos estados"] },
  { num: "3", title: "SEO Avançado + /novidades", items: ["JSON-LD", "FAQ Schema", "Sitemap dinâmico"] },
  { num: "4", title: "Favoritos + Filtros Avançados", items: ["Favoritos por usuário", "Filtros área/vagas/FGTS", "Ordenação"] },
  { num: "5", title: "Blog + Painel Admin", items: ["Blog MongoDB", "Sync YouTube", "Admin posts"] },
  { num: "6", title: "Corretores", items: ["/corretores", "Bloco no imóvel", "Admin corretores"] },
  { num: "7", title: "Enriquecimento Incremental", items: ["enrich.py", "GitHub Actions", "Matrícula + PDF", "9.855 matrículas"] },
  { num: "8", title: "Redesign Visual — Petróleo & Âmbar", items: ["Nova paleta #01304D", "Header + footer", "Cards + filtros", "Carousel hero"] },
  { num: "9", title: "Auth + Usuários + Mobile", items: ["Cadastro / login", "Plano freemium", "Google OAuth", "Admin usuários", "Menu mobile", "Phone mask + flag"] },
  { num: "10", title: "Clube BLC (base) + IA + R2", items: ["Página /clube", "Descrições IA (Haiku)", "Export PDF + auth gate", "Fotos → R2 (24k+)", "Popup de cadastro", "Admin social/copy IA"] },
  { num: "11", title: "Planilha de Análise de Viabilidade", items: ["Calculadora online completa", "Import de favoritos", "Export XLS", "Salvar/editar análises", "Botão no detalhe do imóvel", "API CRUD (GET/POST/PUT/DELETE)", "Gráfico ROI (Recharts)"] },
  { num: "12", title: "Qualidade, Métricas & Backup", items: ["Telefone obrigatório no cadastro", "Modal para usuários sem telefone", "Métricas financeiras no /estatísticas", "Toggle 7/15/30 dias movimentações", "Bug fix: dataInativacao scraper", "Backup semanal MongoDB → R2", "GitHub Action Backup (domingos 04h BRT)"] },
  { num: "13", title: "Portal do Corretor + Processos BLC", items: ["Vincular conta usuário ↔ corretor (CRM)", "ClubeBLCCard no /perfil do corretor", "AbrirProcessoBtn na página do imóvel", "Sistema de Processos BLC completo", "Admin: aba Processos BLC + formulário", "Autocomplete usuário/corretor/imóvel", "Admin: aba Cobertura + resumo RESUMO/BASE", "cidades_caixa persistente (1.481 cidades)", "Lista IBGE completa (5.571 cidades) no CRM", "Validação de duplicidade de cidades", "Filtros avançados no CRM", "Numeração + reordenação de abas admin"] },
];

// ── Dados do roadmap ───────────────────────────────────────────────────────
const ROADMAP_THEMES = [
  {
    theme: "E-mails & Comunicação", color: "#F59E0B", themeOrder: 0,
    items: [
      { title: "Recuperação de Senha", priority: "Alta", desc: "Fluxo completo de esqueci minha senha: token com expiração gravado no MongoDB, e-mail com link, rota /recuperar-senha para redefinir.", chips: ["Resend", "Token MongoDB", "Rota /recuperar-senha"], dep: "" },
      { title: "Alertas de Novos Imóveis", priority: "Alta", desc: "GitHub Action diária consulta novos imóveis por estado/cidade e envia e-mail para usuários com preferências cadastradas.", chips: ["Resend", "GitHub Action diária", "Preferências por região", "Unsubscribe"], dep: "Seleção de regiões no cadastro (pré-requisito)" },
      { title: "E-mails do Clube BLC — Processos", priority: "Média", desc: "Notificações automáticas por e-mail para comprador e assessor em todos os eventos do ciclo de vida dos Processos BLC.", chips: ["Resend", "Comprador + assessor", "Todos os status"], dep: "Processos BLC implementados ✓ — falta apenas o disparo de e-mail" },
      { title: "Resumo Semanal do Acervo", priority: "Média", desc: "E-mail opcional todo domingo com novos, removidos e destaque da semana nos estados favoritos do usuário.", chips: ["Resend", "GitHub Action domingo", "Opt-in no perfil"], dep: "Depende de Alertas de Novos Imóveis estar pronto" },
      { title: "Métricas de Abertura dos E-mails", priority: "Média", desc: "Salvar ID do Resend após cada envio. Configurar webhook para eventos email.opened, email.clicked e email.bounced.", chips: ["Resend webhook", "MongoDB", "Admin dashboard", "email.opened / .clicked"], dep: "IDs de e-mail já são gerados pelo Resend — falta apenas salvar e ouvir os eventos" },
      { title: "Fix: Cores do E-mail em Dark Mode", priority: "Pendente", desc: "Gmail mobile dark mode distorce as cores do template. Investigar imagens PNG para áreas críticas ou testar com Litmus / Email on Acid.", chips: ["Gmail dark mode", "Litmus / Email on Acid"], dep: "Boas-vindas funciona em light mode ✓" },
      { title: "E-mail de Upgrade Premium", priority: "Baixa", desc: "Confirmação automática quando pagamento for aprovado pelo webhook do Stripe / Mercado Pago.", chips: ["Resend", "Webhook pagamento"], dep: "Depende: Sprint 14 (Pagamento Premium)" },
    ],
  },
  {
    theme: "Clube BLC — Monetização", color: "#7C3AED", themeOrder: 1,
    items: [
      { title: 'Formulário "Nova Compra" — Processos BLC', priority: "Feito", desc: "AbrirProcessoBtn na página do imóvel + formulário completo no /perfil do comprador.", chips: ["AbrirProcessoBtn", "API + MongoDB", "Admin + comprador"], dep: "✓ Em produção (Sprint 13)" },
      { title: "Dashboard de Compra + Checklist", priority: "Feito", desc: "Aba 'Clube BLC' no /perfil do comprador lista todos os processos com status, imóvel, assessor e datas.", chips: ["Área logada /perfil", "Admin painel", "Status por etapa"], dep: "✓ Em produção (Sprint 13)" },
      { title: "Gestão de Assessores Parceiros", priority: "Feito", desc: "CRM de parceiros no admin com filtros avançados, numeração, vincular conta usuário ↔ corretor.", chips: ["CRM admin", "Portal corretor", "5.571 cidades IBGE", "Cobertura"], dep: "✓ Em produção (Sprint 13)" },
      { title: "Lógica de Cashback", priority: "Clube", desc: "Calcular e registrar cashback do usuário (0,5% → 1% conforme histórico). Visualização no perfil e admin.", chips: ["Escalonamento", "Histórico"], dep: "" },
      { title: "Pagamento — Plano Premium", priority: "Clube", desc: "Checkout de assinatura para acesso premium via Stripe ou Mercado Pago.", chips: ["Stripe / MP", "Webhook"], dep: "" },
    ],
  },
  {
    theme: "Calculadora & Análise Financeira", color: "#2563EB", themeOrder: 2,
    items: [
      { title: "Calculadora de ROI / TIR / Lucro Líquido", priority: "Alta", desc: "Embutida na página de cada imóvel. Pré-preenchida com lance mínimo e dados do imóvel Caixa.", chips: ["Pré-preenchida c/ dados Caixa", "React state", "API Banco Central (CDI)"], dep: "" },
      { title: "Lance Máximo por Meta de ROI", priority: "Alta", desc: "Usuário define ROI mínimo desejado (ex: 30%) e a calculadora retorna automaticamente o lance máximo.", chips: ["Cálculo inverso", "Integrado à calculadora"], dep: "Depende: Calculadora de ROI" },
      { title: "Comparação com Índices de Mercado", priority: "Alta", desc: "Mostra se o ROI do leilão bate CDI, IPCA, Ibovespa e IFIX no mesmo prazo e capital.", chips: ["CDI", "IPCA", "Ibovespa", "IFIX", "API BC gratuita"], dep: "Depende: Calculadora de ROI" },
      { title: "Salvar Cálculo Vinculado ao Imóvel", priority: "Média", desc: "Usuário salva os parâmetros da calculadora junto ao imóvel favorito. Persistência no MongoDB.", chips: ["MongoDB", "Favoritos"], dep: "Depende: Calculadora de ROI + Favoritos" },
    ],
  },
  {
    theme: "Alertas & Notificações", color: "#EA580C", themeOrder: 3,
    items: [
      { title: "Botão 'Adicionar ao Google Calendar'", priority: "Alta", desc: "Gera arquivo .ics com datas de 1ª e 2ª praça e prazo de habilitação diretamente na página do imóvel.", chips: [".ics download", "Dados já no scraper", "Implementação simples"], dep: "" },
      { title: "Lembrete de Prazo de Habilitação", priority: "Alta", desc: "Alertar 24h e 1h antes do prazo de habilitação dos imóveis salvos. Via e-mail (e futuramente WhatsApp).", chips: ["E-mail + WhatsApp", "Imóveis salvos"], dep: "" },
      { title: "Alertas por WhatsApp", priority: "Alta", desc: "Novos imóveis e mudanças em favoritos via WhatsApp. Taxa de abertura ~98% vs 22% do e-mail. Feature Premium.", chips: ["Twilio / Z-API", "Feature Premium", "98% abertura"], dep: "Depende: Gateway de Pagamento Premium" },
      { title: "Alerta por ROI Mínimo", priority: "Média", desc: "Usuário define critério avançado: receber alertas somente de imóveis com desconto acima de X% ou estimativa de ROI acima de Y%.", chips: ["Filtro avançado", "Calculadora integrada"], dep: "Depende: Calculadora de ROI" },
      { title: "Opt-out Granular de Alertas", priority: "Média", desc: "Controles separados por tipo e canal: 'novos imóveis' e 'mudanças em favoritos', independentemente para e-mail e WhatsApp.", chips: ["Toggle por tipo", "Toggle por canal", "Perfil"], dep: "" },
    ],
  },
  {
    theme: "Portfólio de Imóveis", color: "#4F46E5", themeOrder: 4,
    items: [
      { title: "Kanban de Acompanhamento", priority: "Média", desc: "Pipeline visual: Interesse → Em análise → Lance confirmado → Arrematado → Vendido. Drag and drop entre estágios.", chips: ["Caixa + outros leiloeiros", "Drag and drop", "MongoDB"], dep: "" },
      { title: "Cadastro Manual de Imóvel Externo", priority: "Média", desc: "Adicionar imóvel de qualquer leiloeiro (Megaleilões, Sodré Santoro, etc.) preenchendo os dados manualmente.", chips: ["Qualquer leiloeiro", "Formulário manual", "MongoDB"], dep: "" },
      { title: "Dashboard de Métricas do Portfólio", priority: "Média", desc: "Painel com totais: valor arrematado, valor vendido, lucro realizado, imóveis em pipeline, ROI médio realizado.", chips: ["MongoDB Aggregation", "Área logada"], dep: "Depende: Kanban + Status por Imóvel" },
      { title: "Notas e Etiquetas por Imóvel", priority: "Média", desc: "Campo de texto livre por imóvel para observações pessoais. Tags personalizadas pelo usuário.", chips: ["Campo de notas", "Tags customizadas", "MongoDB"], dep: "" },
    ],
  },
  {
    theme: "IA Jurídica & Documentos", color: "#7E22CE", themeOrder: 5,
    items: [
      { title: "Chat Jurídico Especializado em Caixa", priority: "Média", desc: "Chatbot com IA treinado nas regras da Caixa: sub-rogação de IPTU, uso do FGTS, habilitação, desocupação, modalidades.", chips: ["Claude API", "System prompt Caixa", "BLC exclusivo"], dep: "" },
      { title: "Análise de Edital com IA (Upload PDF)", priority: "Média", desc: "Upload do edital em PDF. IA identifica: sub-rogação de débitos, restrições ao FGTS, datas críticas. Score de risco 0–100.", chips: ["Claude API", "PDF parsing", "Score 0-100"], dep: "" },
      { title: "Análise de Matrícula com IA", priority: "Média", desc: "Upload da certidão de matrícula. IA identifica penhoras, ônus reais, hipotecas e riscos de sub-rogação.", chips: ["Claude API", "PDF parsing"], dep: "" },
      { title: "Resumo de Risco Automático dos Imóveis Caixa", priority: "Baixa", desc: "Para imóveis Caixa já no banco, gerar automaticamente um resumo de risco a partir dos dados existentes.", chips: ["Dados do scraper", "Claude API", "BLC exclusivo"], dep: "Depende: Dados ricos do scraper" },
    ],
  },
  {
    theme: "Cotização de Sócios", color: "#0891B2", themeOrder: 6,
    items: [
      { title: "Cadastro de Sócios por Imóvel", priority: "Média", desc: "Adicionar múltiplos sócios em um arremate com percentual de participação de cada um.", chips: ["Multi-sócio", "% participação", "MongoDB"], dep: "Depende: Portfólio / Status por Imóvel" },
      { title: "Simulação de Divisão de Lucro", priority: "Média", desc: "3 critérios de divisão: igualitário, proporcional ao investido, ou reembolso das despesas primeiro.", chips: ["3 critérios", "Simulação em tempo real"], dep: "Depende: Cadastro de Sócios" },
      { title: "Convite de Sócio por E-mail", priority: "Baixa", desc: "Sócio recebe convite por e-mail e pode visualizar os dados do imóvel e a calculadora com sua participação calculada.", chips: ["Resend", "Link com token"], dep: "Depende: Cadastro de Sócios + Calculadora" },
    ],
  },
  {
    theme: "Pós-Arremate", color: "#78716C", themeOrder: 7,
    items: [
      { title: "Pipeline Pós-Arremate Visual", priority: "Baixa", desc: "Fluxo visual: Arrematado → Regularização → Registro → Desocupação → Reforma → À venda → Vendido.", chips: ["Kanban", "Etapas com datas", "MongoDB"], dep: "Depende: Portfólio Kanban" },
      { title: "Registro de Despesas Reais", priority: "Baixa", desc: "Lançar despesas reais ocorridas após o arremate. Atualiza o lucro realizado vs. o estimado na calculadora.", chips: ["CRUD despesas", "Lucro realizado", "MongoDB"], dep: "Depende: Pipeline Pós-Arremate" },
      { title: "Cashback Clube BLC Vinculado ao Arremate", priority: "Clube", desc: "Ao marcar imóvel Caixa como 'Arrematado via BLC', o sistema calcula e registra o cashback automaticamente.", chips: ["BLC exclusivo", "Integração Clube", "MongoDB"], dep: "Depende: Lógica de Cashback do Clube BLC" },
    ],
  },
  {
    theme: "Crescimento & Marketing", color: "#DB2777", themeOrder: 8,
    items: [
      { title: "Blog de Conteúdo Especializado em Caixa", priority: "Média", desc: "Artigos sobre como arrematar na Caixa, FGTS, sub-rogação, habilitação, IR. Blog do concorrente (armt.app) está vazio — janela de SEO aberta.", chips: ["SEO orgânico", "Blog MongoDB (já existe)", "Nicho Caixa"], dep: "" },
      { title: "Programa de Indicação (Referral)", priority: "Média", desc: "Link único por usuário. Indicar amigo que se cadastrar gera benefício para ambos.", chips: ["Link único", "Benefício mútuo", "MongoDB"], dep: "Depende: Gateway de Pagamento Premium" },
      { title: "Link Público de Análise Compartilhável", priority: "Baixa", desc: "Gerar link para compartilhar a análise de um imóvel sem precisar de login. Snapshot dos dados e da calculadora.", chips: ["Token de acesso", "Snapshot MongoDB", "Sem login"], dep: "Depende: Calculadora de ROI" },
      { title: "Comunidade / Fórum de Arrematantes", priority: "Baixa", desc: "Fórum com categorias específicas para Caixa. Considerar Discord/WhatsApp Group como MVP.", chips: ["Network effect", "Discord como MVP", "Moderação"], dep: "Requer base de usuários ativa" },
    ],
  },
  {
    theme: "Plataforma & Experiência", color: "#0D9488", themeOrder: 9,
    items: [
      { title: "Feature Gating Gratuito vs Premium", priority: "Média", desc: "Campo 'plano' existe no DB mas sem bloqueio de conteúdo na UI. Locks + CTA de upgrade onde aplicável.", chips: ["Feature gating", "CTA upgrade"], dep: "" },
      { title: "Notificações In-App", priority: "Média", desc: "Sino de notificações dentro do site exibindo novidades em favoritos, lembretes de leilão e alertas do sistema.", chips: ["Badge contador", "Painel de notificações", "MongoDB"], dep: "" },
      { title: "Seleção de Regiões no Cadastro", priority: "Média", desc: "Adicionar seleção de estados/cidades preferidos no fluxo de cadastro, não apenas no perfil.", chips: ["UX melhoria", "/cadastro"], dep: "" },
      { title: "PWA — Instalável no Celular", priority: "Baixa", desc: "Tornar o BLC instalável como Progressive Web App: ícone na tela inicial, funcionamento offline parcial, notificações push.", chips: ["manifest.json", "Service Worker", "Push notifications"], dep: "" },
    ],
  },
  {
    theme: "Admin & Infraestrutura", color: "#475569", themeOrder: 10,
    items: [
      { title: "Monitorar Fluid Active CPU (Vercel)", priority: "Pendente", desc: "Em ago/2026 o plano free atingiu 100% do limite (4h/mês). Correções aplicadas em 18–19/08/2026: sitemap 1h→24h + polling 30s→120s. Monitorar até set/2026.", chips: ["Sitemap 1h→24h", "Polling 30s→120s", "Monitorar até set/2026"], dep: "Correções aplicadas — aguardando confirmação" },
      { title: "Roadmap dinâmico via MongoDB + Admin UI", priority: "Feito", desc: "Roadmap e sprints migrados para MongoDB. Interface no admin para marcar itens como concluídos sem precisar editar código.", chips: ["MongoDB", "Admin UI", "Sem deploy para atualizar"], dep: "✓ Em produção" },
    ],
  },
  {
    theme: "Melhorias Recentes", color: "#059669", themeOrder: 11,
    items: [
      { title: "Admin: Atividade por Usuário", priority: "Feito", desc: "Tabela de usuários exibe: favoritos salvos, planilhas criadas, último acesso, total de sessões e total de páginas visitadas.", chips: ["Admin", "MongoDB", "Métricas"], dep: "✓ Em produção" },
      { title: "Limites Freemium Ajustados", priority: "Feito", desc: "Plano gratuito: 1 planilha de viabilidade e 10 favoritos. Premium: ilimitado. Lógica aplicada na API com mensagem de upgrade.", chips: ["Freemium", "API"], dep: "✓ Em produção" },
      { title: "Fix: callbackUrl no Login", priority: "Feito", desc: "Links 'Entrar na conta' em páginas protegidas agora passam o callbackUrl correto — usuário retorna à página de origem após login.", chips: ["UX", "NextAuth"], dep: "✓ Em produção" },
      { title: "Telefone Obrigatório + Modal Cadastro Incompleto", priority: "Feito", desc: "Cadastro agora exige WhatsApp/telefone. Usuários sem telefone veem modal ao tentar favoritar, salvar planilha ou exportar PDF.", chips: ["Auth", "UX", "ModalCompletarCadastro"], dep: "✓ Em produção" },
      { title: "Estatísticas: Métricas Financeiras do Acervo", priority: "Feito", desc: "Página /estatísticas ganhou valor total do acervo ativo (~R$ 3,6 bi) e saídas de valor por 7/15/30 dias.", chips: ["Estatísticas", "MongoDB Aggregation", "ISR 1h"], dep: "✓ Em produção" },
      { title: "Fix Scraper: dataInativacao para Saídas Precisas", priority: "Feito", desc: "marcar_inativos agora filtra ativo:true e grava dataInativacao apenas na primeira transição ativo→inativo.", chips: ["Scraper", "Bug fix", "MongoDB Index"], dep: "✓ Em produção" },
      { title: "Backup Semanal MongoDB → Cloudflare R2", priority: "Feito", desc: "GitHub Action exporta users, analises_viabilidade e imoveis em JSONL gzip toda domingo às 04h BRT. Retenção 8 semanas.", chips: ["GitHub Actions", "R2", "JSONL gzip"], dep: "✓ Em produção" },
      { title: "Popup de Boas-Vindas para Usuários Logados", priority: "Feito", desc: "Popup exibido uma única vez para usuários logados mostrando recursos ativos e em breve. Persistência via MongoDB.", chips: ["MongoDB", "JWT Session", "Layout global"], dep: "✓ Em produção" },
      { title: "Planilha de Viabilidade — Upgrade Gráficos", priority: "Feito", desc: "Donut de composição de custos, breakeven, comparativo de mercado CDI/IPCA/Ibovespa/IFIX, gráfico ROI médio por mês.", chips: ["Recharts", "SVG donut", "Breakeven"], dep: "✓ Em produção" },
    ],
  },
  {
    theme: "Dados — Automático", color: "#10B981", themeOrder: 12,
    items: [
      { title: "Imóveis sem Enriquecimento", priority: "Auto", desc: "~4.720 imóveis ainda não enriquecidos. Workflow processa automaticamente ~700/dia — sem ação manual.", chips: ["GitHub Actions", "~7 dias restantes"], dep: "✓ Processando automaticamente" },
    ],
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────
const client = new MongoClient(MONGODB_URI);

try {
  await client.connect();
  const db = client.db(MONGODB_DB);

  // ── Sprints ──────────────────────────────────────────────────────────────
  console.log("⏳ Inserindo sprints...");
  let sprintCount = 0;
  for (const sprint of SPRINTS) {
    const order = parseInt(sprint.num, 10);
    await db.collection("sprints").updateOne(
      { num: sprint.num },
      { $setOnInsert: { ...sprint, order, createdAt: new Date() } },
      { upsert: true }
    );
    sprintCount++;
  }
  console.log(`✅ ${sprintCount} sprints inseridas (upsert)`);

  // ── Roadmap items ────────────────────────────────────────────────────────
  console.log("⏳ Inserindo itens do roadmap...");
  let itemCount = 0;
  for (const themeData of ROADMAP_THEMES) {
    const { theme, color, themeOrder, items } = themeData;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.collection("roadmap_items").updateOne(
        { title: item.title, theme },
        {
          $setOnInsert: {
            theme,
            themeColor: color,
            themeOrder,
            order: i,
            originalPriority: item.priority,
            updatedAt: new Date(),
            createdAt: new Date(),
          },
          $set: {
            desc: item.desc,
            chips: item.chips,
            dep: item.dep,
            priority: item.priority,
          },
        },
        { upsert: true }
      );
      itemCount++;
    }
  }
  console.log(`✅ ${itemCount} itens do roadmap inseridos (upsert)`);

  // ── Índices ──────────────────────────────────────────────────────────────
  await db.collection("roadmap_items").createIndex({ theme: 1, order: 1 });
  await db.collection("roadmap_items").createIndex({ themeOrder: 1, order: 1 });
  await db.collection("sprints").createIndex({ order: 1 });
  console.log("✅ Índices criados");

  console.log("\n🎉 Seed concluído com sucesso!");
} finally {
  await client.close();
}
