"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface WorkflowRun {
  id: number;
  name: string;
  workflow_id: number;
  path: string;
  head_branch: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | "timed_out" | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  event: string;
}

interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: "BUILDING" | "ERROR" | "READY" | "CANCELED" | "QUEUED" | "INITIALIZING";
  createdAt: number;
  creator?: { username?: string };
  meta?: {
    githubCommitMessage?: string;
    githubCommitRef?: string;
    githubCommitSha?: string;
  };
}

interface StatusData {
  workflows: WorkflowRun[];
  deployments: Deployment[];
}

type Tab = "panorama" | "live" | "sprints" | "roadmap";
type RoadmapFilter = "Pendentes" | "Alta" | "Média" | "Baixa" | "Feito";

// ── Static data ────────────────────────────────────────────────────────────
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

const ROADMAP = [
  {
    theme: "E-mails & Comunicação",
    color: "#F59E0B",
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
    theme: "Clube BLC — Monetização",
    color: "#7C3AED",
    items: [
      { title: 'Formulário "Nova Compra" — Processos BLC', priority: "Feito", desc: "AbrirProcessoBtn na página do imóvel + formulário completo no /perfil do comprador.", chips: ["AbrirProcessoBtn", "API + MongoDB", "Admin + comprador"], dep: "✓ Em produção (Sprint 13)" },
      { title: "Dashboard de Compra + Checklist", priority: "Feito", desc: "Aba 'Clube BLC' no /perfil do comprador lista todos os processos com status, imóvel, assessor e datas.", chips: ["Área logada /perfil", "Admin painel", "Status por etapa"], dep: "✓ Em produção (Sprint 13)" },
      { title: "Gestão de Assessores Parceiros", priority: "Feito", desc: "CRM de parceiros no admin com filtros avançados, numeração, vincular conta usuário ↔ corretor. Portal do Corretor (/perfil) com ClubeBLCCard.", chips: ["CRM admin", "Portal corretor", "5.571 cidades IBGE", "Cobertura"], dep: "✓ Em produção (Sprint 13)" },
      { title: "Lógica de Cashback", priority: "Clube", desc: "Calcular e registrar cashback do usuário (0,5% → 1% conforme histórico). Visualização no perfil e admin.", chips: ["Escalonamento", "Histórico"], dep: "" },
      { title: "Pagamento — Plano Premium", priority: "Clube", desc: "Checkout de assinatura para acesso premium via Stripe ou Mercado Pago.", chips: ["Stripe / MP", "Webhook"], dep: "" },
    ],
  },
  {
    theme: "Calculadora & Análise Financeira",
    color: "#2563EB",
    items: [
      { title: "Calculadora de ROI / TIR / Lucro Líquido", priority: "Alta", desc: "Embutida na página de cada imóvel. Pré-preenchida com lance mínimo e dados do imóvel Caixa.", chips: ["Pré-preenchida c/ dados Caixa", "React state", "API Banco Central (CDI)"], dep: "" },
      { title: "Lance Máximo por Meta de ROI", priority: "Alta", desc: "Usuário define ROI mínimo desejado (ex: 30%) e a calculadora retorna automaticamente o lance máximo.", chips: ["Cálculo inverso", "Integrado à calculadora"], dep: "Depende: Calculadora de ROI" },
      { title: "Comparação com Índices de Mercado", priority: "Alta", desc: "Mostra se o ROI do leilão bate CDI, IPCA, Ibovespa e IFIX no mesmo prazo e capital.", chips: ["CDI", "IPCA", "Ibovespa", "IFIX", "API BC gratuita"], dep: "Depende: Calculadora de ROI" },
      { title: "Salvar Cálculo Vinculado ao Imóvel", priority: "Média", desc: "Usuário salva os parâmetros da calculadora junto ao imóvel favorito. Persistência no MongoDB.", chips: ["MongoDB", "Favoritos"], dep: "Depende: Calculadora de ROI + Favoritos" },
    ],
  },
  {
    theme: "Alertas & Notificações",
    color: "#EA580C",
    items: [
      { title: "Botão 'Adicionar ao Google Calendar'", priority: "Alta", desc: "Gera arquivo .ics com datas de 1ª e 2ª praça e prazo de habilitação diretamente na página do imóvel.", chips: [".ics download", "Dados já no scraper", "Implementação simples"], dep: "" },
      { title: "Lembrete de Prazo de Habilitação", priority: "Alta", desc: "Alertar 24h e 1h antes do prazo de habilitação dos imóveis salvos. Via e-mail (e futuramente WhatsApp).", chips: ["E-mail + WhatsApp", "Imóveis salvos"], dep: "Depende: Alertas por WhatsApp (para canal WA)" },
      { title: "Alertas por WhatsApp", priority: "Alta", desc: "Novos imóveis e mudanças em favoritos via WhatsApp. Taxa de abertura ~98% vs 22% do e-mail. Feature Premium.", chips: ["Twilio / Z-API", "Feature Premium", "98% abertura"], dep: "Depende: Gateway de Pagamento Premium" },
      { title: "Alerta por ROI Mínimo", priority: "Média", desc: "Usuário define critério avançado: receber alertas somente de imóveis com desconto acima de X% ou estimativa de ROI acima de Y%.", chips: ["Filtro avançado", "Calculadora integrada"], dep: "Depende: Calculadora de ROI" },
      { title: "Opt-out Granular de Alertas", priority: "Média", desc: "Controles separados por tipo e canal: 'novos imóveis' e 'mudanças em favoritos', independentemente para e-mail e WhatsApp.", chips: ["Toggle por tipo", "Toggle por canal", "Perfil"], dep: "" },
    ],
  },
  {
    theme: "Portfólio de Imóveis",
    color: "#4F46E5",
    items: [
      { title: "Kanban de Acompanhamento", priority: "Média", desc: "Pipeline visual: Interesse → Em análise → Lance confirmado → Arrematado → Vendido. Drag and drop entre estágios.", chips: ["Caixa + outros leiloeiros", "Drag and drop", "MongoDB"], dep: "" },
      { title: "Cadastro Manual de Imóvel Externo", priority: "Média", desc: "Adicionar imóvel de qualquer leiloeiro (Megaleilões, Sodré Santoro, etc.) preenchendo os dados manualmente.", chips: ["Qualquer leiloeiro", "Formulário manual", "MongoDB"], dep: "" },
      { title: "Dashboard de Métricas do Portfólio", priority: "Média", desc: "Painel com totais: valor arrematado, valor vendido, lucro realizado, imóveis em pipeline, ROI médio realizado.", chips: ["MongoDB Aggregation", "Área logada"], dep: "Depende: Kanban + Status por Imóvel" },
      { title: "Notas e Etiquetas por Imóvel", priority: "Média", desc: "Campo de texto livre por imóvel para observações pessoais. Tags personalizadas pelo usuário.", chips: ["Campo de notas", "Tags customizadas", "MongoDB"], dep: "" },
    ],
  },
  {
    theme: "IA Jurídica & Documentos",
    color: "#7E22CE",
    items: [
      { title: "Chat Jurídico Especializado em Caixa", priority: "Média", desc: "Chatbot com IA treinado nas regras da Caixa: sub-rogação de IPTU, uso do FGTS, habilitação, desocupação, modalidades.", chips: ["Claude API", "System prompt Caixa", "BLC exclusivo"], dep: "" },
      { title: "Análise de Edital com IA (Upload PDF)", priority: "Média", desc: "Upload do edital em PDF. IA identifica: sub-rogação de débitos, restrições ao FGTS, datas críticas. Score de risco 0–100.", chips: ["Claude API", "PDF parsing", "Score 0-100", "Formato Caixa padrão"], dep: "" },
      { title: "Análise de Matrícula com IA", priority: "Média", desc: "Upload da certidão de matrícula. IA identifica penhoras, ônus reais, hipotecas, histórico e riscos de sub-rogação.", chips: ["Claude API", "PDF parsing"], dep: "" },
      { title: "Resumo de Risco Automático dos Imóveis Caixa", priority: "Baixa", desc: "Para imóveis Caixa já no banco, gerar automaticamente um resumo de risco a partir dos dados existentes.", chips: ["Dados do scraper", "Claude API", "BLC exclusivo"], dep: "Depende: Dados ricos do scraper" },
    ],
  },
  {
    theme: "Cotização de Sócios",
    color: "#0891B2",
    items: [
      { title: "Cadastro de Sócios por Imóvel", priority: "Média", desc: "Adicionar múltiplos sócios em um arremate com percentual de participação de cada um.", chips: ["Multi-sócio", "% participação", "MongoDB"], dep: "Depende: Portfólio / Status por Imóvel" },
      { title: "Simulação de Divisão de Lucro", priority: "Média", desc: "3 critérios de divisão: igualitário, proporcional ao investido, ou reembolso das despesas primeiro.", chips: ["3 critérios", "Simulação em tempo real"], dep: "Depende: Cadastro de Sócios" },
      { title: "Convite de Sócio por E-mail", priority: "Baixa", desc: "Sócio recebe convite por e-mail e pode visualizar os dados do imóvel e a calculadora com sua participação calculada.", chips: ["Resend", "Link com token", "Permissão de visualização"], dep: "Depende: Cadastro de Sócios + Calculadora" },
    ],
  },
  {
    theme: "Pós-Arremate",
    color: "#78716C",
    items: [
      { title: "Pipeline Pós-Arremate Visual", priority: "Baixa", desc: "Fluxo visual: Arrematado → Regularização → Registro → Desocupação → Reforma → À venda → Vendido.", chips: ["Kanban", "Etapas com datas", "MongoDB"], dep: "Depende: Portfólio Kanban" },
      { title: "Registro de Despesas Reais", priority: "Baixa", desc: "Lançar despesas reais ocorridas após o arremate. Atualiza o lucro realizado vs. o estimado na calculadora.", chips: ["CRUD despesas", "Lucro realizado", "MongoDB"], dep: "Depende: Pipeline Pós-Arremate" },
      { title: "Cashback Clube BLC Vinculado ao Arremate", priority: "Clube", desc: "Ao marcar imóvel Caixa como 'Arrematado via BLC', o sistema calcula e registra o cashback automaticamente.", chips: ["BLC exclusivo", "Integração Clube", "MongoDB"], dep: "Depende: Lógica de Cashback do Clube BLC" },
    ],
  },
  {
    theme: "Crescimento & Marketing",
    color: "#DB2777",
    items: [
      { title: "Blog de Conteúdo Especializado em Caixa", priority: "Média", desc: "Artigos sobre como arrematar na Caixa, FGTS, sub-rogação, habilitação, IR. Blog do concorrente (armt.app) está vazio — janela de SEO aberta.", chips: ["SEO orgânico", "Blog MongoDB (já existe)", "Nicho Caixa"], dep: "" },
      { title: "Programa de Indicação (Referral)", priority: "Média", desc: "Link único por usuário. Indicar amigo que se cadastrar gera benefício para ambos.", chips: ["Link único", "Benefício mútuo", "MongoDB"], dep: "Depende: Gateway de Pagamento Premium" },
      { title: "Link Público de Análise Compartilhável", priority: "Baixa", desc: "Gerar link para compartilhar a análise de um imóvel com sócio, advogado ou cliente sem precisar de login.", chips: ["Token de acesso", "Snapshot MongoDB", "Sem login"], dep: "Depende: Calculadora de ROI" },
      { title: "Comunidade / Fórum de Arrematantes", priority: "Baixa", desc: "Fórum com categorias específicas para Caixa. Considerar Discord/WhatsApp Group como MVP.", chips: ["Network effect", "Discord como MVP", "Moderação"], dep: "Requer base de usuários ativa" },
    ],
  },
  {
    theme: "Plataforma & Experiência",
    color: "#0D9488",
    items: [
      { title: "Feature Gating Gratuito vs Premium", priority: "Média", desc: "Campo 'plano' existe no DB mas sem bloqueio de conteúdo na UI. Locks + CTA de upgrade onde aplicável.", chips: ["Feature gating", "CTA upgrade"], dep: "" },
      { title: "Notificações In-App", priority: "Média", desc: "Sino de notificações dentro do site exibindo novidades em favoritos, lembretes de leilão e alertas do sistema.", chips: ["Badge contador", "Painel de notificações", "MongoDB"], dep: "" },
      { title: "Seleção de Regiões no Cadastro", priority: "Média", desc: "Adicionar seleção de estados/cidades preferidos no fluxo de cadastro, não apenas no perfil.", chips: ["UX melhoria", "/cadastro"], dep: "" },
      { title: "PWA — Instalável no Celular", priority: "Baixa", desc: "Tornar o BLC instalável como Progressive Web App: ícone na tela inicial, funcionamento offline parcial, notificações push.", chips: ["manifest.json", "Service Worker", "Push notifications"], dep: "" },
    ],
  },
  {
    theme: "Admin & Infraestrutura",
    color: "#475569",
    items: [
      { title: "Monitorar Fluid Active CPU (Vercel)", priority: "Pendente", desc: "Em ago/2026 o plano free atingiu 100% do limite de 4h/mês. Correções aplicadas em 18–19/08/2026: sitemap 1h→24h + polling 30s→120s. Monitorar até set/2026.", chips: ["Sitemap 1h→24h", "Polling 30s→120s", "Monitorar até set/2026"], dep: "Correções aplicadas — aguardando confirmação" },
      { title: "Roadmap dinâmico via MongoDB + Admin UI", priority: "Média", desc: "Mover o roadmap e histórico de sprints do código para MongoDB, com interface no admin para marcar itens concluídos sem deploy.", chips: ["MongoDB", "Admin UI", "Sem deploy para atualizar"], dep: "" },
    ],
  },
  {
    theme: "Melhorias Recentes",
    color: "#059669",
    items: [
      { title: "Admin: Atividade por Usuário", priority: "Feito", desc: "Tabela de usuários exibe: favoritos salvos, planilhas criadas, último acesso, total de sessões e total de páginas visitadas.", chips: ["Admin", "MongoDB", "Métricas"], dep: "✓ Em produção" },
      { title: "Limites Freemium Ajustados", priority: "Feito", desc: "Plano gratuito: 1 planilha de viabilidade e 10 favoritos. Premium: ilimitado. Lógica aplicada na API com mensagem de upgrade.", chips: ["Freemium", "API"], dep: "✓ Em produção" },
      { title: "Fix: callbackUrl no Login", priority: "Feito", desc: "Links 'Entrar na conta' em páginas protegidas agora passam o callbackUrl correto — usuário retorna à página de origem após login.", chips: ["UX", "NextAuth"], dep: "✓ Em produção" },
      { title: "Telefone Obrigatório + Modal Cadastro Incompleto", priority: "Feito", desc: "Cadastro agora exige WhatsApp/telefone. Usuários sem telefone veem modal ao tentar favoritar, salvar planilha ou exportar PDF.", chips: ["Auth", "UX", "ModalCompletarCadastro"], dep: "✓ Em produção" },
      { title: "Estatísticas: Métricas Financeiras do Acervo", priority: "Feito", desc: "Página /estatísticas ganhou valor total do acervo ativo (~R$ 3,6 bi) e saídas de valor por 7/15/30 dias.", chips: ["Estatísticas", "MongoDB Aggregation", "ISR 1h"], dep: "✓ Em produção" },
      { title: "Fix Scraper: dataInativacao para Saídas Precisas", priority: "Feito", desc: "marcar_inativos agora filtra ativo:true e grava dataInativacao apenas na primeira transição ativo→inativo.", chips: ["Scraper", "Bug fix", "MongoDB Index"], dep: "✓ Em produção" },
      { title: "Backup Semanal MongoDB → Cloudflare R2", priority: "Feito", desc: "GitHub Action exporta users, analises_viabilidade e imoveis em JSONL gzip toda domingo às 04h BRT. Retenção 8 semanas.", chips: ["GitHub Actions", "R2", "JSONL gzip", "Retenção 8 semanas"], dep: "✓ Em produção" },
      { title: "Popup de Boas-Vindas para Usuários Logados", priority: "Feito", desc: "Popup exibido uma única vez para usuários logados mostrando recursos ativos e em breve. Persistência via MongoDB.", chips: ["MongoDB", "JWT Session", "Layout global"], dep: "✓ Em produção" },
      { title: "Planilha de Viabilidade — Upgrade Gráficos", priority: "Feito", desc: "Donut de composição de custos, breakeven, comparativo de mercado CDI/IPCA/Ibovespa/IFIX, gráfico ROI médio por mês.", chips: ["Recharts", "SVG donut", "Breakeven"], dep: "✓ Em produção" },
    ],
  },
  {
    theme: "Dados — Automático",
    color: "#10B981",
    items: [
      { title: "Imóveis sem Enriquecimento", priority: "Auto", desc: "~4.720 imóveis ainda não enriquecidos. Workflow processa automaticamente ~700/dia — sem ação manual.", chips: ["GitHub Actions", "~7 dias restantes"], dep: "✓ Processando automaticamente" },
    ],
  },
];

// Candidatos para próxima sprint: Alta prioridade, ainda pendentes
const NEXT_SPRINT_CANDIDATES = ROADMAP.flatMap((t) =>
  t.items
    .filter((i) => i.priority === "Alta")
    .map((i) => ({ ...i, theme: t.theme, themeColor: t.color }))
);

// ── Helpers ────────────────────────────────────────────────────────────────
const REFRESH = 120;

function timeAgo(iso: string | number): string {
  const ts = typeof iso === "number" ? iso : Date.parse(iso);
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

function eventLabel(e: string) {
  return ({ schedule: "Agendado", workflow_dispatch: "Manual", push: "Push", pull_request: "PR" })[e] ?? e;
}

// ── Badge components ───────────────────────────────────────────────────────
function WorkflowBadge({ run }: { run: WorkflowRun }) {
  if (run.status !== "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {run.status === "queued" ? "Na fila" : "Executando"}
      </span>
    );
  }
  if (run.conclusion === "success")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Sucesso
      </span>
    );
  if (run.conclusion === "failure" || run.conclusion === "timed_out")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {run.conclusion === "timed_out" ? "Timeout" : "Falhou"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{run.conclusion ?? run.status}
    </span>
  );
}

function DeployBadge({ state }: { state: Deployment["state"] }) {
  if (state === "BUILDING" || state === "INITIALIZING" || state === "QUEUED")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        {state === "QUEUED" ? "Na fila" : "Building"}
      </span>
    );
  if (state === "READY")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Online
      </span>
    );
  if (state === "ERROR")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Erro
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{state}
    </span>
  );
}

// ── Priority chip ──────────────────────────────────────────────────────────
function PriorityChip({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    Alta: "bg-amber-100 text-amber-800 border-amber-200",
    Média: "bg-blue-100 text-blue-800 border-blue-200",
    Baixa: "bg-gray-100 text-gray-600 border-gray-200",
    Feito: "bg-green-100 text-green-800 border-green-200",
    Clube: "bg-violet-100 text-violet-800 border-violet-200",
    Pendente: "bg-orange-100 text-orange-800 border-orange-200",
    Auto: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${map[priority] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {priority}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function StatusPage() {
  const [tab, setTab] = useState<Tab>("panorama");
  const [roadmapFilter, setRoadmapFilter] = useState<RoadmapFilter>("Pendentes");
  const [live, setLive] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH);
  const [paused, setPaused] = useState(false);

  const fetchData = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const res = await fetch("/api/admin/status");
      if (!res.ok) { setError("Não autorizado ou erro na API."); return; }
      setLive(await res.json());
      setLastUpdate(new Date());
      setCountdown(REFRESH);
      setError("");
    } catch {
      setError("Falha ao carregar status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, REFRESH * 1000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    function onVisibility() {
      const hidden = document.visibilityState === "hidden";
      setPaused(hidden);
      if (!hidden) fetchData();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        setCountdown((c) => (c <= 1 ? REFRESH : c - 1));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Computed stats
  const allRoadmapItems = ROADMAP.flatMap((t) => t.items);
  const feitoCount = allRoadmapItems.filter((i) => i.priority === "Feito").length;
  const pendingCount = allRoadmapItems.filter((i) => !["Feito", "Auto"].includes(i.priority)).length;
  const altaCount = allRoadmapItems.filter((i) => i.priority === "Alta").length;
  const sprintItemCount = SPRINTS.reduce((a, s) => a + s.items.length, 0);

  // Dedup workflows by name (keep latest run per workflow)
  const latestWorkflows = live?.workflows
    ? Object.values(
        live.workflows.reduce<Record<string, WorkflowRun>>((acc, run) => {
          const key = run.name;
          if (!acc[key] || Date.parse(run.updated_at) > Date.parse(acc[key].updated_at)) {
            acc[key] = run;
          }
          return acc;
        }, {})
      ).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    : [];

  const latestDeploy = live?.deployments?.[0];
  const hasLiveError =
    latestWorkflows.some((r) => r.conclusion === "failure" || r.conclusion === "timed_out") ||
    latestDeploy?.state === "ERROR";

  // Roadmap filter
  const filteredRoadmap = ROADMAP.map((t) => ({
    ...t,
    items: t.items.filter((item) => {
      if (roadmapFilter === "Pendentes") return !["Feito", "Auto"].includes(item.priority);
      if (roadmapFilter === "Feito") return item.priority === "Feito";
      return item.priority === roadmapFilter;
    }),
  })).filter((t) => t.items.length > 0);

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: "panorama", label: "Panorama" },
    { id: "live", label: "Ao Vivo", badge: hasLiveError ? "!" : undefined },
    { id: "sprints", label: "Sprints" },
    { id: "roadmap", label: "Roadmap" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
              <span className="text-gray-200">|</span>
              <div>
                <span className="text-xs font-bold text-amber-600 tracking-widest uppercase">BLC</span>
                <span className="text-sm font-semibold text-gray-800 ml-2">Dashboard do Projeto</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdate && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  {paused ? "pausado" : `atualiza em ${countdown}s`}
                </span>
              )}
              <button
                onClick={fetchData}
                className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ↺ Atualizar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
                  tab === t.id
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t.label}
                {t.badge && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB: PANORAMA
        ═══════════════════════════════════════════════════════════ */}
        {tab === "panorama" && (
          <div className="space-y-8">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { num: "13", label: "Sprints concluídas", sub: `${sprintItemCount} funcionalidades entregues`, color: "#01304D" },
                { num: String(feitoCount + sprintItemCount), label: "Features em produção", sub: `Inclui ${feitoCount} adicionadas pós-sprint`, color: "#10B981" },
                { num: String(altaCount), label: "Itens de alta prioridade", sub: "No roadmap pendente", color: "#F59E0B" },
                { num: String(pendingCount), label: "Itens no roadmap", sub: "Planejados para sprints futuros", color: "#6366F1" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl shadow-sm border p-4" style={{ borderLeftColor: s.color, borderLeftWidth: 4 }}>
                  <div className="text-2xl font-extrabold text-gray-800 font-mono tabular-nums">{s.num}</div>
                  <div className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Infra alert */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <span className="text-amber-500 text-lg shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">Fluid CPU — Monitoramento ativo até set/2026</p>
                <p className="text-xs text-amber-700 mt-1">
                  Em ago/2026 o plano free atingiu 100% do limite (4h/mês). Correções aplicadas em 18–19/08/2026:
                  sitemap revalidate <strong>1h → 24h</strong> (principal) e polling de status <strong>30s → 120s</strong> (secundário).
                  Aguardar confirmação de redução no painel Vercel.
                </p>
              </div>
            </div>

            {/* Live health condensed + Próxima Sprint side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live health */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Saúde dos Serviços</h2>
                  <button onClick={() => setTab("live")} className="text-xs text-blue-600 hover:underline">ver tudo →</button>
                </div>
                {loading ? (
                  <div className="h-20 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
                ) : (
                  <div className="space-y-2">
                    {/* Latest deploy */}
                    {latestDeploy && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">Vercel — Último deploy</p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                            {latestDeploy.meta?.githubCommitMessage?.split("\n")[0] ?? latestDeploy.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-gray-400">{timeAgo(latestDeploy.createdAt)}</span>
                          <DeployBadge state={latestDeploy.state} />
                        </div>
                      </div>
                    )}
                    {/* Workflows */}
                    {latestWorkflows.map((run) => (
                      <div key={run.workflow_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{run.name}</p>
                          <p className="text-[11px] text-gray-400">{eventLabel(run.event)} · {timeAgo(run.updated_at)}</p>
                        </div>
                        <a href={run.html_url} target="_blank" rel="noopener noreferrer">
                          <WorkflowBadge run={run} />
                        </a>
                      </div>
                    ))}
                    {!latestDeploy && latestWorkflows.length === 0 && (
                      <p className="text-sm text-gray-400">Nenhum dado disponível</p>
                    )}
                  </div>
                )}
              </div>

              {/* Próxima Sprint */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Sprint 14 — Candidatos</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Itens de alta prioridade no roadmap</p>
                  </div>
                  <button onClick={() => { setTab("roadmap"); setRoadmapFilter("Alta"); }} className="text-xs text-blue-600 hover:underline">ver roadmap →</button>
                </div>
                <div className="space-y-2">
                  {NEXT_SPRINT_CANDIDATES.slice(0, 6).map((item) => (
                    <div key={item.title} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                      <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: item.themeColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{item.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.theme}</p>
                      </div>
                    </div>
                  ))}
                  {NEXT_SPRINT_CANDIDATES.length > 6 && (
                    <p className="text-[11px] text-gray-400 pt-1">+ {NEXT_SPRINT_CANDIDATES.length - 6} outros itens Alta</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sprint 13 summary */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Última Sprint Concluída</h2>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Sprint 13 — {SPRINTS[12].title}</p>
                </div>
                <button onClick={() => setTab("sprints")} className="text-xs text-blue-600 hover:underline">ver todas →</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPRINTS[12].items.map((item) => (
                  <span key={item} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2.5 py-1">
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Roadmap overview: theme progress bars */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Progresso por Tema</h2>
                <button onClick={() => setTab("roadmap")} className="text-xs text-blue-600 hover:underline">ver roadmap →</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROADMAP.filter(t => t.theme !== "Dados — Automático").map((t) => {
                  const done = t.items.filter((i) => i.priority === "Feito").length;
                  const total = t.items.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={t.theme} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 truncate">{t.theme}</span>
                          <span className="text-[11px] text-gray-400 tabular-nums shrink-0 ml-2">{done}/{total}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: t.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB: AO VIVO
        ═══════════════════════════════════════════════════════════ */}
        {tab === "live" && (
          <div className="space-y-8">
            {/* GitHub Actions */}
            <div>
              <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub Actions — ao vivo
                <div className="flex-1 h-px bg-gray-200 ml-2" />
              </h2>
              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
              ) : !live?.workflows.length ? (
                <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Nenhum workflow encontrado.</div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide bg-gray-50">
                        <th className="px-4 py-3 font-medium">Workflow</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Gatilho</th>
                        <th className="px-4 py-3 font-medium">Branch</th>
                        <th className="px-4 py-3 font-medium">Executado</th>
                        <th className="px-4 py-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {live.workflows
                        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
                        .map((run) => (
                          <tr
                            key={run.id}
                            className={`border-b last:border-0 ${
                              run.conclusion === "failure" || run.conclusion === "timed_out"
                                ? "bg-red-50"
                                : run.status !== "completed"
                                ? "bg-yellow-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800">{run.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{run.path.replace(".github/workflows/", "")}</p>
                            </td>
                            <td className="px-4 py-3"><WorkflowBadge run={run} /></td>
                            <td className="px-4 py-3 text-xs text-gray-500">{eventLabel(run.event)}</td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-600">{run.head_branch}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(run.updated_at)}</td>
                            <td className="px-4 py-3 text-right">
                              <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver →</a>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Vercel Deployments */}
            <div>
              <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z" /></svg>
                Vercel Deployments — ao vivo
                <div className="flex-1 h-px bg-gray-200 ml-2" />
              </h2>
              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
              ) : !live?.deployments.length ? (
                <div className="bg-white rounded-xl shadow-sm border h-24 flex items-center justify-center text-sm text-gray-400">Nenhum deploy encontrado.</div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide bg-gray-50">
                        <th className="px-4 py-3 font-medium">Commit</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Branch</th>
                        <th className="px-4 py-3 font-medium">Autor</th>
                        <th className="px-4 py-3 font-medium">Quando</th>
                        <th className="px-4 py-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {live.deployments.map((dep) => (
                        <tr
                          key={dep.uid}
                          className={`border-b last:border-0 ${
                            dep.state === "ERROR"
                              ? "bg-red-50"
                              : dep.state === "BUILDING" || dep.state === "INITIALIZING"
                              ? "bg-yellow-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-4 py-3 max-w-xs">
                            <p className="font-medium text-gray-800 truncate">
                              {dep.meta?.githubCommitMessage?.split("\n")[0] ?? dep.name}
                            </p>
                            {dep.meta?.githubCommitSha && (
                              <p className="text-xs font-mono text-gray-400 mt-0.5">{dep.meta.githubCommitSha.slice(0, 7)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3"><DeployBadge state={dep.state} /></td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-600">{dep.meta?.githubCommitRef ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{dep.creator?.username ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(dep.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            {dep.state === "READY" && dep.url && (
                              <a href={`https://${dep.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver →</a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {lastUpdate && (
              <p className="text-xs text-gray-400 text-center">
                Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")} ·{" "}
                {paused ? "pausado (aba em segundo plano)" : `próximo em ${countdown}s`}
              </p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB: SPRINTS
        ═══════════════════════════════════════════════════════════ */}
        {tab === "sprints" && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">13 Sprints Concluídas</h2>
                <p className="text-sm text-gray-500">{sprintItemCount} funcionalidades entregues em produção</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">Progresso geral</span>
                <span className="text-xs text-gray-500">Sprint 13 de ~16 estimadas</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#01304D] to-[#F59E0B] rounded-full" style={{ width: "81%" }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[11px] text-green-600 font-semibold">✓ Sprint 1</span>
                <span className="text-[11px] text-amber-600 font-semibold">→ Sprint 14</span>
                <span className="text-[11px] text-gray-400">~Sprint 16</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SPRINTS.map((s, idx) => (
                <div key={s.num} className="bg-white rounded-xl shadow-sm border border-l-4 border-l-green-400 p-4 flex gap-3">
                  <div className="shrink-0">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-700 text-xs font-extrabold border border-green-200">
                      {s.num}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{s.title}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.items.map((item) => (
                        <span key={item} className="text-[11px] bg-green-50 text-green-700 rounded px-1.5 py-0.5 border border-green-100">{item}</span>
                      ))}
                    </div>
                  </div>
                  {idx === SPRINTS.length - 1 && (
                    <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 h-fit">Última</span>
                  )}
                </div>
              ))}

              {/* Sprint 14 placeholder */}
              <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-amber-400 border-dashed p-4 flex gap-3 opacity-70">
                <div className="shrink-0">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200">
                    14
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-600 leading-tight">Em planejamento</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {NEXT_SPRINT_CANDIDATES.slice(0, 4).map((item) => (
                      <span key={item.title} className="text-[11px] bg-amber-50 text-amber-700 rounded px-1.5 py-0.5 border border-amber-100">{item.title}</span>
                    ))}
                    <span className="text-[11px] text-gray-400 px-1.5 py-0.5">+ mais...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB: ROADMAP
        ═══════════════════════════════════════════════════════════ */}
        {tab === "roadmap" && (
          <div>
            {/* Header + filter */}
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Roadmap</h2>
                <p className="text-sm text-gray-500">
                  {pendingCount} itens pendentes · {feitoCount} concluídos fora de sprint
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(["Pendentes", "Alta", "Média", "Baixa", "Feito"] as RoadmapFilter[]).map((f) => {
                  const counts: Record<RoadmapFilter, number> = {
                    Pendentes: pendingCount,
                    Alta: allRoadmapItems.filter((i) => i.priority === "Alta").length,
                    Média: allRoadmapItems.filter((i) => i.priority === "Média").length,
                    Baixa: allRoadmapItems.filter((i) => i.priority === "Baixa").length,
                    Feito: feitoCount,
                  };
                  return (
                    <button
                      key={f}
                      onClick={() => setRoadmapFilter(f)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        roadmapFilter === f
                          ? "bg-[#01304D] text-white border-[#01304D]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {f} <span className={`ml-1 ${roadmapFilter === f ? "text-white/70" : "text-gray-400"}`}>({counts[f]})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-8">
              {filteredRoadmap.map((theme) => {
                const themeDone = ROADMAP.find((t) => t.theme === theme.theme)?.items.filter((i) => i.priority === "Feito").length ?? 0;
                const themeTotal = ROADMAP.find((t) => t.theme === theme.theme)?.items.length ?? 0;
                return (
                  <div key={theme.theme}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme.color }} />
                      <span className="text-sm font-bold text-gray-700">{theme.theme}</span>
                      {themeDone > 0 && themeTotal > 0 && (
                        <span className="text-xs text-gray-400">{themeDone}/{themeTotal} concluídos</span>
                      )}
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {theme.items.map((item) => (
                        <div
                          key={item.title}
                          className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-2 ${
                            item.priority === "Feito" ? "opacity-75" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</p>
                            <PriorityChip priority={item.priority} />
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                          <div className="flex flex-wrap gap-1">
                            {item.chips.map((c) => (
                              <span key={c} className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 border border-gray-200">{c}</span>
                            ))}
                          </div>
                          {item.dep && (
                            <p className="text-xs text-gray-400 pt-1 border-t border-dashed border-gray-200">{item.dep}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 pb-8">
        Busca Leilões Caixa · BLC — Dashboard interno
      </p>
    </div>
  );
}
