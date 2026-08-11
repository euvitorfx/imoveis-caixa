"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Imovel } from "@/lib/types";

// ── Clube BLC: conteúdo pré-escrito ──────────────────────────────────────────

const ROTEIRO = `ROTEIRO PARA VÍDEO — CLUBE BLC (~65 segundos)

[CENA 1 — HOOK | 0–5s]
"Você sabia que pode comprar um imóvel da Caixa… e ainda receber dinheiro de volta?"

[CENA 2 — CONTEXTO | 5–15s]
"Com mais de 25 mil imóveis disponíveis em todo o Brasil, a Caixa oferece oportunidades incríveis em Venda Online e Venda Direta. Mas poucos compradores sabem que existe uma forma de turbinar ainda mais esse negócio."

[CENA 3 — SOLUÇÃO | 15–22s]
"Apresentando o Clube BLC — o programa de cashback exclusivo para compradores de imóveis da Caixa."

[CENA 4 — COMO FUNCIONA | 22–52s]
"São apenas 3 passos:"

"Passo 1: Acesse buscaleiloescaixa.com.br e encontre o imóvel ideal entre mais de 25 mil opções em todo o Brasil."

"Passo 2: Ao preencher a proposta no site da Caixa, INDIQUE O ASSESSOR PARCEIRO BLC. Esse é o passo mais importante."

"Passo 3: Finalize a compra, acompanhe cada etapa no nosso dashboard exclusivo, e receba o seu cashback na conta."

[CENA 5 — BENEFÍCIOS | 52–60s]
"De 0,5% a 1% de cashback sobre o valor do imóvel. Em um imóvel de R$ 500 mil, isso é até R$ 5.000 de volta. Completamente grátis. Sem taxa. Sem mensalidade."

[CENA 6 — CTA | 60–65s]
"Acesse buscaleiloescaixa.com.br e comece agora. O link está na bio!"

─────────────────────────────────────────
NOTAS DE PRODUÇÃO:
• Fundo: imagens de imóveis brasileiros modernos
• Música: trilha leve, otimista, sem letra
• Legenda: texto em branco com sombra sobre as imagens
• CTA final: mostrar o site na tela
─────────────────────────────────────────`;

const COPY_INSTAGRAM = `📍 COMPROU IMÓVEL DA CAIXA? VOCÊ PODE RECEBER DINHEIRO DE VOLTA!

Apresentando o #ClubeBLC — o programa de cashback para compradores de imóveis da Caixa Econômica Federal.

🏠 Como funciona em 3 passos simples:

🔍 PASSO 1 — Encontre seu imóvel
Acesse buscaleiloescaixa.com.br e filtre entre +25 mil imóveis disponíveis em todo o Brasil. Casas, apartamentos, terrenos em Venda Online e Venda Direta.

🤝 PASSO 2 — Indique o assessor parceiro
Ao preencher a proposta no site da Caixa, indique o ASSESSOR PARCEIRO BLC. Simples assim.

💰 PASSO 3 — Receba o cashback
Após a conclusão da compra, acompanhe o processo no nosso dashboard exclusivo e receba seu cashback direto na conta.

━━━━━━━━━━━━━━━━━━━━
💸 SEUS BENEFÍCIOS:
✅ De 0,5% a 1% de cashback sobre o valor do imóvel
✅ Num imóvel de R$ 500.000 → até R$ 5.000 de volta
✅ Atendimento personalizado com assessor parceiro
✅ Dashboard exclusivo para acompanhar cada etapa
━━━━━━━━━━━━━━━━━━━━

🆓 GRÁTIS — Sem taxa de adesão. Sem mensalidade.

⚠️ Modalidades elegíveis: Venda Online e Venda Direta
(Leilão não participa do programa)

📲 Link na bio para buscar imóveis e se cadastrar agora!

#ClubeBLC #ImoveisCaixa #Cashback #LeilãoCaixa #VendaOnlineCaixa #VendaDiretaCaixa #ImóvelBarato #InvestimentoImobiliário #BuscaLeiloesCaixa #CaixaEconomica #ComprarImovel #FinanciamentoImobiliario #FGTS`;

const COPY_TIKTOK = `🚨 COMPROU IMÓVEL DA CAIXA? VOCÊ DEIXOU DINHEIRO NA MESA 🚨

Existe um programa que te devolve até 1% do valor do imóvel e quase ninguém sabe ☠️

Chama CLUBE BLC e é ASSIM ó 👇

PASSO 1 ➡️ Busca em buscaleiloescaixa.com.br
(+25 MIL opções em todo Brasil 🇧🇷)

PASSO 2 ➡️ Indica o assessor parceiro BLC na proposta da Caixa 🤝

PASSO 3 ➡️ Fecha a compra e recebe o cashback 💸

Num imóvel de R$ 500k → ATÉ R$ 5.000 DE VOLTA
É GRÁTIS. SEM TAXA. SEM ENROLAÇÃO. ✅

Segue pra não perder as próximas oportunidades 👆

#ClubeBLC #ImoveisCaixa #Cashback #ImóvelBarato`;

// ── Ferramentas de vídeo IA ──────────────────────────────────────────────────

const VIDEO_TOOLS = [
  {
    nome: "HeyGen",
    desc: "Avatar IA com voz realista. Ideal para apresentador falando para câmera.",
    url: "https://www.heygen.com",
    badge: "Avatar IA",
    cor: "#7C3AED",
  },
  {
    nome: "Runway ML",
    desc: "Gera cenas de vídeo a partir de texto e imagens estáticas.",
    url: "https://runwayml.com",
    badge: "Texto → Vídeo",
    cor: "#0891B2",
  },
  {
    nome: "D-ID",
    desc: "Transforma fotos em apresentadores falantes com voz sintética.",
    url: "https://www.d-id.com",
    badge: "Foto → Vídeo",
    cor: "#059669",
  },
  {
    nome: "Synthesia",
    desc: "Vídeos corporativos com avatares profissionais e multilíngue.",
    url: "https://www.synthesia.io",
    badge: "Corporativo",
    cor: "#DC2626",
  },
];

// ── Utilitários ──────────────────────────────────────────────────────────────

function fmtPreco(v: number | null) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
        ok
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {ok ? "✓ Copiado!" : "Copiar"}
    </button>
  );
}

// ── Tipos ────────────────────────────────────────────────────────────────────

type ClubeTab = "roteiro" | "instagram" | "tiktok";
type CopyData = { instagram: string; tiktok: string };

// ── Página ───────────────────────────────────────────────────────────────────

export default function AdminSocialPage() {
  const router = useRouter();

  // Clube BLC state
  const [clubeTab, setClubeTab] = useState<ClubeTab>("roteiro");
  const [roteiro, setRoteiro] = useState(ROTEIRO);
  const [insta, setInsta] = useState(COPY_INSTAGRAM);
  const [tiktok, setTiktok] = useState(COPY_TIKTOK);

  // Imóveis state
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loadingImoveis, setLoadingImoveis] = useState(true);
  const [gerando, setGerando] = useState<Record<string, boolean>>({});
  const [copies, setCopies] = useState<Record<string, CopyData>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [copyTab, setCopyTab] = useState<Record<string, "instagram" | "tiktok">>({});

  useEffect(() => {
    fetch("/api/admin/social/imoveis")
      .then((r) => {
        if (!r.ok) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setImoveis(data);
        setLoadingImoveis(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function gerarCopy(imovel: Imovel) {
    setGerando((p) => ({ ...p, [imovel.hdnImovel]: true }));
    setAberto(imovel.hdnImovel);
    setCopyTab((p) => ({ ...p, [imovel.hdnImovel]: "instagram" }));
    try {
      const res = await fetch("/api/admin/social/gerar-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imovel }),
      });
      const data: CopyData = await res.json();
      setCopies((p) => ({ ...p, [imovel.hdnImovel]: data }));
    } finally {
      setGerando((p) => ({ ...p, [imovel.hdnImovel]: false }));
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <a href="/admin" className="hover:text-gray-600 transition-colors">Admin</a>
            <span>/</span>
            <span className="text-gray-700 font-medium">Social Média</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📱 Social Média
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Roteiros, copies e geração de conteúdo para Instagram e TikTok
          </p>
        </div>
        <a
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border rounded-lg transition-colors"
        >
          ← Voltar
        </a>
      </div>

      {/* ── SEÇÃO 1: Clube BLC ── */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            style={{ backgroundColor: "#F59E0B", color: "#1C1917" }}
          >
            BLC
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Clube BLC</h2>
            <p className="text-xs text-gray-400">
              Roteiro e copies prontos para o lançamento do Clube — edite à vontade
            </p>
          </div>
        </div>

        {/* Sub-tabs Clube */}
        <div className="flex gap-1 mb-0 border-b">
          {(["roteiro", "instagram", "tiktok"] as ClubeTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setClubeTab(t)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors ${
                clubeTab === t
                  ? "border-amber-500 text-amber-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "roteiro" ? "🎬 Roteiro" : t === "instagram" ? "📸 Instagram" : "🎵 TikTok / Reels"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-b-xl rounded-tr-xl border border-t-0 shadow-sm p-5">
          {clubeTab === "roteiro" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Roteiro para vídeo</span>
                  <span className="ml-2 text-xs text-gray-400">~65 segundos — ideal para Reels e TikTok</span>
                </div>
                <CopyBtn text={roteiro} />
              </div>
              <textarea
                value={roteiro}
                onChange={(e) => setRoteiro(e.target.value)}
                rows={22}
                className="w-full text-sm text-gray-700 font-mono leading-relaxed border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y bg-gray-50"
              />
            </>
          )}

          {clubeTab === "instagram" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Post para feed</span>
                  <span className="ml-2 text-xs text-gray-400">{insta.length} chars</span>
                </div>
                <CopyBtn text={insta} />
              </div>
              <textarea
                value={insta}
                onChange={(e) => setInsta(e.target.value)}
                rows={22}
                className="w-full text-sm text-gray-700 leading-relaxed border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y bg-gray-50"
              />
            </>
          )}

          {clubeTab === "tiktok" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">TikTok / Reels</span>
                  <span className="ml-2 text-xs text-gray-400">{tiktok.length} chars</span>
                </div>
                <CopyBtn text={tiktok} />
              </div>
              <textarea
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                rows={14}
                className="w-full text-sm text-gray-700 leading-relaxed border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y bg-gray-50"
              />
            </>
          )}
        </div>

        {/* Ferramentas de vídeo IA */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ferramentas IA para criar o vídeo
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {VIDEO_TOOLS.map((tool) => (
              <a
                key={tool.nome}
                href={tool.url}
                target="_blank"
                rel="noreferrer"
                className="bg-white border rounded-xl p-3 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-gray-800 group-hover:underline">
                    {tool.nome}
                  </span>
                  <span className="text-gray-400 text-xs">↗</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug mb-2.5">{tool.desc}</p>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: tool.cor + "15", color: tool.cor }}
                >
                  {tool.badge}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 2: Imóveis para Redes ── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: "#01304D" }}
          >
            🏠
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Imóveis para Redes Sociais</h2>
            <p className="text-xs text-gray-400">
              Selecione um imóvel e gere copy para Instagram + TikTok com IA
            </p>
          </div>
        </div>

        {loadingImoveis ? (
          <div className="text-gray-400 text-center py-16">Carregando imóveis...</div>
        ) : imoveis.length === 0 ? (
          <div className="text-gray-400 text-center py-16">Nenhum imóvel com foto encontrado.</div>
        ) : (
          <div className="space-y-3">
            {imoveis.map((imovel) => {
              const copy = copies[imovel.hdnImovel];
              const isGerando = gerando[imovel.hdnImovel];
              const isAberto = aberto === imovel.hdnImovel;
              const tab = copyTab[imovel.hdnImovel] ?? "instagram";

              return (
                <div key={imovel.hdnImovel} className="bg-white rounded-xl border shadow-sm overflow-hidden">

                  {/* Linha do imóvel */}
                  <div className="flex items-center gap-4 p-4">
                    {imovel.fotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imovel.fotoUrl}
                        alt=""
                        className="w-20 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {imovel.tipo && (
                          <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {imovel.tipo}
                          </span>
                        )}
                        <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {imovel.modalidade}
                        </span>
                        {imovel.financiamento?.toLowerCase().includes("sim") && (
                          <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                            Financiamento
                          </span>
                        )}
                        {imovel.fgts && (
                          <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                            FGTS
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {imovel.cidade}, {imovel.estado}
                        {imovel.bairro ? ` — ${imovel.bairro}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-sm font-bold" style={{ color: "#01304D" }}>
                          {fmtPreco(imovel.preco)}
                        </span>
                        {imovel.areaTotal && (
                          <span className="text-xs text-gray-400">{imovel.areaTotal}m²</span>
                        )}
                        {imovel.quartos && (
                          <span className="text-xs text-gray-400">{imovel.quartos} quartos</span>
                        )}
                        {imovel.vagas && (
                          <span className="text-xs text-gray-400">{imovel.vagas} vagas</span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                      {!copy ? (
                        <button
                          onClick={() => gerarCopy(imovel)}
                          disabled={isGerando}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
                          style={{ backgroundColor: "#01304D" }}
                        >
                          {isGerando ? (
                            <span className="flex items-center gap-1.5">
                              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              Gerando...
                            </span>
                          ) : (
                            "✦ Gerar Copy"
                          )}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setAberto(isAberto ? null : imovel.hdnImovel)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                            style={{ borderColor: "#01304D", color: "#01304D" }}
                          >
                            {isAberto ? "Fechar" : "Ver copy"}
                          </button>
                          <button
                            onClick={() => gerarCopy(imovel)}
                            disabled={isGerando}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {isGerando ? "..." : "↺ Regerar"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Copy gerada */}
                  {isAberto && copy && (
                    <div className="border-t bg-gray-50 p-4">
                      {/* Sub-tabs copy */}
                      <div className="flex gap-1 mb-3 border-b border-gray-200">
                        {(["instagram", "tiktok"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setCopyTab((p) => ({ ...p, [imovel.hdnImovel]: t }))}
                            className={`px-3 py-1.5 text-xs font-medium -mb-px border-b-2 transition-colors ${
                              tab === t
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            {t === "instagram" ? "📸 Instagram" : "🎵 TikTok / Reels"}
                          </button>
                        ))}
                      </div>

                      {tab === "instagram" && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">{copy.instagram.length} chars</span>
                            <CopyBtn text={copy.instagram} />
                          </div>
                          <textarea
                            value={copy.instagram}
                            onChange={(e) =>
                              setCopies((p) => ({
                                ...p,
                                [imovel.hdnImovel]: { ...copy, instagram: e.target.value },
                              }))
                            }
                            rows={10}
                            className="w-full text-sm text-gray-700 border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                          />
                        </div>
                      )}

                      {tab === "tiktok" && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">{copy.tiktok.length} chars</span>
                            <CopyBtn text={copy.tiktok} />
                          </div>
                          <textarea
                            value={copy.tiktok}
                            onChange={(e) =>
                              setCopies((p) => ({
                                ...p,
                                [imovel.hdnImovel]: { ...copy, tiktok: e.target.value },
                              }))
                            }
                            rows={7}
                            className="w-full text-sm text-gray-700 border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
