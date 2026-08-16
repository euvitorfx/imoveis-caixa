"use client";

import { useState, useEffect } from "react";

const ESTADOS: Record<string, string> = {
  AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia",
  CE:"Ceará", DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás",
  MA:"Maranhão", MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso",
  PA:"Pará", PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná",
  RJ:"Rio de Janeiro", RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima",
  RS:"Rio Grande do Sul", SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo",
  TO:"Tocantins",
};

type Prefs = { brasil: boolean; estados: string[]; cidades: string[]; alertas?: boolean };

export default function PreferenciasForm({ inicial }: { inicial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(inicial);
  const [cidadesMap, setCidadesMap] = useState<Record<string, string[]>>({});
  const [expandido, setExpandido] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!prefs.brasil) {
      fetch("/cidades.json")
        .then((r) => r.json())
        .then(setCidadesMap)
        .catch(() => {});
    }
  }, [prefs.brasil]);

  function toggleEstado(uf: string) {
    setPrefs((p) => {
      const estados = p.estados.includes(uf)
        ? p.estados.filter((e) => e !== uf)
        : [...p.estados, uf];
      // Remove cidades do estado desmarcado
      const cidades = p.cidades.filter((c) => {
        const [, estado] = c.split("|");
        return estados.includes(estado);
      });
      return { ...p, estados, cidades };
    });
    if (!prefs.estados.includes(uf)) setExpandido(uf);
  }

  function toggleCidade(cidade: string, uf: string) {
    const key = `${cidade}|${uf}`;
    setPrefs((p) => ({
      ...p,
      cidades: p.cidades.includes(key)
        ? p.cidades.filter((c) => c !== key)
        : [...p.cidades, key],
    }));
  }

  async function salvar() {
    setSalvando(true);
    setMsg("");
    const res = await fetch("/api/perfil/preferencias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSalvando(false);
    setMsg(res.ok ? "Preferências salvas!" : "Erro ao salvar.");
    setTimeout(() => setMsg(""), 3000);
  }

  const cidadesDoEstado = (uf: string): string[] => cidadesMap[uf] ?? [];
  const cidadesSelecionadas = (uf: string) =>
    prefs.cidades.filter((c) => c.endsWith(`|${uf}`)).length;

  return (
    <div className="space-y-4">
      {/* Todo o Brasil */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={prefs.brasil}
          onChange={(e) => setPrefs((p) => ({ ...p, brasil: e.target.checked, estados: [], cidades: [] }))}
          className="w-4 h-4 rounded accent-amber-500"
        />
        <span className="text-sm font-medium text-gray-700">Todo o Brasil</span>
        <span className="text-xs text-gray-400">(sem filtro de localização)</span>
      </label>

      {/* Seleção por estado */}
      {!prefs.brasil && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Selecione os estados e, opcionalmente, as cidades específicas:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {Object.entries(ESTADOS).map(([uf, nome]) => (
              <div key={uf} className="rounded-xl border border-gray-100 overflow-hidden">
                {/* Estado */}
                <label className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors ${
                  prefs.estados.includes(uf) ? "bg-blue-50" : "hover:bg-gray-50"
                }`}>
                  <input
                    type="checkbox"
                    checked={prefs.estados.includes(uf)}
                    onChange={() => toggleEstado(uf)}
                    className="w-3.5 h-3.5 rounded accent-blue-600 flex-shrink-0"
                  />
                  <span className="text-xs font-semibold text-gray-700">{uf}</span>
                  <span className="text-xs text-gray-400 truncate">{nome}</span>
                  {cidadesSelecionadas(uf) > 0 && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-1.5 rounded-full flex-shrink-0">
                      {cidadesSelecionadas(uf)}
                    </span>
                  )}
                </label>

                {/* Cidades do estado (expandível) */}
                {prefs.estados.includes(uf) && cidadesDoEstado(uf).length > 0 && (
                  <div className="border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setExpandido(expandido === uf ? null : uf)}
                      className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {expandido === uf ? "▲ Recolher cidades" : `▼ Filtrar por cidade (${cidadesDoEstado(uf).length})`}
                    </button>
                    {expandido === uf && (
                      <div className="max-h-40 overflow-y-auto px-3 pb-2 space-y-0.5 bg-white">
                        {cidadesSelecionadas(uf) > 0 && (
                          <p className="text-xs text-gray-400 py-1">
                            {cidadesSelecionadas(uf) === 0
                              ? "Todas as cidades do estado"
                              : `${cidadesSelecionadas(uf)} cidade(s) selecionada(s)`}
                          </p>
                        )}
                        {cidadesDoEstado(uf).map((cidade) => {
                          const key = `${cidade}|${uf}`;
                          return (
                            <label key={cidade} className="flex items-center gap-2 py-0.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={prefs.cidades.includes(key)}
                                onChange={() => toggleCidade(cidade, uf)}
                                className="w-3 h-3 accent-blue-600"
                              />
                              <span className="text-xs text-gray-600 capitalize">
                                {cidade.charAt(0) + cidade.slice(1).toLowerCase()}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {prefs.estados.length > 0 && (
            <p className="text-xs text-gray-400">
              {prefs.cidades.length === 0
                ? `Todos os imóveis de ${prefs.estados.join(", ")} serão incluídos nos seus alertas.`
                : `${prefs.cidades.length} cidade(s) selecionada(s).`}
            </p>
          )}
        </div>
      )}

      {/* Toggle de alertas por e-mail */}
      <label className="flex items-center gap-3 cursor-pointer select-none pt-2 border-t border-gray-100">
        <input
          type="checkbox"
          checked={prefs.alertas !== false}
          onChange={(e) => setPrefs((p) => ({ ...p, alertas: e.target.checked }))}
          className="w-4 h-4 rounded accent-amber-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">Receber alertas por e-mail</span>
          <p className="text-xs text-gray-400 mt-0.5">
            Notificações diárias de novos imóveis na sua região
          </p>
        </div>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando || (!prefs.brasil && prefs.estados.length === 0)}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
        >
          {salvando ? "Salvando..." : "Salvar preferências"}
        </button>
        {msg && (
          <span className={`text-xs font-medium ${msg.includes("Erro") ? "text-red-500" : "text-green-600"}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
