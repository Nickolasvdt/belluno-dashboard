'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from '@/context/ThemeContext'

type Dado = {
  mes: string
  receita: number
  despesa: number
  lucro: number
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function GraficoFechamento({ dados }: { dados: Dado[] }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const gridColor = isDark ? '#27272a' : '#f0e8d5'
  const textColor = isDark ? '#71717a' : '#9ca3af'
  const tooltipBg = isDark ? '#141414' : '#ffffff'
  const tooltipBorder = isDark ? '#3f3f46' : '#f0e8d5'
  const tooltipText = isDark ? '#f4f4f5' : '#1c1c1c'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: textColor }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={38} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number, name: string) => [fmt(value), name]}
          contentStyle={{ fontSize: 12, backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
          labelStyle={{ color: tooltipText, fontWeight: 600, marginBottom: 4 }}
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: textColor, paddingTop: 8 }} />
        <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} opacity={isDark ? 0.8 : 0.85} />
        <Bar dataKey="despesa" name="Despesa" fill="#8B2020" radius={[4, 4, 0, 0]} opacity={isDark ? 0.8 : 0.85} />
        <Line dataKey="lucro" name="Lucro" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4, fill: '#d97706', strokeWidth: 2, stroke: tooltipBg }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
