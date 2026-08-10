"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MultiSelect from "@/components/MultiSelect";

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const SESSION_KEY = "filtros_imoveis_v2";
const NIGHT = "#01304D";

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 20,
        padding: "3px 11px",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        border: `1px solid ${active ? NIGHT : "#D1D5DB"}`,
        backgroundColor: active ? NIGHT : "white",
        color: active ? "white" : "#6B7280",
        lineHeight: "1.6",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", color: NIGHT, opacity: 0.55, marginBottom: 8,
    }}>
      {children}
    </p>
  );
}

function toggleArr(arr: string[], val: string, set: (v: string[]) => void) {
  set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
}
function toggleStr(cur: string, val: string, set: (v: string) => void) {
  set(cur === val ? "" : val);
}

export default function Filtros() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [estado,      setEstado]     = useState<string[]>(() => { const v = searchParams.get("estado");      return v ? v.split(",").filter(Boolean) : []; });
  const [cidade,      setCidade]     = useState<string[]>(() => { const v = searchParams.get("cidade");      return v ? v.split(",").filter(Boolean) : []; });
  const [bairro,      setBairro]     = useState<string[]>(() => { const v = searchParams.get("bairro");      return v ? v.split(",").filter(Boolean) : []; });
  const [tipo,        setTipo]       = useState<string[]>(() => { const v = searchParams.get("tipo");        return v ? v.split(",").filter(Boolean) : []; });
  const [modalidade,  setModalidade] = useState<string[]>(() => { const v = searchParams.get("modalidade");  return v ? v.split(",").filter(Boolean) : []; });

  const [endereco,    setEndereco]   = useState(searchParams.get("endereco")       || "");
  const [precoMin,    setPrecoMin]   = useState(searchParams.get("precoMin")       || "");
  const [precoMax,    setPrecoMax]   = useState(searchParams.get("precoMax")       || "");
  const [areaMin,     setAreaMin]    = useState(searchParams.get("areaMin")        || "");
  const [areaMax,     setAreaMax]    = useState(searchParams.get("areaMax")        || "");
  const [quartos,     setQuartos]    = useState(searchParams.get("quartos")        || "");
  const [vagas,       setVagas]      = useState(searchParams.get("vagas")          || "");
  const [suites,      setSuites]     = useState(searchParams.get("suites")         || "");
  const [ocupacao,    setOcupacao]   = useState(searchParams.get("ocupacao")       || "");
  const [fgts,        setFgts]       = useState(searchParams.get("fgts")           || "");
  const [leilaoAgend, setLeilaoAgend]= useState(searchParams.get("leilaoAgendado") || "");
  const [finan,       setFinan]      = useState(searchParams.get("financiamento")  || "");
  const [desconto,    setDesconto]   = useState(searchParams.get("descontoMin")    || "");
  const [ordenar,     setOrdenar]    = useState(searchParams.get("ordenar")        || "preco_asc");

  const [cidades,     setCidades]    = useState<string[]>([]);
  const [bairros,     setBairros]    = useState<string[]>([]);
  const [tipos,       setTipos]      = useState<string[]>([]);
  const [modalidades, setModalidades]= useState<string[]>([]);

  const firstRender = useRef(true);

  useEffect(() => {
    if (searchParams.toString() !== "") return;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) return;
      const s = JSON.parse(saved);
      if (Array.isArray(s.estado)     && s.estado.length)     setEstado(s.estado);
      if (Array.isArray(s.cidade)     && s.cidade.length)     setCidade(s.cidade);
      if (Array.isArray(s.bairro)     && s.bairro.length)     setBairro(s.bairro);
      if (Array.isArray(s.tipo)       && s.tipo.length)       setTipo(s.tipo);
      if (Array.isArray(s.modalidade) && s.modalidade.length) setModalidade(s.modalidade);
      if (s.endereco)    setEndereco(s.endereco);
      if (s.precoMin)    setPrecoMin(s.precoMin);
      if (s.precoMax)    setPrecoMax(s.precoMax);
      if (s.areaMin)     setAreaMin(s.areaMin);
      if (s.areaMax)     setAreaMax(s.areaMax);
      if (s.quartos)     setQuartos(s.quartos);
      if (s.vagas)       setVagas(s.vagas);
      if (s.suites)      setSuites(s.suites);
      if (s.ocupacao)    setOcupacao(s.ocupacao);
      if (s.fgts)        setFgts(s.fgts);
      if (s.leilaoAgend) setLeilaoAgend(s.leilaoAgend);
      if (s.finan)       setFinan(s.finan);
      if (s.desconto)    setDesconto(s.desconto);
      if (s.ordenar)     setOrdenar(s.ordenar);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      estado, cidade, bairro, endereco, tipo, modalidade,
      precoMin, precoMax, areaMin, areaMax,
      quartos, vagas, suites, ocupacao, fgts, leilaoAgend, finan, desconto, ordenar,
    }));
  }, [estado, cidade, bairro, endereco, tipo, modalidade, precoMin, precoMax, areaMin, areaMax, quartos, vagas, suites, ocupacao, fgts, leilaoAgend, finan, desconto, ordenar]);

  const estadoKey = useMemo(() => estado.join(","), [estado]);
  const cidadeKey = useMemo(() => cidade.join(","), [cidade]);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (estadoKey) qs.set("estado", estadoKey);
    if (cidadeKey) qs.set("cidade", cidadeKey);
    fetch(`/api/filtros?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setCidades(d.cidades      || []);
        setBairros(d.bairros      || []);
        setTipos(d.tipos          || []);
        setModalidades(d.modalidades || []);
      });
  }, [estadoKey, cidadeKey]);

  const handleEstadoChange = useCallback((vals: string[]) => { setEstado(vals); setCidade([]); setBairro([]); }, []);
  const handleCidadeChange = useCallback((vals: string[]) => { setCidade(vals); setBairro([]); }, []);

  const apply = useCallback(() => {
    const p = new URLSearchParams();
    if (estado.length)     p.set("estado",         estado.join(","));
    if (cidade.length)     p.set("cidade",         cidade.join(","));
    if (bairro.length)     p.set("bairro",         bairro.join(","));
    if (endereco)          p.set("endereco",       endereco);
    if (tipo.length)       p.set("tipo",           tipo.join(","));
    if (modalidade.length) p.set("modalidade",     modalidade.join(","));
    if (precoMin)          p.set("precoMin",       precoMin);
    if (precoMax)          p.set("precoMax",       precoMax);
    if (areaMin)           p.set("areaMin",        areaMin);
    if (areaMax)           p.set("areaMax",        areaMax);
    if (quartos)           p.set("quartos",        quartos);
    if (vagas)             p.set("vagas",          vagas);
    if (suites)            p.set("suites",         suites);
    if (ocupacao)          p.set("ocupacao",       ocupacao);
    if (fgts)              p.set("fgts",           fgts);
    if (leilaoAgend)       p.set("leilaoAgendado", leilaoAgend);
    if (finan)             p.set("financiamento",  finan);
    if (desconto)          p.set("descontoMin",    desconto);
    if (ordenar)           p.set("ordenar",        ordenar);
    router.push(`${pathname}?${p.toString()}`);
  }, [estado, cidade, bairro, endereco, tipo, modalidade, precoMin, precoMax, areaMin, areaMax, quartos, vagas, suites, ocupacao, fgts, leilaoAgend, finan, desconto, ordenar, router, pathname]);

  const clear = () => {
    setEstado([]); setCidade([]); setBairro([]); setEndereco("");
    setTipo([]); setModalidade([]);
    setPrecoMin(""); setPrecoMax(""); setAreaMin(""); setAreaMax("");
    setQuartos(""); setVagas(""); setSuites(""); setOcupacao(""); setFgts("");
    setLeilaoAgend(""); setFinan(""); setDesconto(""); setOrdenar("preco_asc");
    sessionStorage.removeItem(SESSION_KEY);
    router.push(pathname);
  };

  const inp = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#01304D]";

  return (
    <div className="mb-6" style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      <div className="grid grid-cols-1 md:grid-cols-2">

        {/* ── Coluna esquerda: Localização / Tipo / Modalidade ── */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-gray-100">

          {/* Localização */}
          <div className="mb-4">
            <GroupTitle>Localização</GroupTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <MultiSelect label="Estado" options={ESTADOS} value={estado} onChange={handleEstadoChange} searchable />
              <MultiSelect label="Cidade" options={cidades} value={cidade} onChange={handleCidadeChange} disabled={!cidades.length} searchable />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <MultiSelect label="Bairro" options={bairros} value={bairro} onChange={setBairro} disabled={!bairros.length} searchable />
              <input type="text" placeholder="Nome da rua" className={inp} value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
          </div>

          {/* Tipo de imóvel */}
          {tipos.length > 0 && (
            <div className="mb-4">
              <GroupTitle>Tipo de imóvel</GroupTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tipos.map((t) => (
                  <Chip key={t} label={t} active={tipo.includes(t)} onClick={() => toggleArr(tipo, t, setTipo)} />
                ))}
              </div>
            </div>
          )}

          {/* Modalidade */}
          {modalidades.length > 0 && (
            <div>
              <GroupTitle>Modalidade</GroupTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {modalidades.map((m) => (
                  <Chip key={m} label={m} active={modalidade.includes(m)} onClick={() => toggleArr(modalidade, m, setModalidade)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Coluna direita: Valores / Características / Condições ── */}
        <div className="p-4">

          {/* Preço */}
          <div className="mb-4">
            <GroupTitle>Preço</GroupTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="number" placeholder="Mín R$" className={inp} value={precoMin} onChange={(e) => setPrecoMin(e.target.value)} />
              <input type="number" placeholder="Máx R$" className={inp} value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} />
            </div>
          </div>

          {/* Área */}
          <div className="mb-4">
            <GroupTitle>Área m²</GroupTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="number" placeholder="Mín m²" className={inp} value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />
              <input type="number" placeholder="Máx m²" className={inp} value={areaMax} onChange={(e) => setAreaMax(e.target.value)} />
            </div>
          </div>

          {/* Quartos / Vagas / Suítes */}
          <div className="mb-4">
            <GroupTitle>Quartos / Vagas / Suítes</GroupTitle>
            {([
              { label: "Quartos", val: quartos, set: setQuartos },
              { label: "Vagas",   val: vagas,   set: setVagas   },
              { label: "Suítes",  val: suites,  set: setSuites  },
            ] as const).map(({ label, val, set }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "#9CA3AF", width: 50, flexShrink: 0 }}>{label}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <Chip key={n} label={`${n}+`} active={val === String(n)} onClick={() => toggleStr(val, String(n), set)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Condições */}
          <div>
            <GroupTitle>Condições</GroupTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              <Chip label="FGTS"             active={fgts        === "sim"}        onClick={() => toggleStr(fgts,        "sim",        setFgts)}        />
              <Chip label="Financiamento"    active={finan       === "sim"}        onClick={() => toggleStr(finan,       "sim",        setFinan)}       />
              <Chip label="Desocupado"       active={ocupacao    === "Desocupado"} onClick={() => toggleStr(ocupacao,    "Desocupado", setOcupacao)}    />
              <Chip label="Leilão agendado"  active={leilaoAgend === "sim"}        onClick={() => toggleStr(leilaoAgend, "sim",        setLeilaoAgend)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>Desconto mín:</span>
              {[10, 20, 30, 40, 50].map((n) => (
                <Chip key={n} label={`${n}%+`} active={desconto === String(n)} onClick={() => toggleStr(desconto, String(n), setDesconto)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer: botões + ordenar ── */}
      <div style={{ borderTop: "1px solid #E5E7EB", padding: "10px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={apply}
          className="hover:opacity-90 transition-opacity"
          style={{ backgroundColor: NIGHT, color: "white", border: "none", borderRadius: 8, padding: "7px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Buscar
        </button>
        <button
          onClick={clear}
          style={{ background: "none", border: "none", fontSize: 13, color: "#9CA3AF", textDecoration: "underline", cursor: "pointer" }}
        >
          Limpar filtros
        </button>
        <a
          href="/favoritos"
          className="hover:text-red-600 transition-colors"
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#EF4444", textDecoration: "none", marginLeft: "auto" }}
        >
          ♥ Meus favoritos
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Ordenar:</span>
          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value)}
            style={{ border: "none", fontSize: 12, color: "#374151", background: "transparent", cursor: "pointer", outline: "none" }}
          >
            <option value="preco_asc">Menor preço</option>
            <option value="preco_desc">Maior preço</option>
            <option value="desconto_desc">Maior desconto</option>
            <option value="area_desc">Maior área</option>
            <option value="leilao_prox">Leilão mais próximo</option>
            <option value="recente">Adicionado recentemente</option>
            <option value="antigo">Adicionado há mais tempo</option>
          </select>
        </div>
      </div>
    </div>
  );
}
