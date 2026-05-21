'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type Dado = {
  mes: string
  entradas: number
  saidas: number
}

export default function GraficoMensal({ dados }: { dados: Dado[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number) =>
            `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          }
        />
        <Legend />
        <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
