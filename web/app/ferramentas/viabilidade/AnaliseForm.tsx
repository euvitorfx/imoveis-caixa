"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
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

// ── Painel de resultados ───────────────────────────────────────────────────
function PainelResultados({ r, meses, taxas }: { r: ResultadoAnalise; meses: number; taxas: Taxas | null }) {
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

  const chartData = r.roiPorMes.map((p) => ({ ...p, roi: parseFloat(p.roi.toFixed(2)) }));

  const indices = taxas
    ? [
        { label: "CDI / SELIC", pct: retornoIndicePct(taxas.cdi), nota: `${taxas.cdi.toFixed(1)}% a.a.` },
        { label: "IPCA", pct: retornoIndicePct(taxas.ipca), nota: `${taxas.ipca.toFixed(1)}% a.a.` },
        { label: "Ibovespa", pct: retornoIndicePct(taxas.ibovespa), nota: "média 5 anos" },
        { label: "IFIX", pct: retornoIndicePct(taxas.ifix), nota: "média 5 anos" },
      ]
    : [];

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

      {/* Comparação com índices financeiros */}
      {taxas && r.totalDespesas > 0 && meses > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">vs. Mercado Financeiro</p>
            <span className="text-[10px] text-gray-400">{meses} meses</span>
          </div>
          <div className="space-y-1 text-xs">
            {/* Imóvel */}
            <div className="flex items-center gap-2 py-1.5 border-b border-gray-100">
              <span className="w-4 text-center font-bold text-[#01304D]">★</span>
              <span className="flex-1 font-semibold text-gray-700">Este imóvel</span>
              <span className="tabular-nums font-bold" style={{ color: roiSobreTotal >= 0 ? "#16A34A" : "#DC2626" }}>
                {roiSobreTotal.toFixed(1)}%
              </span>
              <span className="tabular-nums text-gray-400 w-24 text-right">{brl(lucro)}</span>
            </div>
            {indices.map((idx) => {
              const retorno = idx.pct;
              const valor = r.totalDespesas * retorno / 100;
              const bate = roiSobreTotal > retorno;
              return (
                <div key={idx.label} className="flex items-center gap-2 py-1">
                  <span className={`w-4 text-center text-[10px] ${bate ? "text-green-500" : "text-red-400"}`}>
                    {bate ? "▲" : "▼"}
                  </span>
                  <span className="flex-1 text-gray-600">{idx.label}</span>
                  <span className="tabular-nums text-gray-500">{retorno.toFixed(1)}%</span>
                  <span className="tabular-nums text-gray-400 w-24 text-right">{brl(valor)}</span>
                </div>
              );
            })}
            <p className="text-[10px] text-gray-300 pt-1">
              Capital: {brl(r.totalDespesas)} · Ibovespa e IFIX: médias históricas 5 anos
            </p>
          </div>
        </div>
      )}

      {/* ROI chart */}
      {chartData.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ROI por mês</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(2)}%`, "ROI"]}
                labelFormatter={(l) => `Mês ${l}`}
                contentStyle={{ fontSize: 11 }}
              />
              <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="3 3" />
              <Line
                type="monotone" dataKey="roi" dot={false} strokeWidth={2}
                stroke={positivo ? "#16A34A" : "#DC2626"}
              />
            </LineChart>
          </ResponsiveContainer>
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
          <PainelResultados r={resultado} meses={dados.mesesAteVenda} taxas={taxas} />
        </div>
      </div>

      {showFav && (
        <ModalFavoritos onSelect={importarFavorito} onClose={() => setShowFav(false)} />
      )}
    </div>
  );
}
