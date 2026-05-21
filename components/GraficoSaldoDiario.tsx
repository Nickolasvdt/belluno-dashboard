'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type Dado = {
  data: string
  fechamento: number
  entradas: number
  saidas: number
}

export default function GraficoSaldoDiario({ dados }: { dados: Dado[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={dados}>
        <defs>
          <linearGradient id="colorFechamento" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="data" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number) =>
            `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          }
        />
        <Area
          type="monotone"
          dataKey="fechamento"
          name="Fechamento"
          stroke="#ef4444"
          fill="url(#colorFechamento)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
