"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { DadosAnalise, ResultadoAnalise, AnaliseViabilidade, DADOS_PADRAO, calcular, calcularLanceMaximo, brl } from "@/lib/analises";
import ModalCompletarCadastro from "@/components/ModalCompletarCadastro";

interface Taxas {
  cdi: number;
  ipca: number;
  ibovespa: number;
  ifix: number;
  atualizadoEm: string | null;
}

// ── helpers ────────────────────────────────────────────────────────────────
function n(v: number | string): number {
  const r = parseFloat(String(v));
  return isNaN(r) ? 0 : r;
}

function pct(label: string, field: keyof DadosAnalise, base: number, dados: DadosAnalise, set: Setter) {
  const val = dados[field] as number;
  const calc = base * (val / 100);
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex items-center border rounded-lg overflow-hidden flex-1">
          <input
            type="number" min="0" step="0.1"
            value={val || ""}
            onChange={(e) => set(field, n(e.target.value))}
            className="flex-1 px-3 py-2 text-sm outline-none w-0"
          />
          <span className="px-2 text-xs text-gray-400 bg-gray-50 border-l h-full flex items-center">%</span>
        </div>
        {base > 0 && (
          <span className="text-xs text-gray-400 whitespace-nowrap">{brl(calc)}</span>
        )}
      </div>
    </div>
  );
}

function val(label: string, field: keyof DadosAnalise, dados: DadosAnalise, set: Setter, hint?: string) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="flex items-center border rounded-lg overflow-hidden">
        <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r flex items-center h-full">R$</span>
        <input
          type="number" min="0" step="0.01"
          value={(dados[field] as number) || ""}
          onChange={(e) => set(field, n(e.target.value))}
          className="flex-1 px-3 py-2 text-sm outline-none w-0"
        />
      </div>
    </div>
  );
}

type Setter = (field: keyof DadosAnalise, value: number | string) => void;

// ── Modal favoritos ────────────────────────────────────────────────────────
interface FavImovel {
  hdnImovel: string;
  endereco: string;
  cidade: string;
  estado: string;
  tipo?: string;
  preco: number | null;
  precoAval: number | null;
  fotoUrl?: string;
}

function ModalFavoritos({
  onSelect, onClose,
}: {
  onSelect: (im: FavImovel) => void;
  onClose: () => void;
}) {
  const [lista, setLista] = useState<FavImovel[] | null>(null);
  const [erro, setErro] = useState("");

  useState(() => {
    fetch("/api/analises/favoritos")
      .then((r) => r.json())
      .then(setLista)
      .catch(() => setErro("Não foi possível carregar os favoritos."));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-800">Importar de favoritos</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {lista === null && !erro && (
            <p className="text-sm text-gray-400 text-center py-10">Carregando...</p>
          )}
          {erro && <p className="text-sm text-red-500 text-center py-10">{erro}</p>}
          {lista?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">Nenhum imóvel favoritado ainda.</p>
          )}
          {lista?.map((im) => (
            <button
              key={im.hdnImovel}
              onClick={() => { onSelect(im); onClose(); }}
              className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors"
            >
              <p className="text-sm font-semibold text-gray-800 truncate">
                {im.tipo ? `${im.tipo} · ` : ""}{im.endereco || im.cidade}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {im.cidade}/{im.estado}
                {im.preco ? ` · Lance: ${brl(im.preco)}` : ""}
                {im.precoAval ? ` · Avaliação: ${brl(im.precoAval)}` : ""}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tooltip customizado do gráfico de ROI ─────────────────────────────────
function RoiTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { lucro: number; roi: number } }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const roiMensal = payload[0]?.value ?? 0;
  const roiTotal  = payload[0]?.payload?.roi ?? 0;
  const lucro     = payload[0]?.payload?.lucro ?? 0;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-400 mb-1">Mês {label}</p>
      <p className={`font-bold tabular-nums text-sm ${roiMensal >= 0 ? "text-green-700" : "text-red-600"}`}>
        {roiMensal >= 0 ? "+" : ""}{roiMensal.toFixed(2)}% por mês
      </p>
      <p className="text-gray-400 tabular-nums text-[11px]">ROI total: {roiTotal >= 0 ? "+" : ""}{roiTotal.toFixed(2)}%</p>
      <p className={`tabular-nums mt-0.5 ${lucro >= 0 ? "text-green-600" : "text-red-500"}`}>{brl(lucro)}</p>
    </div>
  );
}

// ── Donut helper ───────────────────────────────────────────────────────────
function buildDonutPaths(slices: { value: number; color: string }[]) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return { paths: [] as { d: string; color: string; pct: number }[], total: 0 };
  const cx = 56, cy = 56, R = 44, ri = 27;
  let angle = -Math.PI / 2;
  const paths = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total;
      const a = frac * 2 * Math.PI;
      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
      const x2 = cx + R * Math.cos(angle + a), y2 = cy + R * Math.sin(angle + a);
      const xi1 = cx + ri * Math.cos(angle), yi1 = cy + ri * Math.sin(angle);
      const xi2 = cx + ri * Math.cos(angle + a), yi2 = cy + ri * Math.sin(angle + a);
      const large = a > Math.PI ? 1 : 0;
      const d = `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${xi2.toFixed(1)},${yi2.toFixed(1)} A${ri},${ri} 0 ${large},0 ${xi1.toFixed(1)},${yi1.toFixed(1)} Z`;
      angle += a;
      return { d, color: s.color, pct: Math.round(frac * 100) };
    });
  return { paths, total };
}

// ── Painel de resultados ───────────────────────────────────────────────────
function PainelResultados({ r, meses, taxas, dados }: { r: ResultadoAnalise; meses: number; taxas: Taxas | null; dados: DadosAnalise }) {
  const lucro = r.lucroLiquido;
  const positivo = lucro >= 0;

  const linha = (label: string, valor: number, destaque?: boolean, negativo?: boolean) => (
    <div className={`flex justify-between items-center py-1.5 ${destaque ? "border-t border-gray-200 mt-1 pt-2.5" : ""}`}>
      <span className={`text-xs ${destaque ? "font-semibold text-gray-700" : "text-gray-500"}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${negativo ? "text-red-600" : destaque ? "text-gray-800" : "text-gray-700"}`}>
        {brl(valor)}
      </span>
    </div>
  );

  // ROI sobre capital total despendido (para comparação justa com índices)
  const roiSobreTotal = r.totalDespesas > 0 ? (r.lucroLiquido / r.totalDespesas) * 100 : 0;

  function retornoIndicePct(taxaAnual: number): number {
    if (meses <= 0) return 0;
    return (Math.pow(1 + taxaAnual / 100, meses / 12) - 1) * 100;
  }

  // Ponto de equilíbrio: venda mínima onde lucroLíquido = 0
  // saldoPosVenda = venda*(1-percCorretor/100); IR=0 no breakeven; logo venda*(1-perc)=totalDespesas
  const breakeven = dados.percCorretor < 100
    ? r.totalDespesas / (1 - dados.percCorretor / 100)
    : 0;
  const margemSeguranca = dados.valorVenda > 0 ? dados.valorVenda - breakeven : 0;
  const margemPct = dados.valorVenda > 0 ? (margemSeguranca / dados.valorVenda) * 100 : 0;

  // Donut: composição de todos os custos/deduções (reforma separada da aquisição)
  const donutSlices = [
    { label: "Aquisição", value: r.totalAquisicao - dados.reforma, color: "#01304D" },
    { label: "Reforma", value: dados.reforma, color: "#EF4444" },
    { label: "Manutenção", value: r.totalManutencao, color: "#F59E0B" },
    { label: "Corretagem", value: r.corretagem, color: "#3B82F6" },
    { label: "IR", value: r.ir, color: "#9CA3AF" },
  ];
  const { paths: donutPaths, total: donutTotal } = buildDonutPaths(
    donutSlices.map((s) => ({ value: s.value, color: s.color }))
  );

  const chartData = r.roiPorMes.map((p) => ({
    ...p,
    roi: parseFloat(p.roi.toFixed(2)),
    roiMensal: parseFloat((p.roi / p.mes).toFixed(2)),
  }));
  const breakevenMes = chartData.find((d) => d.roi >= 0)?.mes ?? null;

  const indices = taxas
    ? [
        { label: "CDI / SELIC", pct: retornoIndicePct(taxas.cdi), nota: `${taxas.cdi.toFixed(1)}% a.a.` },
        { label: "IPCA", pct: retornoIndicePct(taxas.ipca), nota: `${taxas.ipca.toFixed(1)}% a.a.` },
        { label: "Ibovespa", pct: retornoIndicePct(taxas.ibovespa), nota: "média 5 anos" },
        { label: "IFIX", pct: retornoIndicePct(taxas.ifix), nota: "média 5 anos" },
      ]
    : [];

  const maxROI = indices.length > 0
    ? Math.max(Math.abs(roiSobreTotal), ...indices.map((i) => i.pct), 0.01)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow border p-5 space-y-5">
      {/* Lucro destaque */}
      <div className={`rounded-xl p-4 text-center ${positivo ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: positivo ? "#065F46" : "#991B1B" }}>
          Lucro Líquido
        </p>
        <p className={`text-3xl font-extrabold tabular-nums ${positivo ? "text-green-700" : "text-red-700"}`}>
          {brl(lucro)}
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <span className={`text-xs font-semibold ${positivo ? "text-green-600" : "text-red-600"}`}>
            ROI {r.roi.toFixed(2)}%
          </span>
          {meses > 0 && (
            <span className="text-xs text-gray-500">
              {r.roiMensal.toFixed(2)}%/mês
            </span>
          )}
        </div>
      </div>

      {/* Ponto de equilíbrio */}
      {breakeven > 0 && (
        <div className="rounded-xl bg-[#F0F6FF] border border-blue-100 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-1.5">Ponto de equilíbrio</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tabular-nums text-[#01304D]">{brl(breakeven)}</span>
            <span className="text-xs text-gray-400">venda mínima sem prejuízo</span>
          </div>
          {dados.valorVenda > 0 && (
            <p className={`text-xs mt-1 font-medium ${margemSeguranca >= 0 ? "text-green-600" : "text-red-500"}`}>
              {margemSeguranca >= 0
                ? `Margem de segurança: ${brl(margemSeguranca)} (${margemPct.toFixed(1)}%)`
                : `Venda projetada abaixo do breakeven em ${brl(Math.abs(margemSeguranca))}`}
            </p>
          )}
        </div>
      )}

      {/* Breakdown */}
      <div>
        {linha("Total Aquisição", r.totalAquisicao)}
        {linha("Total Manutenção", r.totalManutencao)}
        {linha("Total Despesas", r.totalDespesas, true)}
        {linha("Corretagem", r.corretagem)}
        {linha("Saldo Bruto", r.saldoPosVenda)}
        {linha("IR (15%)", r.ir, false, true)}
        {linha("Lucro Líquido", r.lucroLiquido, true)}
      </div>

      {/* Composição dos custos — donut */}
      {donutTotal > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Composição dos custos</p>
          <div className="flex items-center gap-4">
            <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true" className="flex-shrink-0">
              {donutPaths.map((p, i) => (
                <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2" />
              ))}
            </svg>
            <div className="flex flex-col gap-2 flex-1">
              {donutSlices
                .filter((s) => s.value > 0)
                .map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-gray-500 flex-1">{s.label}</span>
                    <span className="text-xs font-semibold tabular-nums text-gray-700">
                      {donutTotal > 0 ? Math.round((s.value / donutTotal) * 100) : 0}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Comparação com índices financeiros — barras visuais */}
      {taxas && r.totalDespesas > 0 && meses > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">vs. Mercado Financeiro</p>
            <span className="text-[10px] text-gray-300">{meses} meses</span>
          </div>
          <div className="space-y-3">
            {/* Imóvel */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-semibold text-[#01304D]">★ Este imóvel</span>
                <span className={`text-xs font-bold tabular-nums ${positivo ? "text-green-700" : "text-red-600"}`}>
                  {roiSobreTotal.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, (Math.abs(roiSobreTotal) / maxROI) * 100))}%`,
                    background: "#01304D",
                  }}
                />
              </div>
            </div>
            {indices.map((idx) => {
              const bate = roiSobreTotal > idx.pct;
              return (
                <div key={idx.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-gray-500">
                      <span className={`text-[10px] mr-1 ${bate ? "text-green-500" : "text-red-400"}`}>
                        {bate ? "▲" : "▼"}
                      </span>
                      {idx.label}
                    </span>
                    <span className="text-xs tabular-nums text-gray-400">{idx.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, (idx.pct / maxROI) * 100))}%`,
                        background: bate ? "#BBF7D0" : "#FECACA",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-gray-300">Ibovespa e IFIX: médias históricas 5 anos</p>
          </div>
        </div>
      )}

      {/* ROI chart */}
      {chartData.length > 1 && (
        <div>
          <div className="flex items-baseline justify-between mb-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Lucro médio por mês
            </p>
            {breakevenMes && breakevenMes > 1 && (
              <span className="text-[10px] text-green-500">positivo a partir do mês {breakevenMes}</span>
            )}
          </div>
          <p className="text-[10px] text-gray-300 mb-3">% de lucro por mês na média até aquele prazo</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="roiAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={positivo ? "#16A34A" : "#DC2626"} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={positivo ? "#16A34A" : "#DC2626"} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(v) => `${v}m`}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
              />
              <Tooltip content={<RoiTooltip />} />
              <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="roiMensal"
                dot={false}
                strokeWidth={2}
                stroke={positivo ? "#16A34A" : "#DC2626"}
                fill="url(#roiAreaFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Resumo mês 1 vs mês alvo */}
          <div className="flex justify-between text-[10px] mt-1 px-1">
            <div className="text-gray-400">
              <span className="font-medium">Mês 1:</span>{" "}
              <span className={chartData[0]?.roiMensal >= 0 ? "text-green-600" : "text-red-500"}>
                {chartData[0]?.roiMensal >= 0 ? "+" : ""}{chartData[0]?.roiMensal.toFixed(2)}%/mês
              </span>
            </div>
            <div className="text-right font-medium text-[#01304D]">
              <span>Mês {dados.mesesAteVenda}:</span>{" "}
              <span className={chartData[chartData.length - 1]?.roiMensal >= 0 ? "text-green-600" : "text-red-500"}>
                {chartData[chartData.length - 1]?.roiMensal >= 0 ? "+" : ""}
                {chartData[chartData.length - 1]?.roiMensal.toFixed(2)}%/mês
              </span>
              {" "}· {brl(chartData[chartData.length - 1]?.lucro ?? 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Form section ───────────────────────────────────────────────────────────
function Secao({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border p-5 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
interface Props {
  inicial?: Partial<AnaliseViabilidade>;
  analiseId?: string;
}

export default function AnaliseForm({ inicial, analiseId }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [dados, setDados] = useState<DadosAnalise>({
    ...DADOS_PADRAO,
    ...inicial?.dados,
    nome: inicial?.dados?.nome ?? inicial?.nome ?? "",
  });
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [imovelRef, setImovelRef] = useState(inicial?.imovelRef ?? null as AnaliseViabilidade["imovelRef"] | null);
  const [showFav, setShowFav] = useState(false);
  const [showModalTelefone, setShowModalTelefone] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [roiAlvo, setRoiAlvo] = useState(30);
  const [taxas, setTaxas] = useState<Taxas | null>(null);

  useEffect(() => {
    fetch("/api/analises/taxas").then((r) => r.json()).then(setTaxas).catch(() => {});
  }, []);

  const resultado: ResultadoAnalise = calcular(dados);
  const lanceMaximo = calcularLanceMaximo(dados, roiAlvo);

  const set: Setter = useCallback((field, value) => {
    setDados((p) => ({ ...p, [field]: value }));
  }, []);

  function importarFavorito(im: FavImovel) {
    setDados((p) => ({
      ...p,
      valorAvaliacao: im.precoAval ?? p.valorAvaliacao,
      lanceInicial: im.preco ?? p.lanceInicial,
      valorCompra: im.preco ?? p.valorCompra,
    }));
    setImovelRef({ hdnImovel: im.hdnImovel, endereco: im.endereco, cidade: im.cidade, estado: im.estado });
    if (!nome) setNome(`${im.tipo || "Imóvel"} · ${im.cidade}/${im.estado}`);
  }

  async function salvar() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!session?.user?.temTelefone) {
      setShowModalTelefone(true);
      return;
    }
    setSalvando(true);
    setErro("");
    setMsg("");
    try {
      const body = { nome: nome || "Análise sem nome", imovelRef, dados };
      let res: Response;
      if (analiseId) {
        res = await fetch(`/api/analises/${analiseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/analises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao salvar."); return; }
      setMsg("✓ Análise salva com sucesso!");
      if (!analiseId && data._id) router.replace(`/ferramentas/viabilidade/${data._id}`);
    } finally {
      setSalvando(false);
    }
  }

  function exportarXLS() {
    import("xlsx").then((XLSX) => {
      const r = resultado;
      const rows: (string | number | null)[][] = [
        ["PLANILHA DE ANÁLISE DE VIABILIDADE"],
        ["Análise:", nome || "Sem nome"],
        imovelRef ? ["Imóvel:", `${imovelRef.endereco} — ${imovelRef.cidade}/${imovelRef.estado}`] : [],
        [],
        ["DADOS DO IMÓVEL", "", "VALOR (R$)"],
        ["Valor de Avaliação", "", dados.valorAvaliacao],
        ["Valor de Mercado", "", dados.valorMercado],
        ["Lance Inicial", "", dados.lanceInicial],
        [],
        ["DESPESAS DE AQUISIÇÃO", "%", "VALOR (R$)"],
        ["Arrematação / Compra", "", dados.valorCompra],
        ["Leiloeiro", dados.percLeiloeiro / 100, r.leiloeiro],
        ["Condomínio (dívida)", "", dados.dividaCondominio],
        ["IPTU", "", dados.iptu],
        ["Escritura", dados.percEscritura / 100, r.escritura],
        ["ITBI", dados.percITBI / 100, r.itbi],
        ["Registro", dados.percRegistro / 100, r.registro],
        ["Imissão na Posse", "", dados.imissaoPosse],
        ["Reforma / Reparos", "", dados.reforma],
        ["Área não averbada", "", dados.areaNaoAverbada],
        ["Contabilidade", "", dados.contabilidade],
        ["Anúncios Pagos", "", dados.anunciosPagos],
        ["TOTAL AQUISIÇÃO", "", r.totalAquisicao],
        [],
        ["DESPESAS DE MANUTENÇÃO", "Meses", "VALOR (R$)"],
        ["Condomínio mensal", dados.mesesAteVenda, dados.condominioMensal * dados.mesesAteVenda],
        ["Energia mensal", dados.mesesAteVenda, dados.energiaMensal * dados.mesesAteVenda],
        ["Água mensal", dados.mesesAteVenda, dados.aguaMensal * dados.mesesAteVenda],
        ["TOTAL MANUTENÇÃO", "", r.totalManutencao],
        [],
        ["TOTAL DESPESAS", "", r.totalDespesas],
        [],
        ["VENDA", "%", "VALOR (R$)"],
        ["Valor de Venda", "", dados.valorVenda],
        ["Corretagem", dados.percCorretor / 100, r.corretagem],
        ["Saldo Pós Venda (Bruto)", "", r.saldoPosVenda],
        ["IR", dados.percIR / 100, r.ir],
        ["LUCRO LÍQUIDO", "", r.lucroLiquido],
        [],
        ["ROI (%)", "", r.roi / 100],
        ["ROI mensal (%)", "", r.roiMensal / 100],
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 35 }, { wch: 10 }, { wch: 18 }];

      // Formatar células de moeda e %
      const moedaFmt = 'R$ #,##0.00';
      const pctFmt = '0.00%';
      rows.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          if (typeof cell === "number") {
            const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
            if (!ws[addr]) return;
            ws[addr].z = ci === 1 ? pctFmt : moedaFmt;
          }
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Análise de Viabilidade");
      XLSX.writeFile(wb, `analise-${(nome || "viabilidade").replace(/\s+/g, "-").toLowerCase()}.xlsx`);
    });
  }

  const autenticado = status === "authenticated";
  const plano = (session?.user as { plano?: string })?.plano ?? "gratuito";

  return (
    <div className="max-w-6xl mx-auto">
      {showModalTelefone && <ModalCompletarCadastro onClose={() => setShowModalTelefone(false)} />}
      {/* Barra superior */}
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Nome da análise…"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full text-xl font-bold text-gray-800 border-0 border-b-2 border-gray-200 focus:border-blue-500 outline-none pb-1 bg-transparent placeholder:text-gray-300"
          />
          {imovelRef && (
            <p className="text-xs text-gray-400 mt-1">
              📍 {imovelRef.endereco} · {imovelRef.cidade}/{imovelRef.estado}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFav(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ⭐ Importar favorito
          </button>
          <button
            onClick={exportarXLS}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ↓ Exportar XLS
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg text-white font-semibold transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#01304D" }}
          >
            {salvando ? "Salvando…" : analiseId ? "Atualizar" : "Salvar"}
          </button>
        </div>
      </div>

      {msg && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{msg}</p>}
      {erro && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{erro}</p>}

      {!autenticado && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          ⚠️ <a href="/login" className="underline font-semibold">Faça login</a> para salvar suas análises.
        </div>
      )}

      {autenticado && plano === "gratuito" && !analiseId && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          Plano gratuito: até 1 análise salva. <a href="/perfil" className="underline font-semibold">Upgrade para Premium</a> para ilimitadas.
        </div>
      )}

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* Formulário (3/5) */}
        <div className="lg:col-span-3 space-y-4">

          {/* Dados do imóvel */}
          <Secao title="Dados do Imóvel">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {val("Valor de Avaliação (Caixa)", "valorAvaliacao", dados, set)}
              {val("Valor de Mercado", "valorMercado", dados, set, "Estimativa de mercado")}
              {val("Lance Inicial / Compra", "lanceInicial", dados, set)}
            </div>
            {/* Lance Máximo por ROI Alvo */}
            <div className="flex flex-wrap items-center gap-2 mt-1 bg-[#F0F6FF] border border-blue-100 rounded-xl px-4 py-2.5">
              <span className="text-xs text-blue-600 font-medium">Para ROI de</span>
              <input
                type="number" min="0" max="200" step="1"
                value={roiAlvo}
                onChange={(e) => setRoiAlvo(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-14 text-center text-xs font-semibold border border-blue-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-blue-400"
              />
              <span className="text-xs text-blue-600 font-medium">% →</span>
              <span className="text-xs text-blue-500">lance máximo:</span>
              <span className="text-sm font-bold text-[#01304D] tabular-nums">
                {dados.valorVenda > 0 ? brl(lanceMaximo) : "—"}
              </span>
              <span className="text-[10px] text-blue-300 ml-auto">com os % configurados abaixo</span>
            </div>
          </Secao>

          {/* Despesas de aquisição */}
          <Secao title="Despesas de Aquisição">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {val("Arrematação / Valor pago", "valorCompra", dados, set)}
              {pct("Comissão do Leiloeiro", "percLeiloeiro", dados.valorCompra, dados, set)}
              {val("Condomínio (dívida)", "dividaCondominio", dados, set)}
              {val("IPTU", "iptu", dados, set)}
              {pct("Escritura", "percEscritura", dados.valorCompra, dados, set)}
              {pct("ITBI", "percITBI", dados.valorCompra, dados, set)}
              {pct("Registro", "percRegistro", dados.valorCompra, dados, set)}
              {val("Imissão na Posse / Custas", "imissaoPosse", dados, set)}
              {val("Reforma / Reparos", "reforma", dados, set)}
              {val("Área não averbada", "areaNaoAverbada", dados, set)}
              {val("Contabilidade", "contabilidade", dados, set)}
              {val("Anúncios Pagos", "anunciosPagos", dados, set)}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Aquisição</span>
              <span className="font-bold text-gray-800">{brl(resultado.totalAquisicao)}</span>
            </div>
          </Secao>

          {/* Manutenção */}
          <Secao title="Despesas de Manutenção (até a venda)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Meses até a venda</label>
                <input
                  type="number" min="1" max="120" step="1"
                  value={dados.mesesAteVenda || ""}
                  onChange={(e) => set("mesesAteVenda", n(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              {val("Condomínio / mês", "condominioMensal", dados, set)}
              {val("Energia / mês", "energiaMensal", dados, set)}
              {val("Água / mês", "aguaMensal", dados, set)}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Total Manutenção ({dados.mesesAteVenda} meses)
              </span>
              <span className="font-bold text-gray-800">{brl(resultado.totalManutencao)}</span>
            </div>
          </Secao>

          {/* Venda */}
          <Secao title="Projeção de Venda">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {val("Valor de Venda", "valorVenda", dados, set)}
              {pct("Corretagem", "percCorretor", dados.valorVenda, dados, set)}
              {pct("Imposto de Renda", "percIR", resultado.saldoPosVenda > 0 ? resultado.saldoPosVenda : 0, dados, set)}
            </div>
          </Secao>

        </div>

        {/* Painel de resultados (2/5, sticky) */}
        <div className="lg:col-span-2 lg:sticky lg:top-4">
          <PainelResultados r={resultado} meses={dados.mesesAteVenda} taxas={taxas} dados={dados} />
        </div>
      </div>

      {showFav && (
        <ModalFavoritos onSelect={importarFavorito} onClose={() => setShowFav(false)} />
      )}
    </div>
  );
}
