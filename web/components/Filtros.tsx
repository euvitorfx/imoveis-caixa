"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export default function Filtros() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [estado,     setEstado]     = useState(searchParams.get("estado")        || "");
  const [cidade,     setCidade]     = useState(searchParams.get("cidade")        || "");
  const [bairro,     setBairro]     = useState(searchParams.get("bairro")        || "");
  const [endereco,   setEndereco]   = useState(searchParams.get("endereco")      || "");
  const [tipo,       setTipo]       = useState(searchParams.get("tipo")          || "");
  const [modalidade, setModalidade] = useState(searchParams.get("modalidade")    || "");
  const [precoMin,   setPrecoMin]   = useState(searchParams.get("precoMin")      || "");
  const [precoMax,   setPrecoMax]   = useState(searchParams.get("precoMax")      || "");
  const [areaMin,    setAreaMin]    = useState(searchParams.get("areaMin")       || "");
  const [areaMax,    setAreaMax]    = useState(searchParams.get("areaMax")       || "");
  const [quartos,    setQuartos]    = useState(searchParams.get("quartos")       || "");
  const [vagas,      setVagas]      = useState(searchParams.get("vagas")         || "");
  const [suites,     setSuites]     = useState(searchParams.get("suites")        || "");
  const [ocupacao,   setOcupacao]   = useState(searchParams.get("ocupacao")      || "");
  const [fgts,         setFgts]         = useState(searchParams.get("fgts")            || "");
  const [leilaoAgend,  setLeilaoAgend]  = useState(searchParams.get("leilaoAgendado")  || "");
  const [finan,        setFinan]        = useState(searchParams.get("financiamento")   || "");
  const [desconto,   setDesconto]   = useState(searchParams.get("descontoMin")   || "");
  const [ordenar,    setOrdenar]    = useState(searchParams.get("ordenar")       || "preco_asc");

  const [cidades,    setCidades]    = useState<string[]>([]);
  const [bairros,    setBairros]    = useState<string[]>([]);
  const [tipos,      setTipos]      = useState<string[]>([]);
  const [modalidades,setModalidades]= useState<string[]>([]);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (estado) qs.set("estado", estado);
    if (cidade) qs.set("cidade", cidade);
    fetch(`/api/filtros?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setCidades(d.cidades     || []);
        setBairros(d.bairros     || []);
        setTipos(d.tipos         || []);
        setModalidades(d.modalidades || []);
      });
  }, [estado, cidade]);

  const apply = useCallback(() => {
    const p = new URLSearchParams();
    if (estado)     p.set("estado",        estado);
    if (cidade)     p.set("cidade",        cidade);
    if (bairro)     p.set("bairro",        bairro);
    if (endereco)   p.set("endereco",      endereco);
    if (tipo)       p.set("tipo",          tipo);
    if (modalidade) p.set("modalidade",    modalidade);
    if (precoMin)   p.set("precoMin",      precoMin);
    if (precoMax)   p.set("precoMax",      precoMax);
    if (areaMin)    p.set("areaMin",       areaMin);
    if (areaMax)    p.set("areaMax",       areaMax);
    if (quartos)    p.set("quartos",       quartos);
    if (vagas)      p.set("vagas",         vagas);
    if (suites)     p.set("suites",        suites);
    if (ocupacao)   p.set("ocupacao",      ocupacao);
    if (fgts)         p.set("fgts",            fgts);
    if (leilaoAgend)  p.set("leilaoAgendado", leilaoAgend);
    if (finan)        p.set("financiamento",  finan);
    if (desconto)   p.set("descontoMin",   desconto);
    if (ordenar)    p.set("ordenar",       ordenar);
    router.push(`${pathname}?${p.toString()}`);
  }, [estado, cidade, bairro, endereco, tipo, modalidade, precoMin, precoMax, areaMin, areaMax, quartos, vagas, suites, ocupacao, fgts, leilaoAgend, finan, desconto, ordenar, router, pathname]);

  const clear = () => {
    setEstado(""); setCidade(""); setBairro(""); setEndereco(""); setTipo(""); setModalidade("");
    setPrecoMin(""); setPrecoMax(""); setAreaMin(""); setAreaMax("");
    setQuartos(""); setVagas(""); setSuites(""); setOcupacao(""); setFgts("");
    setLeilaoAgend(""); setFinan(""); setDesconto(""); setOrdenar("preco_asc");
    router.push(pathname);
  };

  const sel = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const inp = sel;

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Filtros</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">

        <select className={sel} value={estado} onChange={(e) => { setEstado(e.target.value); setCidade(""); setBairro(""); }}>
          <option value="">Estado</option>
          {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>

        <select className={sel} value={cidade} onChange={(e) => { setCidade(e.target.value); setBairro(""); }} disabled={!cidades.length}>
          <option value="">Cidade</option>
          {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className={sel} value={bairro} onChange={(e) => setBairro(e.target.value)} disabled={!bairros.length}>
          <option value="">Bairro</option>
          {bairros.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <input type="text" placeholder="Nome da rua" className={inp}
          value={endereco} onChange={(e) => setEndereco(e.target.value)} />

        <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Tipo</option>
          {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select className={sel} value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
          <option value="">Modalidade</option>
          {modalidades.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

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
        <button onClick={apply}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
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
