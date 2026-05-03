"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export default function Filtros() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [estado,     setEstado]     = useState(searchParams.get("estado")     || "");
  const [cidade,     setCidade]     = useState(searchParams.get("cidade")     || "");
  const [tipo,       setTipo]       = useState(searchParams.get("tipo")       || "");
  const [modalidade, setModalidade] = useState(searchParams.get("modalidade") || "");
  const [precoMin,   setPrecoMin]   = useState(searchParams.get("precoMin")   || "");
  const [precoMax,   setPrecoMax]   = useState(searchParams.get("precoMax")   || "");
  const [quartos,    setQuartos]    = useState(searchParams.get("quartos")    || "");
  const [finan,      setFinan]      = useState(searchParams.get("financiamento") || "");

  const [cidades,    setCidades]    = useState<string[]>([]);
  const [tipos,      setTipos]      = useState<string[]>([]);
  const [modalidades,setModalidades]= useState<string[]>([]);

  useEffect(() => {
    const url = estado ? `/api/filtros?estado=${estado}` : "/api/filtros";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setCidades(d.cidades    || []);
        setTipos(d.tipos        || []);
        setModalidades(d.modalidades || []);
      });
  }, [estado]);

  const apply = useCallback(() => {
    const p = new URLSearchParams();
    if (estado)     p.set("estado",     estado);
    if (cidade)     p.set("cidade",     cidade);
    if (tipo)       p.set("tipo",       tipo);
    if (modalidade) p.set("modalidade", modalidade);
    if (precoMin)   p.set("precoMin",   precoMin);
    if (precoMax)   p.set("precoMax",   precoMax);
    if (quartos)    p.set("quartos",    quartos);
    if (finan)      p.set("financiamento", finan);
    router.push(`/?${p.toString()}`);
  }, [estado, cidade, tipo, modalidade, precoMin, precoMax, quartos, finan, router]);

  const clear = () => {
    setEstado(""); setCidade(""); setTipo(""); setModalidade("");
    setPrecoMin(""); setPrecoMax(""); setQuartos(""); setFinan("");
    router.push("/");
  };

  const sel = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const inp = sel;

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Filtros</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">

        <select className={sel} value={estado} onChange={(e) => { setEstado(e.target.value); setCidade(""); }}>
          <option value="">Estado</option>
          {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>

        <select className={sel} value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={!cidades.length}>
          <option value="">Cidade</option>
          {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Tipo</option>
          {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select className={sel} value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
          <option value="">Modalidade</option>
          {modalidades.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <input
          type="number" placeholder="Preço mín R$" className={inp}
          value={precoMin} onChange={(e) => setPrecoMin(e.target.value)}
        />
        <input
          type="number" placeholder="Preço máx R$" className={inp}
          value={precoMax} onChange={(e) => setPrecoMax(e.target.value)}
        />

        <select className={sel} value={quartos} onChange={(e) => setQuartos(e.target.value)}>
          <option value="">Quartos</option>
          {[1,2,3,4].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>

        <select className={sel} value={finan} onChange={(e) => setFinan(e.target.value)}>
          <option value="">Financiamento</option>
          <option value="sim">Aceita</option>
        </select>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={apply}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Buscar
        </button>
        <button
          onClick={clear}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm underline"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
