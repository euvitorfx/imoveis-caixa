"use client";

import { useEffect, useState } from "react";
import type { Afiliado, ComissaoAfiliado, ReferidoLGPD } from "@/lib/afiliados";

const BASE = "https://www.buscaleiloescaixa.com.br";

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AfiliadoDashboard() {
  const [afiliado, setAfiliado] = useState<Afiliado | null>(null);
  const [comissoes, setComissoes] = useState<ComissaoAfiliado[]>([]);
  const [referidos, setReferidos] = useState<ReferidoLGPD[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/perfil/afiliado")
      .then((r) => r.json())
      .then(({ afiliado: a, comissoes: c, referidos: r }) => {
        setAfiliado(a);
        setComissoes(c ?? []);
        setReferidos(r ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function copiarLink() {
    if (!afiliado) return;
    navigator.clipboard.writeText(`${BASE}/?ref=${afiliado.codigo}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (loading) {
    return <p className="text-gray-400 text-sm text-center py-6">Carregando...</p>;
  }

  if (!afiliado) {
    return <p className="text-gray-400 text-sm text-center py-6">Dados não encontrados.</p>;
  }

  const totalPendente = comissoes
    .filter((c) => c.status === "pendente")
    .reduce((s, c) => s + c.valorAfiliado, 0);

  const totalPago = comissoes
    .filter((c) => c.status === "pago")
    .reduce((s, c) => s + c.valorAfiliado, 0);

  const linkAfiliado = `${BASE}/?ref=${afiliado.codigo}`;

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-gray-800 mb-1">Programa de Afiliados</h2>
        <p className="text-xs text-gray-400">
          Compartilhe seu link e ganhe {afiliado.percentualComissao}% da comissão BLC a cada imóvel arrematado pelos seus indicados.
        </p>
      </div>

      {/* Link de afiliado */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Seu link de indicação</p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 overflow-x-auto whitespace-nowrap">
            {linkAfiliado}
          </code>
          <button
            onClick={copiarLink}
            className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: copiado ? "#D1FAE5" : "#01304D",
              color: copiado ? "#065F46" : "#ffffff",
            }}
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Código: <span className="font-mono font-semibold">{afiliado.codigo}</span>
        </p>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-700 mb-1">A receber</p>
          <p className="text-xl font-bold text-amber-600">{fmtMoeda(totalPendente)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs text-green-700 mb-1">Já recebido</p>
          <p className="text-xl font-bold text-green-600">{fmtMoeda(totalPago)}</p>
        </div>
      </div>

      {/* Comissões */}
      {comissoes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3">Comissões</p>
          <div className="space-y-2">
            {comissoes.map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-700">{fmtMoeda(c.valorAfiliado)}</p>
                  <p className="text-xs text-gray-400">{fmtData(c.criadoEm)} · {c.percentual}% da comissão BLC</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.status === "pago"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {c.status === "pago" ? "Pago" : "Pendente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicados — LGPD compliant */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">
          Indicados ({referidos.length})
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Por privacidade, exibimos apenas iniciais e informações básicas dos usuários indicados.
        </p>
        {referidos.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-xl">
            Nenhum cadastro via seu link ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {referidos.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: "#01304D" }}
                >
                  {r.iniciais}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">Usuário {r.iniciais}</p>
                  <p className="text-xs text-gray-400">Cadastrado em {fmtData(r.cadastradoEm)}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    r.temProcessoAtivo
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {r.temProcessoAtivo ? "Processo ativo" : "Sem processo"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info pagamento */}
      <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
        Os pagamentos são realizados manualmente pela equipe BLC após confirmação. Entre em contato pelo e-mail <strong>contato@buscaleiloescaixa.com.br</strong> para dúvidas.
      </p>
    </div>
  );
}
