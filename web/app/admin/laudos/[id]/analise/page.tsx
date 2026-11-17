"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Laudo } from "@/lib/laudos-types";
import type { AnaliseMatricula } from "@/lib/analise-matricula";

type Estado = "idle" | "loading" | "done" | "error";

export default function AnalisePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [laudo, setLaudo] = useState<Laudo | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");
  const [analise, setAnalise] = useState<AnaliseMatricula | null>(null);
  const [erro, setErro] = useState<string>("");

  useEffect(() => {
    fetch(`/api/laudos/${id}`)
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => d && setLaudo(d))
      .catch(() => setErro("Falha ao carregar laudo."));
  }, [id, router]);

  const analisar = useCallback(async () => {
    setEstado("loading");
    setErro("");
    try {
      const res = await fetch(`/api/admin/laudos/${id}/analisar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      setAnalise(data.analise as AnaliseMatricula);
      setEstado("done");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setEstado("error");
    }
  }, [id]);

  if (!laudo) {
    return (
      <div className="p-8 text-center text-gray-500">
        {erro ? <p className="text-red-600">{erro}</p> : <p>Carregando laudo…</p>}
      </div>
    );
  }

  const hasMatricula = !!(laudo.imovelData?.matriculaUrl);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:underline mb-2 block"
          >
            ← Voltar
          </button>
          <h1 className="text-xl font-bold text-navy-900">Análise Automática</h1>
          <p className="text-sm text-gray-500 mt-1">Laudo #{laudo.numero ?? id.slice(-6)}</p>
          <p className="text-sm text-gray-700 mt-1 font-medium">{laudo.imovelDescricao}</p>
        </div>

        <button
          onClick={analisar}
          disabled={estado === "loading" || !hasMatricula}
          className="
            flex-shrink-0 px-5 py-2.5 rounded-lg font-semibold text-sm
            bg-amber-500 text-navy-900 hover:bg-amber-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {estado === "loading" ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Analisando…
            </span>
          ) : (
            "Analisar Matrícula"
          )}
        </button>
      </div>

      {!hasMatricula && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Este imóvel não tem PDF de matrícula cadastrado na base de dados.
        </div>
      )}

      {estado === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Resultado */}
      {analise && (
        <div className="space-y-6">
          {/* Alertas */}
          {analise.alertas.length > 0 && (
            <section>
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Alertas</h2>
              <div className="space-y-2">
                {analise.alertas.map((a, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 p-3 rounded-lg text-sm border ${
                      a.gravidade === "critico"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : a.gravidade === "alto"
                        ? "bg-orange-50 border-orange-200 text-orange-800"
                        : a.gravidade === "medio"
                        ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                        : "bg-blue-50 border-blue-200 text-blue-800"
                    }`}
                  >
                    <span className="font-bold uppercase text-xs mt-0.5 w-14 flex-shrink-0">
                      {a.gravidade}
                    </span>
                    <span>{a.descricao}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Identificação */}
          <section className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
            <Field label="Matrícula" value={analise.numeroMatricula} />
            <Field label="Cartório" value={analise.cartorio} />
            <Field label="Município" value={analise.municipio} />
            <Field label="Área" value={analise.area} />
            <Field label="Titular atual" value={analise.titularAtual} className="col-span-2" />
            <Field label="Endereço" value={analise.endereco} className="col-span-2" />
          </section>

          {/* Pessoas */}
          {analise.pessoas.length > 0 && (
            <section>
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">
                Pessoas ({analise.pessoas.length})
              </h2>
              <div className="space-y-1">
                {analise.pessoas.map((p, i) => (
                  <div key={i} className="flex gap-4 text-sm bg-white border border-gray-200 rounded px-3 py-2">
                    <span className="font-medium flex-1">{p.nome}</span>
                    {p.cpf && <span className="text-gray-500 font-mono">{p.cpf}</span>}
                    {p.qualificacao && (
                      <span className="text-xs text-gray-400 italic">{p.qualificacao}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gravames */}
          {analise.gravames.length > 0 && (
            <section>
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">
                Gravames ({analise.gravames.length})
              </h2>
              <div className="space-y-2">
                {analise.gravames.map((g, i) => (
                  <div
                    key={i}
                    className={`text-sm border rounded-lg p-3 ${
                      g.status === "ativo"
                        ? "bg-red-50 border-red-200"
                        : g.status === "cancelado"
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between gap-2 mb-1">
                      <span className="font-semibold">{g.tipo}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          g.status === "ativo"
                            ? "bg-red-100 text-red-700"
                            : g.status === "cancelado"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                    <p className="text-gray-700">{g.descricao}</p>
                    {g.credor && <p className="text-gray-500 text-xs mt-1">Credor: {g.credor}</p>}
                    {g.dataRegistro && (
                      <p className="text-gray-400 text-xs">Data: {g.dataRegistro}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Alienação fiduciária */}
          {analise.alienacaoFiduciaria && (
            <section className="bg-gray-50 rounded-lg p-4 text-sm">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">
                Alienação Fiduciária
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Registrada"
                  value={analise.alienacaoFiduciaria.registrada ? "Sim" : "Não"}
                />
                <Field
                  label="Consolidada"
                  value={analise.alienacaoFiduciaria.consolidada ? "Sim" : "Não"}
                />
                <Field label="Credor" value={analise.alienacaoFiduciaria.credor} />
                <Field
                  label="Data de consolidação"
                  value={analise.alienacaoFiduciaria.dataConsolidacao}
                />
                {analise.alienacaoFiduciaria.observacoes && (
                  <Field
                    label="Observações"
                    value={analise.alienacaoFiduciaria.observacoes}
                    className="col-span-2"
                  />
                )}
              </div>
            </section>
          )}

          {/* Atos registrais */}
          {analise.atos.length > 0 && (
            <section>
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">
                Atos Registrais ({analise.atos.length})
              </h2>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm">
                {analise.atos.map((a, i) => (
                  <div key={i} className="px-3 py-2.5">
                    <div className="flex gap-3 items-baseline">
                      <span className="font-mono font-bold text-gray-700 w-14 flex-shrink-0">
                        {a.identificador}
                      </span>
                      <span className="text-gray-500 text-xs">{a.tipo}</span>
                      {a.data && (
                        <span className="text-gray-400 text-xs ml-auto">{a.data}</span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1 ml-14">{a.descricao}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Resumo salvo */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-500">
                Resultado salvo nos blocos
              </h2>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✓ Automático
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-2 text-gray-700">Bloco: Matrícula</h3>
                <pre className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">
                  {analise.resumoMatricula}
                </pre>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-2 text-gray-700">Bloco: Jurídico</h3>
                <pre className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">
                  {analise.resumoJuridico}
                </pre>
              </div>
            </div>
          </section>

          {/* Limitações */}
          {analise.limitacoes.length > 0 && (
            <section>
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">
                Limitações da análise
              </h2>
              <ul className="text-sm text-gray-500 space-y-1">
                {analise.limitacoes.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-gray-300">•</span>
                    {l}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Custo da análise */}
      {analise?.uso && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500 flex gap-6 flex-wrap">
          <span>
            Modelo: <strong className="text-gray-700">{analise.uso.modelo}</strong>
          </span>
          <span>
            Tokens entrada: <strong className="text-gray-700">{analise.uso.inputTokens.toLocaleString("pt-BR")}</strong>
          </span>
          <span>
            Tokens saída: <strong className="text-gray-700">{analise.uso.outputTokens.toLocaleString("pt-BR")}</strong>
          </span>
          <span>
            Custo:{" "}
            <strong className="text-gray-700">
              US$ {analise.uso.custoUSD.toFixed(4)}
              {" "}
              <span className="text-gray-400 font-normal">
                (≈ R$ {(analise.uso.custoUSD * 5.5).toFixed(2)})
              </span>
            </strong>
          </span>
        </div>
      )}

      {/* Estado idle — instrução */}
      {estado === "idle" && hasMatricula && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Clique em <strong className="text-gray-600">Analisar Matrícula</strong> para iniciar.
          <br />
          A análise leva entre 15 e 60 segundos.
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={className}>
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-gray-800 font-medium mt-0.5">{value}</dd>
    </div>
  );
}
