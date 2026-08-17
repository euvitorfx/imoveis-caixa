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
];

const ROADMAP = [
  {
    theme: "E-mails & Comunicação",
    color: "bg-amber-500",
    items: [
      {
        title: "Recuperação de Senha",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-amber-800",
        desc: "Fluxo completo de esqueci minha senha: token com expiração gravado no MongoDB, e-mail com link, rota /recuperar-senha para redefinir. Único e-mail essencial ainda ausente na experiência básica.",
        chips: ["Resend", "Token MongoDB", "Rota /recuperar-senha"],
        dep: "",
      },
      {
        title: "Alertas de Novos Imóveis",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-amber-800",
        desc: "GitHub Action diária consulta novos imóveis por estado/cidade e envia e-mail para usuários com preferências cadastradas. Requer seleção de regiões no cadastro/perfil e link de unsubscribe.",
        chips: ["Resend", "GitHub Action diária", "Preferências por região", "Unsubscribe"],
        dep: "Seleção de regiões no cadastro (pré-requisito)",
      },
      {
        title: "Resumo Semanal do Acervo",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "E-mail opcional todo domingo com novos, removidos e destaque da semana nos estados favoritos do usuário. Ativado por preferência no perfil.",
        chips: ["Resend", "GitHub Action domingo", "Opt-in no perfil"],
        dep: "Depende de Alertas de Novos Imóveis estar pronto",
      },
      {
        title: "Fix: Cores do E-mail em Dark Mode",
        priority: "Pendente",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Gmail mobile dark mode distorce as cores do template de boas-vindas. Tentativas com bgcolor, data-ogsc, color-scheme e dark mode nativo não resolveram. Investigar imagens PNG para áreas críticas de cor ou testar com Litmus / Email on Acid.",
        chips: ["Gmail dark mode", "Litmus / Email on Acid", "PNG para barras de cor"],
        dep: "Boas-vindas funciona em light mode ✓",
      },
      {
        title: "E-mail de Upgrade Premium",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Confirmação automática quando pagamento for aprovado pelo webhook do Stripe / Mercado Pago, informando data de renovação e benefícios ativos.",
        chips: ["Resend", "Webhook pagamento"],
        dep: "Depende: Sprint 14 (Pagamento Premium)",
      },
      {
        title: "E-mails do Clube BLC",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Dois e-mails: (1) confirmação quando usuário registra nova compra, com cashback estimado; (2) notificação quando cashback é confirmado pelo admin com valor e prazo de pagamento.",
        chips: ["Resend", "Registro de compra", "Cashback confirmado"],
        dep: "Depende: Sprints 15 e 16 (Clube BLC)",
      },
    ],
  },
  {
    theme: "Clube BLC — Monetização",
    color: "bg-violet-500",
    items: [
      {
        title: 'Formulário "Nova Compra"',
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Registro da compra no site após finalizar na Caixa — HDN, modalidade e assessor indicado.",
        chips: ["Formulário no site", "API + MongoDB"],
        dep: "",
      },
      {
        title: "Dashboard de Compra + Checklist",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Área do membro para acompanhar o status da compra passo a passo até o registro.",
        chips: ["Área logada", "Status por etapa"],
        dep: "",
      },
      {
        title: "Lógica de Cashback",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Calcular e registrar cashback do usuário (0,5% → 1% conforme histórico). Visualização no perfil e admin.",
        chips: ["Escalonamento", "Histórico"],
        dep: "",
      },
      {
        title: "Gestão de Assessores Parceiros",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Admin para cadastrar assessores, vincular compras e controlar comissão por compra finalizada.",
        chips: ["Admin panel", "Comissão"],
        dep: "Depende de Formulário Nova Compra",
      },
      {
        title: "Pagamento — Plano Premium",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Checkout de assinatura para acesso premium via Stripe ou Mercado Pago.",
        chips: ["Stripe / MP", "Webhook"],
        dep: "",
      },
    ],
  },
  {
    theme: "Área de Membros",
    color: "bg-green-600",
    items: [
      {
        title: "Feature Gating Gratuito vs Premium",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Campo 'plano' existe no DB mas sem bloqueio de conteúdo na UI. Locks + CTA de upgrade onde aplicável.",
        chips: ["Feature gating", "CTA upgrade"],
        dep: "",
      },
    ],
  },
  {
    theme: "UX & Cadastro",
    color: "bg-sky-500",
    items: [
      {
        title: "Seleção de Regiões no Cadastro",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Adicionar seleção de estados/cidades preferidos no fluxo de cadastro, não apenas no perfil.",
        chips: ["UX melhoria", "/cadastro"],
        dep: "",
      },
    ],
  },
  {
    theme: "Corretores",
    color: "bg-gray-500",
    items: [
      {
        title: "Integração Corretores × Clube BLC",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Vincular o sistema de corretores ao programa de cashback — corretores podem atuar como assessores BLC.",
        chips: ["Integração", "Gestão de papéis"],
        dep: "Depende de Gestão de Assessores BLC",
      },
    ],
  },
  {
    theme: "Admin & Infraestrutura",
    color: "bg-slate-600",
    items: [
      {
        title: "Roadmap dinâmico via MongoDB + Admin UI",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Mover o roadmap e histórico de sprints do código para uma coleção no MongoDB, com interface no admin para marcar itens como concluídos sem precisar editar código.",
        chips: ["MongoDB", "Admin UI", "Sem deploy para atualizar"],
        dep: "",
      },
    ],
  },
  {
    theme: "Calculadora & Análise Financeira",
    color: "bg-blue-600",
    items: [
      {
        title: "Calculadora de ROI / TIR / Lucro Líquido",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-amber-800",
        desc: "Embutida na página de cada imóvel. Campos: lance, valor de venda, ITBI, registro, reforma, condomínio/IPTU, débitos, corretagem, GCAP 15%, prazo. Outputs: ROI, TIR anualizada, lucro líquido. Diferencial: calculadora já vem pré-preenchida com lance mínimo e dados do imóvel Caixa.",
        chips: ["Pré-preenchida c/ dados Caixa", "React state", "API Banco Central (CDI)"],
        dep: "",
      },
      {
        title: "Lance Máximo por Meta de ROI",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-amber-800",
        desc: "Usuário define ROI mínimo desejado (ex: 30%) e a calculadora retorna automaticamente o lance máximo que ainda garante esse retorno.",
        chips: ["Cálculo inverso", "Integrado à calculadora"],
        dep: "Depende: Calculadora de ROI",
      },
      {
        title: "Comparação com Índices de Mercado",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-amber-800",
        desc: "Mostra se o ROI do leilão bate ou perde para CDI, IPCA, Ibovespa e IFIX no mesmo prazo e capital. Responde 'vale mais que a renda fixa?' em tempo real. Taxa CDI via API pública do Banco Central — integração gratuita.",
        chips: ["CDI", "IPCA", "Ibovespa", "IFIX", "API BC gratuita"],
        dep: "Depende: Calculadora de ROI",
      },
      {
        title: "Salvar Cálculo Vinculado ao Imóvel",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Usuário salva os parâmetros da calculadora junto ao imóvel favorito para consultar depois sem precisar preencher novamente. Persistência no MongoDB.",
        chips: ["MongoDB", "Favoritos"],
        dep: "Depende: Calculadora de ROI + Favoritos",
      },
    ],
  },
  {
    theme: "Portfólio de Imóveis",
    color: "bg-indigo-600",
    items: [
      {
        title: "Kanban de Acompanhamento",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Pipeline visual com estágios: Interesse → Em análise → Lance confirmado → Arrematado → Vendido. Funciona para imóveis da Caixa E de outros leiloeiros cadastrados manualmente. Drag and drop entre estágios.",
        chips: ["Caixa + outros leiloeiros", "Drag and drop", "MongoDB"],
        dep: "",
      },
      {
        title: "Cadastro Manual de Imóvel Externo",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Adicionar imóvel de qualquer leiloeiro (Megaleilões, Sodré Santoro, etc.) preenchendo os dados manualmente ou colando o link. Permite gerir portfólio completo no BLC.",
        chips: ["Qualquer leiloeiro", "Formulário manual", "MongoDB"],
        dep: "",
      },
      {
        title: "Dashboard de Métricas do Portfólio",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Painel com totais: valor arrematado, valor vendido, lucro realizado, imóveis em pipeline, ROI médio realizado.",
        chips: ["MongoDB Aggregation", "Área logada"],
        dep: "Depende: Kanban + Status por Imóvel",
      },
      {
        title: "Notas e Etiquetas por Imóvel",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Campo de texto livre por imóvel para observações pessoais (vistoria, risco, negociação). Tags personalizadas pelo usuário: 'oportunidade', 'risco jurídico', 'para sócio'.",
        chips: ["Campo de notas", "Tags customizadas", "MongoDB"],
        dep: "",
      },
    ],
  },
  {
    theme: "Alertas & Notificações — Expansão",
    color: "bg-orange-500",
    items: [
      {
        title: "Alertas por WhatsApp",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-amber-800",
        desc: "Novos imóveis e mudanças em favoritos via WhatsApp. Taxa de abertura ~98% vs 22% do e-mail. Concorrente (armt.app) anuncia como 'em breve' — oportunidade de sair na frente. Via Twilio ou Z-API. Feature Premium.",
        chips: ["Twilio / Z-API", "Feature Premium", "98% abertura"],
        dep: "Depende: Gateway de Pagamento Premium",
      },
      {
        title: "Botão 'Adicionar ao Google Calendar'",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-amber-800",
        desc: "Gera arquivo .ics com datas de 1ª e 2ª praça e prazo de habilitação diretamente na página do imóvel. Um clique adiciona ao calendário do usuário. Implementação simples — dados já existem no scraper.",
        chips: [".ics download", "Dados já no scraper", "Implementação simples"],
        dep: "",
      },
      {
        title: "Lembrete de Prazo de Habilitação",
        priority: "Alta",
        priorityColor: "bg-amber-100 text-blue-800",
        desc: "Alertar 24h e 1h antes do prazo de habilitação dos imóveis salvos. Via e-mail (e futuramente WhatsApp). Investidores perdem leilões por esquecer de se habilitar a tempo.",
        chips: ["E-mail + WhatsApp", "Imóveis salvos"],
        dep: "Depende: Alertas por WhatsApp (para canal WA)",
      },
      {
        title: "Alerta por ROI Mínimo",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Usuário define critério avançado: receber alertas somente de imóveis com desconto acima de X% ou estimativa de ROI acima de Y%. Filtra ruído para investidores experientes.",
        chips: ["Filtro avançado", "Calculadora integrada"],
        dep: "Depende: Calculadora de ROI",
      },
      {
        title: "Opt-out Granular de Alertas",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Controles separados por tipo e canal: 'novos imóveis' e 'mudanças em favoritos', independentemente para e-mail e WhatsApp.",
        chips: ["Toggle por tipo", "Toggle por canal", "Perfil"],
        dep: "",
      },
    ],
  },
  {
    theme: "IA Jurídica & Análise de Documentos",
    color: "bg-purple-700",
    items: [
      {
        title: "Chat Jurídico Especializado em Caixa",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Chatbot com IA treinado nas regras específicas da Caixa Econômica Federal: sub-rogação de IPTU (Art. 130 CTN), uso do FGTS, processo de habilitação, desocupação de ocupante, modalidades. Diferencial: exclusivo para o universo Caixa.",
        chips: ["Claude API", "System prompt Caixa", "BLC exclusivo"],
        dep: "",
      },
      {
        title: "Análise de Edital com IA (Upload PDF)",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Upload do edital em PDF. IA identifica: sub-rogação de débitos, restrições ao FGTS, datas críticas, valor mínimo, comissão do leiloeiro. Score de risco 0–100. Editais da Caixa têm formato padronizado — facilita a análise.",
        chips: ["Claude API", "PDF parsing", "Score 0-100", "Formato Caixa padrão"],
        dep: "",
      },
      {
        title: "Análise de Matrícula com IA",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Upload da certidão de matrícula. IA identifica penhoras, ônus reais, hipotecas, histórico do imóvel e riscos de sub-rogação.",
        chips: ["Claude API", "PDF parsing"],
        dep: "",
      },
      {
        title: "Resumo de Risco Automático dos Imóveis Caixa",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Para imóveis Caixa já no banco, gerar automaticamente um resumo de risco a partir dos dados que já temos: tipo de leilão, situação de ocupação, dívidas identificadas. Sem precisar de upload de PDF.",
        chips: ["Dados do scraper", "Claude API", "BLC exclusivo"],
        dep: "Depende: Dados ricos do scraper",
      },
    ],
  },
  {
    theme: "Cotização de Sócios",
    color: "bg-cyan-700",
    items: [
      {
        title: "Cadastro de Sócios por Imóvel",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Adicionar múltiplos sócios em um arremate com percentual de participação de cada um. Muito comum entre investidores que compram imóveis em grupo.",
        chips: ["Multi-sócio", "% participação", "MongoDB"],
        dep: "Depende: Portfólio / Status por Imóvel",
      },
      {
        title: "Simulação de Divisão de Lucro",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "3 critérios de divisão: igualitário, proporcional ao investido, ou reembolso das despesas primeiro e depois divide o restante. Tabela mostrando quanto cada sócio recebe na venda.",
        chips: ["3 critérios", "Simulação em tempo real"],
        dep: "Depende: Cadastro de Sócios",
      },
      {
        title: "Convite de Sócio por E-mail",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Sócio recebe convite por e-mail e pode visualizar os dados do imóvel e a calculadora com sua participação já calculada.",
        chips: ["Resend", "Link com token", "Permissão de visualização"],
        dep: "Depende: Cadastro de Sócios + Calculadora",
      },
    ],
  },
  {
    theme: "Pós-Arremate",
    color: "bg-stone-600",
    items: [
      {
        title: "Pipeline Pós-Arremate Visual",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Fluxo visual: Arrematado → Regularização → Registro no Cartório → Desocupação → Reforma → À venda → Vendido. Com datas e observações por etapa.",
        chips: ["Kanban", "Etapas com datas", "MongoDB"],
        dep: "Depende: Portfólio Kanban",
      },
      {
        title: "Registro de Despesas Reais",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Lançar despesas reais ocorridas após o arremate: ITBI pago, custo de reforma, advogado, condomínio. Atualiza o lucro realizado vs. o estimado na calculadora.",
        chips: ["CRUD despesas", "Lucro realizado", "MongoDB"],
        dep: "Depende: Pipeline Pós-Arremate",
      },
      {
        title: "Cashback Clube BLC Vinculado ao Arremate",
        priority: "Clube",
        priorityColor: "bg-violet-100 text-violet-800",
        desc: "Ao marcar imóvel Caixa como 'Arrematado via BLC', o sistema calcula e registra o cashback do Clube devido ao usuário automaticamente.",
        chips: ["BLC exclusivo", "Integração Clube", "MongoDB"],
        dep: "Depende: Lógica de Cashback do Clube BLC",
      },
    ],
  },
  {
    theme: "Crescimento & Marketing",
    color: "bg-pink-600",
    items: [
      {
        title: "Programa de Indicação (Referral)",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Link único por usuário. Indicar amigo que se cadastrar gera benefício para ambos: mês de Premium grátis, alertas WhatsApp de bônus, ou cashback extra no Clube BLC. Growth loop de baixo custo.",
        chips: ["Link único", "Benefício mútuo", "MongoDB"],
        dep: "Depende: Gateway de Pagamento Premium",
      },
      {
        title: "Blog de Conteúdo Especializado em Caixa",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Artigos sobre como arrematar na Caixa, FGTS, sub-rogação, habilitação, IR. Blog do concorrente (armt.app) está completamente vazio — janela de SEO aberta para dominar o nicho.",
        chips: ["SEO orgânico", "Blog MongoDB (já existe)", "Nicho Caixa"],
        dep: "",
      },
      {
        title: "Comunidade / Fórum de Arrematantes",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Fórum com categorias específicas para Caixa: Jurídico, Financeiro, FGTS, Iniciante, Pós-Arremate. Requer massa crítica de usuários para funcionar — considerar Discord/WhatsApp Group como MVP.",
        chips: ["Network effect", "Discord como MVP", "Moderação"],
        dep: "Requer base de usuários ativa",
      },
      {
        title: "Link Público de Análise Compartilhável",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Gerar link para compartilhar a análise de um imóvel com sócio, advogado ou cliente sem precisar de login. Snapshot dos dados e da calculadora em URL pública com token.",
        chips: ["Token de acesso", "Snapshot MongoDB", "Sem login"],
        dep: "Depende: Calculadora de ROI",
      },
    ],
  },
  {
    theme: "Plataforma & Experiência",
    color: "bg-teal-600",
    items: [
      {
        title: "Notificações In-App",
        priority: "Média",
        priorityColor: "bg-blue-100 text-blue-800",
        desc: "Sino de notificações dentro do site exibindo novidades em favoritos, lembretes de leilão e alertas do sistema — sem depender de e-mail ou WhatsApp.",
        chips: ["Badge contador", "Painel de notificações", "MongoDB"],
        dep: "",
      },
      {
        title: "PWA — Instalável no Celular",
        priority: "Baixa",
        priorityColor: "bg-gray-100 text-gray-600",
        desc: "Tornar o BLC instalável como Progressive Web App: ícone na tela inicial do celular, funcionamento offline parcial, notificações push nativas.",
        chips: ["manifest.json", "Service Worker", "Push notifications"],
        dep: "",
      },
    ],
  },
  {
    theme: "Melhorias Recentes (fora de sprint)",
    color: "bg-teal-500",
    items: [
      {
        title: "Admin: Atividade por Usuário",
        priority: "Feito",
        priorityColor: "bg-green-100 text-green-800",
        desc: "Tabela de usuários agora exibe: favoritos salvos, planilhas criadas, último acesso, total de sessões e total de páginas visitadas. Rastreamento ativo em cada pageview de usuário logado.",
        chips: ["Admin", "MongoDB", "Métricas"],
        dep: "✓ Em produção",
      },
      {
        title: "Limites Freemium Ajustados",
        priority: "Feito",
        priorityColor: "bg-green-100 text-green-800",
        desc: "Plano gratuito: 1 planilha de viabilidade e 10 favoritos. Premium: ilimitado. Lógica aplicada na API com mensagem de upgrade.",
        chips: ["Freemium", "API"],
        dep: "✓ Em produção",
      },
      {
        title: "Fix: callbackUrl no Login",
        priority: "Feito",
        priorityColor: "bg-green-100 text-green-800",
        desc: "Links 'Entrar na conta' em páginas protegidas agora passam o callbackUrl correto — usuário retorna à página de origem após login, não à home.",
        chips: ["UX", "NextAuth"],
        dep: "✓ Em produção",
      },
      {
        title: "Telefone Obrigatório + Modal de Cadastro Incompleto",
        priority: "Feito",
        priorityColor: "bg-green-100 text-green-800",
        desc: "Cadastro agora exige WhatsApp/telefone. Usuários já cadastrados sem telefone veem um modal ao tentar favoritar, salvar planilha ou exportar PDF — redirecionando ao perfil para completar o dado.",
        chips: ["Auth", "UX", "ModalCompletarCadastro"],
        dep: "✓ Em produção",
      },
      {
        title: "Estatísticas: Métricas Financeiras do Acervo",
        priority: "Feito",
        priorityColor: "bg-green-100 text-green-800",
        desc: "Página /estatísticas ganhou valor total do acervo ativo (~R$ 3,6 bi) e saídas de valor por 7/15/30 dias. Movimentações do Acervo agora tem toggle interativo de período (7/15/30 dias) — todos os dados pré-carregados no servidor.",
        chips: ["Estatísticas", "MongoDB Aggregation", "ISR 1h"],
        dep: "✓ Em produção",
      },
      {
        title: "Fix Scraper: dataInativacao para Saídas Precisas",
        priority: "Feito",
        priorityColor: "bg-green-100 text-green-800",
        desc: "marcar_inativos agora filtra ativo:true e grava dataInativacao apenas na primeira transição ativo→inativo. Antes, dataAtualizacao era reescrito a cada scrape, tornando as saídas por período incorretas.",
        chips: ["Scraper", "Bug fix", "MongoDB Index"],
        dep: "✓ Em produção",
      },
      {
        title: "Backup Semanal MongoDB → Cloudflare R2",
        priority: "Feito",
        priorityColor: "bg-green-100 text-green-800",
        desc: "GitHub Action (backup.yml) exporta users, analises_viabilidade e imoveis em JSONL gzip toda domingo às 04h BRT. Retenção de 8 semanas com remoção automática de backups antigos. Manifesto JSON com totais por coleção.",
        chips: ["GitHub Actions", "R2", "JSONL gzip", "Retenção 8 semanas"],
        dep: "✓ Em produção",
      },
      {
        title: "Popup de Boas-Vindas para Usuários Logados",
        priority: "Feito",
        priorityColor: "bg-green-100 text-green-800",
        desc: "Popup exibido uma única vez para usuários logados mostrando recursos ativos (Favoritos, Planilha, PDF) e em breve (Alertas, Clube BLC). Persistência via MongoDB (popupFeaturesVisto) — não repete em nenhum device após dispensar.",
        chips: ["MongoDB", "JWT Session", "Layout global"],
        dep: "✓ Em produção",
      },
    ],
  },
  {
    theme: "Dados — Automático",
    color: "bg-emerald-500",
    items: [
      {
        title: "Imóveis sem Enriquecimento",
        priority: "Auto",
        priorityColor: "bg-emerald-100 text-emerald-800",
        desc: "~4.720 imóveis ainda não enriquecidos. Workflow processa automaticamente ~700/dia — sem ação manual.",
        chips: ["GitHub Actions", "~7 dias restantes"],
        dep: "✓ Processando automaticamente",
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const REFRESH = 30;

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
  if (run.conclusion === "success") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Sucesso
    </span>
  );
  if (run.conclusion === "failure" || run.conclusion === "timed_out") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{run.conclusion === "timed_out" ? "Timeout" : "Falhou"}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{run.conclusion ?? run.status}
    </span>
  );
}

function DeployBadge({ state }: { state: Deployment["state"] }) {
  if (state === "BUILDING" || state === "INITIALIZING" || state === "QUEUED") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />{state === "QUEUED" ? "Na fila" : "Building"}
    </span>
  );
  if (state === "READY") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Online
    </span>
  );
  if (state === "ERROR") return (
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

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-bold tracking-widest uppercase text-gray-400">{children}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function StatusPage() {
  const [live, setLive] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH);

  const fetchData = useCallback(async () => {
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
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? REFRESH : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const totalPending = ROADMAP.reduce((acc, t) => acc + t.items.length, 0);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-12">

      {/* ── Header ── */}
      <div>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-1">Busca Leilões Caixa · BLC</p>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard do Projeto</h1>
            <p className="text-sm text-gray-500 mt-1">
              Status ao vivo · Histórico de sprints · Roadmap pendente
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {lastUpdate && (
              <span className="text-xs text-gray-400">
                Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")} · próximo em {countdown}s
              </span>
            )}
            <button onClick={fetchData}
              className="text-sm px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              ↺ Atualizar
            </button>
            <a href="/admin" className="text-sm text-blue-600 hover:underline px-3 py-2">← Admin</a>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { num: "12", label: "Sprints concluídas", color: "border-green-400" },
            { num: String(totalPending), label: "Itens pendentes", color: "border-amber-400" },
            { num: "25k+", label: "Imóveis no banco", color: "border-blue-400" },
            { num: "9.855", label: "Matrículas enriquecidas", color: "border-violet-400" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl border-l-4 ${s.color} shadow-sm px-4 py-3`}>
              <div className="text-2xl font-extrabold text-gray-800 font-mono">{s.num}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GitHub Actions ── */}
      <div>
        <SectionLabel>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub Actions — ao vivo
          </span>
        </SectionLabel>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

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
                    <tr key={run.workflow_id}
                      className={`border-b last:border-0 ${
                        run.conclusion === "failure" || run.conclusion === "timed_out" ? "bg-red-50"
                        : run.status !== "completed" ? "bg-yellow-50"
                        : "hover:bg-gray-50"
                      }`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{run.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{run.path.replace(".github/workflows/", "")}</p>
                      </td>
                      <td className="px-4 py-3"><WorkflowBadge run={run} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{eventLabel(run.event)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{run.head_branch}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(run.updated_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <a href={run.html_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">Ver →</a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Vercel Deployments ── */}
      <div>
        <SectionLabel>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>
            Vercel Deployments — ao vivo
          </span>
        </SectionLabel>

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
                  <tr key={dep.uid}
                    className={`border-b last:border-0 ${
                      dep.state === "ERROR" ? "bg-red-50"
                      : dep.state === "BUILDING" || dep.state === "INITIALIZING" ? "bg-yellow-50"
                      : "hover:bg-gray-50"
                    }`}>
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
                        <a href={`https://${dep.url}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">Ver →</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Sprint History ── */}
      <div>
        <SectionLabel>Histórico — 12 Sprints Concluídas</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SPRINTS.map((s) => (
            <div key={s.num} className="bg-white rounded-xl shadow-sm border border-l-4 border-l-green-400 p-4 flex gap-3">
              <div className="shrink-0 mt-0.5">
                <span className="text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 whitespace-nowrap">
                  Sprint {s.num}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-tight">{s.title}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.items.map((item) => (
                    <span key={item} className="text-xs bg-green-50 text-green-700 rounded px-1.5 py-0.5">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Roadmap ── */}
      <div>
        <SectionLabel>Roadmap — {totalPending} Itens Pendentes</SectionLabel>
        <div className="space-y-8">
          {ROADMAP.map((theme) => (
            <div key={theme.theme}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`${theme.color} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                  {theme.theme}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {theme.items.map((item) => (
                  <div key={item.title} className="bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${item.priorityColor}`}>
                        {item.priority}
                      </span>
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
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        Busca Leilões Caixa · BLC — Dashboard interno · Dados ao vivo do GitHub e Vercel
      </p>
    </div>
  );
}
