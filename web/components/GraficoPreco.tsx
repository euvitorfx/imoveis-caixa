"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Ponto {
  data: string;
  preco: number;
}

interface Props {
  historico: Ponto[];
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function GraficoPreco({ historico }: Props) {
  if (historico.length < 2) return null;

  const data = historico.map((p) => ({ ...p, dataFmt: fmtData(p.data) }));
  const precos = historico.map((p) => p.preco);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const variacao = ((precos[precos.length - 1] - precos[0]) / precos[0]) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Evolução do preço</h2>
        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${variacao < 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {variacao < 0 ? "▼" : "▲"} {Math.abs(variacao).toFixed(1)}%
        </span>
      </div>

      <div className="flex gap-4 text-xs text-gray-500 mb-3">
        <span>Mínimo: <strong className="text-green-600">{fmt(min)}</strong></span>
        <span>Máximo: <strong className="text-gray-700">{fmt(max)}</strong></span>
        <span>{historico.length} registros</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="dataFmt" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            width={60}
          />
          <Tooltip
            formatter={(v) => [fmt(Number(v)), "Preço"]}
            labelFormatter={(l) => `Data: ${l}`}
          />
          <Line
            type="monotone"
            dataKey="preco"
            stroke="#1e3a5f"
            strokeWidth={2}
            dot={{ r: 3, fill: "#1e3a5f" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
