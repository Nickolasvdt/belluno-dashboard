'use client'

import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export type WeekData = {
  label: string
  receita: number
  despesas: number
}

function fmt(v: number) {
  if (v === 0) return 'R$0'
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-900 border border-cream-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-lg">
      <p className="font-mono text-[10px] uppercase tracking-wide text-mute mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs font-medium" style={{ color: p.fill }}>
          {p.name === 'receita' ? 'Receita' : 'Despesas'}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function WeeklyBarChart({ data }: { data: WeekData[] }) {
  return (
    <ResponsiveContainer width="100%" height={88}>
      <BarChart data={data} barGap={3} barCategoryGap="35%">
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: 'var(--color-mute)', fontFamily: 'var(--font-mono)' }}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(139,32,32,0.04)' }}
        />
        <Bar dataKey="receita" name="receita" radius={[3, 3, 0, 0]} maxBarSize={16}>
          {data.map((_, i) => (
            <Cell key={i} fill="#10b981" />
          ))}
        </Bar>
        <Bar dataKey="despesas" name="despesas" radius={[3, 3, 0, 0]} maxBarSize={16}>
          {data.map((_, i) => (
            <Cell key={i} fill="#8B2020" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
