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

type Prefs = {
  brasil: boolean;
  estados: string[];
  cidades: string[];
  alertas?: boolean; // legacy
  alertas_novos_imoveis?: boolean;
  alertas_mudancas_favoritos?: boolean;
  alertas_clube_blc?: boolean;
};

export default function PreferenciasForm({ inicial }: { inicial: Prefs }) {
  // Derive initial alert values: new specific fields > legacy `alertas` > default ON
  const legacyDefault = inicial.alertas !== false;
  const [prefs, setPrefs] = useState<Prefs>({
    ...inicial,
    alertas_novos_imoveis: inicial.alertas_novos_imoveis ?? legacyDefault,
    alertas_mudancas_favoritos: inicial.alertas_mudancas_favoritos ?? legacyDefault,
    alertas_clube_blc: inicial.alertas_clube_blc ?? legacyDefault,
  });
  const [cidadesMap, setCidadesMap] = useState<Record<string, string[]>>({});
  const [expandido, setExpandido] = useState<string | null>(null);
  // States explicitly in "cidades específicas" mode
  const [modoCidades, setModoCidades] = useState<Set<string>>(
    () => new Set(
      inicial.estados.filter((uf) =>
        inicial.cidades.some((c) => c.endsWith(`|${uf}`))
      )
    )
  );
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
    const removing = prefs.estados.includes(uf);
    setPrefs((p) => {
      const estados = removing
        ? p.estados.filter((e) => e !== uf)
        : [...p.estados, uf];
      const cidades = p.cidades.filter((c) => {
        const [, estado] = c.split("|");
        return estados.includes(estado);
      });
      return { ...p, estados, cidades };
    });
    if (removing) {
      setModoCidades((s) => {
        const next = new Set(s);
        next.delete(uf);
        return next;
      });
    } else {
      setExpandido(uf);
    }
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

  function ativarModoEstado(uf: string) {
    setModoCidades((s) => {
      const next = new Set(s);
      next.delete(uf);
      return next;
    });
    setPrefs((p) => ({
      ...p,
      cidades: p.cidades.filter((c) => !c.endsWith(`|${uf}`)),
    }));
  }

  function ativarModoCidades(uf: string) {
    setModoCidades((s) => new Set([...s, uf]));
  }

  async function salvar() {
    setSalvando(true);
    setMsg("");
    const res = await fetch("/api/perfil/preferencias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brasil: prefs.brasil,
        estados: prefs.estados,
        cidades: prefs.cidades,
        alertas_novos_imoveis: prefs.alertas_novos_imoveis,
        alertas_mudancas_favoritos: prefs.alertas_mudancas_favoritos,
        alertas_clube_blc: prefs.alertas_clube_blc,
      }),
    });
    setSalvando(false);
    setMsg(res.ok ? "Preferências salvas!" : "Erro ao salvar.");
    setTimeout(() => setMsg(""), 3000);
  }

  const cidadesDoEstado = (uf: string): string[] => cidadesMap[uf] ?? [];
  const cidadesSelecionadas = (uf: string) =>
    prefs.cidades.filter((c) => c.endsWith(`|${uf}`)).length;
  const emModoCidades = (uf: string) => modoCidades.has(uf);

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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {Object.entries(ESTADOS).map(([uf, nome]) => (
              <div key={uf} className="rounded-xl border border-gray-100 overflow-hidden">
                {/* Cabeçalho do estado */}
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

                {/* Filtro de cidades (expandível) */}
                {prefs.estados.includes(uf) && cidadesDoEstado(uf).length > 0 && (
                  <div className="border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setExpandido(expandido === uf ? null : uf)}
                      className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {expandido === uf
                        ? "▲ Recolher"
                        : emModoCidades(uf)
                          ? `▼ ${cidadesSelecionadas(uf)} cidade(s) selecionada(s)`
                          : "▼ Todo o estado · refinar por cidade"}
                    </button>

                    {expandido === uf && (
                      <div className="px-3 pb-3 bg-white">
                        {/* Radio buttons de modo */}
                        <div className="space-y-2 pt-2 pb-2">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`modo-${uf}`}
                              checked={!emModoCidades(uf)}
                              onChange={() => ativarModoEstado(uf)}
                              className="w-3.5 h-3.5 mt-0.5 accent-blue-600 flex-shrink-0"
                            />
                            <div>
                              <p className="text-xs font-semibold text-gray-700">Todo o estado</p>
                              <p className="text-xs text-gray-400 leading-snug">Alertas de todos os imóveis de {nome}</p>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`modo-${uf}`}
                              checked={emModoCidades(uf)}
                              onChange={() => ativarModoCidades(uf)}
                              className="w-3.5 h-3.5 mt-0.5 accent-blue-600 flex-shrink-0"
                            />
                            <div>
                              <p className="text-xs font-semibold text-gray-700">Cidades específicas</p>
                              <p className="text-xs text-gray-400 leading-snug">Apenas imóveis das cidades marcadas</p>
                            </div>
                          </label>
                        </div>

                        {/* Lista de cidades — visível apenas no modo "cidades específicas" */}
                        {emModoCidades(uf) && (
                          <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg px-2 py-1.5 space-y-0.5 bg-gray-50">
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
                )}
              </div>
            ))}
          </div>

          {prefs.estados.length > 0 && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              {prefs.cidades.length === 0
                ? `✓ Todos os imóveis de ${prefs.estados.map((uf) => ESTADOS[uf] ?? uf).join(", ")} serão incluídos nos seus alertas.`
                : `✓ ${prefs.cidades.length} cidade(s) selecionada(s) em ${prefs.estados.length} estado(s). Apenas imóveis dessas cidades serão incluídos.`}
            </p>
          )}
        </div>
      )}

      {/* Notificações por e-mail */}
      <div className="pt-2 border-t border-gray-100 space-y-3">
        <p className="text-sm font-medium text-gray-700">Notificações por e-mail</p>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.alertas_novos_imoveis !== false}
            onChange={(e) => setPrefs((p) => ({ ...p, alertas_novos_imoveis: e.target.checked }))}
            className="w-4 h-4 mt-0.5 rounded accent-amber-500 shrink-0"
          />
          <div>
            <span className="text-sm text-gray-700">Novos imóveis nas regiões marcadas</span>
            <p className="text-xs text-gray-400 mt-0.5">
              Diário — imóveis adicionados nas últimas 24h que correspondem ao seu filtro de regiões
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.alertas_mudancas_favoritos !== false}
            onChange={(e) => setPrefs((p) => ({ ...p, alertas_mudancas_favoritos: e.target.checked }))}
            className="w-4 h-4 mt-0.5 rounded accent-amber-500 shrink-0"
          />
          <div>
            <span className="text-sm text-gray-700">Atualizações em imóveis favoritados</span>
            <p className="text-xs text-gray-400 mt-0.5">
              Quando preço, modalidade ou status de um imóvel favoritado muda
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.alertas_clube_blc !== false}
            onChange={(e) => setPrefs((p) => ({ ...p, alertas_clube_blc: e.target.checked }))}
            className="w-4 h-4 mt-0.5 rounded accent-amber-500 shrink-0"
          />
          <div>
            <span className="text-sm text-gray-700">Movimentações do Clube BLC</span>
            <p className="text-xs text-gray-400 mt-0.5">
              Atualizações do seu processo: análise, aprovação, conclusão e mensagens do assessor
            </p>
          </div>
        </label>
      </div>

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
