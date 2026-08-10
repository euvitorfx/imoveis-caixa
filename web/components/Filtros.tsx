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

export default function Filtros() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Multi-select fields (string[])
  const [estado,     setEstado]     = useState<string[]>(() => {
    const v = searchParams.get("estado");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [cidade,     setCidade]     = useState<string[]>(() => {
    const v = searchParams.get("cidade");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [bairro,     setBairro]     = useState<string[]>(() => {
    const v = searchParams.get("bairro");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [tipo,       setTipo]       = useState<string[]>(() => {
    const v = searchParams.get("tipo");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [modalidade, setModalidade] = useState<string[]>(() => {
    const v = searchParams.get("modalidade");
    return v ? v.split(",").filter(Boolean) : [];
  });

  // Single-value fields
  const [endereco,   setEndereco]   = useState(searchParams.get("endereco")      || "");
  const [precoMin,   setPrecoMin]   = useState(searchParams.get("precoMin")      || "");
  const [precoMax,   setPrecoMax]   = useState(searchParams.get("precoMax")      || "");
  const [areaMin,    setAreaMin]    = useState(searchParams.get("areaMin")       || "");
  const [areaMax,    setAreaMax]    = useState(searchParams.get("areaMax")       || "");
  const [quartos,    setQuartos]    = useState(searchParams.get("quartos")       || "");
  const [vagas,      setVagas]      = useState(searchParams.get("vagas")         || "");
  const [suites,     setSuites]     = useState(searchParams.get("suites")        || "");
  const [ocupacao,   setOcupacao]   = useState(searchParams.get("ocupacao")      || "");
  const [fgts,       setFgts]       = useState(searchParams.get("fgts")          || "");
  const [leilaoAgend,setLeilaoAgend]= useState(searchParams.get("leilaoAgendado")|| "");
  const [finan,      setFinan]      = useState(searchParams.get("financiamento") || "");
  const [desconto,   setDesconto]   = useState(searchParams.get("descontoMin")   || "");
  const [ordenar,    setOrdenar]    = useState(searchParams.get("ordenar")       || "preco_asc");

  // Dropdown option lists
  const [cidades,    setCidades]    = useState<string[]>([]);
  const [bairros,    setBairros]    = useState<string[]>([]);
  const [tipos,      setTipos]      = useState<string[]>([]);
  const [modalidades,setModalidades]= useState<string[]>([]);

  // Skip saving on first render to avoid overwriting sessionStorage before restore
  const firstRender = useRef(true);

  // Restore from sessionStorage if page loaded without URL params
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

  // Save all filters to sessionStorage whenever they change
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      estado, cidade, bairro, endereco, tipo, modalidade,
      precoMin, precoMax, areaMin, areaMax,
      quartos, vagas, suites, ocupacao, fgts, leilaoAgend, finan, desconto, ordenar,
    }));
  }, [estado, cidade, bairro, endereco, tipo, modalidade, precoMin, precoMax, areaMin, areaMax, quartos, vagas, suites, ocupacao, fgts, leilaoAgend, finan, desconto, ordenar]);

  // Stable keys for cascade effect dependencies
  const estadoKey = useMemo(() => estado.join(","), [estado]);
  const cidadeKey = useMemo(() => cidade.join(","), [cidade]);

  // Load dropdown options based on selected estado/cidade
  useEffect(() => {
    const qs = new URLSearchParams();
    if (estadoKey) qs.set("estado", estadoKey);
    if (cidadeKey) qs.set("cidade", cidadeKey);
    fetch(`/api/filtros?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setCidades(d.cidades     || []);
        setBairros(d.bairros     || []);
        setTipos(d.tipos         || []);
        setModalidades(d.modalidades || []);
      });
  }, [estadoKey, cidadeKey]);

  const handleEstadoChange = useCallback((vals: string[]) => {
    setEstado(vals);
    setCidade([]);
    setBairro([]);
  }, []);

  const handleCidadeChange = useCallback((vals: string[]) => {
    setCidade(vals);
    setBairro([]);
  }, []);

  const apply = useCallback(() => {
    const p = new URLSearchParams();
    if (estado.length)     p.set("estado",        estado.join(","));
    if (cidade.length)     p.set("cidade",        cidade.join(","));
    if (bairro.length)     p.set("bairro",        bairro.join(","));
    if (endereco)          p.set("endereco",      endereco);
    if (tipo.length)       p.set("tipo",          tipo.join(","));
    if (modalidade.length) p.set("modalidade",    modalidade.join(","));
    if (precoMin)          p.set("precoMin",      precoMin);
    if (precoMax)          p.set("precoMax",      precoMax);
    if (areaMin)           p.set("areaMin",       areaMin);
    if (areaMax)           p.set("areaMax",       areaMax);
    if (quartos)           p.set("quartos",       quartos);
    if (vagas)             p.set("vagas",         vagas);
    if (suites)            p.set("suites",        suites);
    if (ocupacao)          p.set("ocupacao",      ocupacao);
    if (fgts)              p.set("fgts",          fgts);
    if (leilaoAgend)       p.set("leilaoAgendado",leilaoAgend);
    if (finan)             p.set("financiamento", finan);
    if (desconto)          p.set("descontoMin",   desconto);
    if (ordenar)           p.set("ordenar",       ordenar);
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

  const sel = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E83A3A]";
  const inp = sel;

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <h2 className="font-semibold mb-3 text-xs uppercase tracking-widest" style={{ color: "#E83A3A" }}>Filtros</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">

        <MultiSelect
          label="Estado"
          options={ESTADOS}
          value={estado}
          onChange={handleEstadoChange}
          searchable
        />

        <MultiSelect
          label="Cidade"
          options={cidades}
          value={cidade}
          onChange={handleCidadeChange}
          disabled={!cidades.length}
          searchable
        />

        <MultiSelect
          label="Bairro"
          options={bairros}
          value={bairro}
          onChange={setBairro}
          disabled={!bairros.length}
          searchable
        />

        <input type="text" placeholder="Nome da rua" className={inp}
          value={endereco} onChange={(e) => setEndereco(e.target.value)} />

        <MultiSelect
          label="Tipo"
          options={tipos}
          value={tipo}
          onChange={setTipo}
          searchable
        />

        <MultiSelect
          label="Modalidade"
          options={modalidades}
          value={modalidade}
          onChange={setModalidade}
        />

        <input type="number" placeholder="Preço mín R$" className={inp}
          value={precoMin} onChange={(e) => setPrecoMin(e.target.value)} />
        <input type="number" placeholder="Preço máx R$" className={inp}
          value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} />

        <input type="number" placeholder="Área mín m²" className={inp}
          value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />
        <input type="number" placeholder="Área máx m²" className={inp}
          value={areaMax} onChange={(e) => setAreaMax(e.target.value)} />

        <select className={sel} value={quartos} onChange={(e) => setQuartos(e.target.value)}>
          <option value="">Quartos</option>
          {[1,2,3,4].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>

        <select className={sel} value={vagas} onChange={(e) => setVagas(e.target.value)}>
          <option value="">Vagas</option>
          {[1,2,3,4].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>

        <select className={sel} value={suites} onChange={(e) => setSuites(e.target.value)}>
          <option value="">Suítes</option>
          {[1,2,3,4].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>

        <select className={sel} value={ocupacao} onChange={(e) => setOcupacao(e.target.value)}>
          <option value="">Ocupação</option>
          <option value="Desocupado">Desocupado</option>
          <option value="Ocupado">Ocupado</option>
        </select>

        <select className={sel} value={fgts} onChange={(e) => setFgts(e.target.value)}>
          <option value="">FGTS</option>
          <option value="sim">Aceita FGTS</option>
        </select>

        <select className={sel} value={leilaoAgend} onChange={(e) => setLeilaoAgend(e.target.value)}>
          <option value="">Leilão agendado</option>
          <option value="sim">Somente com leilão</option>
        </select>

        <select className={sel} value={finan} onChange={(e) => setFinan(e.target.value)}>
          <option value="">Financiamento</option>
          <option value="sim">Aceita</option>
        </select>

        <select className={sel} value={desconto} onChange={(e) => setDesconto(e.target.value)}>
          <option value="">Desconto mín</option>
          <option value="10">Acima de 10%</option>
          <option value="20">Acima de 20%</option>
          <option value="30">Acima de 30%</option>
          <option value="40">Acima de 40%</option>
          <option value="50">Acima de 50%</option>
        </select>

        <select className={sel} value={ordenar} onChange={(e) => setOrdenar(e.target.value)}>
          <option value="preco_asc">Menor preço</option>
          <option value="preco_desc">Maior preço</option>
          <option value="desconto_desc">Maior desconto</option>
          <option value="area_desc">Maior área</option>
          <option value="leilao_prox">Leilão mais próximo</option>
          <option value="recente">Adicionado recentemente</option>
          <option value="antigo">Adicionado há mais tempo</option>
        </select>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={apply}
          className="px-5 py-2 text-white rounded-lg text-sm font-bold tracking-wide transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#E83A3A" }}
        >
          Buscar
        </button>
        <button onClick={clear}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm underline">
          Limpar
        </button>
        <a href="/favoritos"
          className="ml-auto flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors">
          <span>♥</span> Meus favoritos
        </a>
      </div>
    </div>
  );
}
