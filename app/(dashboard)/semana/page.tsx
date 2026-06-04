'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) {
  if (v === 0) return '–'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

type VendaSemana = { semana: number; avista: number; ifood: number; noventa9: number; keeta: number; extra: number; debito: number; credito: number; pix: number; outros: number; total: number }
type FuncSemana  = { nome: string; sem1: number; sem2: number; sem3: number; sem4: number; total: number }

type CanalConfig = {
  key: keyof Omit<VendaSemana, 'semana' | 'total'>
  label: string
  bar: string
  text: string
}

const canaisConfig: CanalConfig[] = [
  { key: 'avista',   label: 'À Vista', bar: 'bg-emerald-500',  text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'pix',      label: 'PIX',     bar: 'bg-sky-500',      text: 'text-sky-600 dark:text-sky-400' },
  { key: 'ifood',    label: 'iFood',   bar: 'bg-orange-500',   text: 'text-orange-600 dark:text-orange-400' },
  { key: 'debito',   label: 'Débito',  bar: 'bg-violet-500',   text: 'text-violet-600 dark:text-violet-400' },
  { key: 'credito',  label: 'Crédito', bar: 'bg-amber-500',    text: 'text-amber-600 dark:text-amber-400' },
  { key: 'noventa9', label: '99food',  bar: 'bg-pink-500',     text: 'text-pink-600 dark:text-pink-400' },
  { key: 'keeta',    label: 'Keeta',   bar: 'bg-teal-500',     text: 'text-teal-600 dark:text-teal-400' },
  { key: 'extra',    label: 'Extra',   bar: 'bg-indigo-500',   text: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'outros',   label: 'Outros',  bar: 'bg-gray-400',     text: 'text-gray-500 dark:text-zinc-400' },
]

export default function SemanaPage() {
  const [ref, setRef]         = useState(startOfMonth(new Date()))
  const [vendas, setVendas]   = useState<VendaSemana[]>([])
  const [funcs, setFuncs]     = useState<FuncSemana[]>([])
  const [loading, setLoading] = useState(true)

  const mes = ref.getMonth() + 1
  const ano = ref.getFullYear()
  const mesLabel = format(ref, 'MMMM yyyy', { locale: ptBR })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch(`/api/semana?mes=${mes}&ano=${ano}`).then(r => r.json())
      setVendas(Array.isArray(data.vendas) ? data.vendas : [])
      setFuncs(Array.isArray(data.funcionarios) ? data.funcionarios : [])
    } finally { setLoading(false) }
  }, [mes, ano])

  useEffect(() => { load() }, [load])

  const totalVendas: VendaSemana = {
    semana: 0,
    avista:   r2(vendas.reduce((s, v) => s + v.avista, 0)),
    ifood:    r2(vendas.reduce((s, v) => s + v.ifood, 0)),
    noventa9: r2(vendas.reduce((s, v) => s + v.noventa9, 0)),
    keeta:    r2(vendas.reduce((s, v) => s + v.keeta, 0)),
    extra:    r2(vendas.reduce((s, v) => s + v.extra, 0)),
    debito:   r2(vendas.reduce((s, v) => s + v.debito, 0)),
    credito:  r2(vendas.reduce((s, v) => s + v.credito, 0)),
    pix:      r2(vendas.reduce((s, v) => s + v.pix, 0)),
    outros:   r2(vendas.reduce((s, v) => s + v.outros, 0)),
    total:    r2(vendas.reduce((s, v) => s + v.total, 0)),
  }

  const canalRows: { key: keyof Omit<VendaSemana, 'semana' | 'total'>; label: string }[] = [
    { key: 'avista',   label: 'À Vista' },
    { key: 'ifood',    label: 'iFood' },
    { key: 'noventa9', label: '99food' },
    { key: 'keeta',    label: 'Keeta' },
    { key: 'extra',    label: 'Extra' },
    { key: 'debito',   label: 'Débito' },
    { key: 'credito',  label: 'Crédito' },
    { key: 'pix',      label: 'PIX' },
    { key: 'outros',   label: 'Outros' },
  ]

  const totalFuncs = {
    sem1:  r2(funcs.reduce((s, f) => s + f.sem1, 0)),
    sem2:  r2(funcs.reduce((s, f) => s + f.sem2, 0)),
    sem3:  r2(funcs.reduce((s, f) => s + f.sem3, 0)),
    sem4:  r2(funcs.reduce((s, f) => s + f.sem4, 0)),
    total: r2(funcs.reduce((s, f) => s + f.total, 0)),
  }

  const thCls = 'px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500 whitespace-nowrap'
  const tdCls = 'px-3 py-2.5 text-right text-xs text-gray-700 dark:text-zinc-300 whitespace-nowrap'
  const tdTotalCls = 'px-3 py-2.5 text-right text-xs font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap'

  const vendasComDados = vendas.filter(v => v.total > 0)

  return (
    <div className="space-y-6">

      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button onClick={() => setRef(subMonths(ref, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-zinc-400 transition-colors active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <h1 className="text-base font-display font-semibold text-gray-800 dark:text-gray-100 capitalize">{mesLabel}</h1>
        <button onClick={() => setRef(addMonths(ref, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-zinc-400 transition-colors active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
        </button>
      </div>

      {/* Receita por Canal — cards visuais */}
      <section>
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute mb-3">Receita por Canal</p>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-36 rounded-2xl"/>)}
          </div>
        ) : vendasComDados.length === 0 ? (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] p-8 text-center shadow-sm">
            <p className="text-sm text-gray-400 dark:text-zinc-500">Sem vendas neste mês</p>
          </div>
        ) : (
          <div className={`grid gap-3 ${vendasComDados.length >= 3 ? 'grid-cols-2 md:grid-cols-4' : vendasComDados.length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-sm'}`}>
            {vendasComDados.map(semana => {
              const canaisAtivos = canaisConfig
                .map(c => ({ ...c, valor: semana[c.key] }))
                .filter(c => c.valor > 0)
                .sort((a, b) => b.valor - a.valor)

              return (
                <div key={semana.semana} className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm p-4">
                  <div className="mb-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Semana {semana.semana}</p>
                    <p className="font-display font-bold text-lg text-gray-800 dark:text-gray-100 leading-tight mt-0.5">
                      R$ {fmt(semana.total)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {canaisAtivos.map(canal => {
                      const pct = semana.total > 0 ? Math.round((canal.valor / semana.total) * 100) : 0
                      return (
                        <div key={canal.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">{canal.label}</span>
                            <span className={`font-mono text-[10px] font-semibold ${canal.text}`}>{pct}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-cream-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${canal.bar}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-gray-500 dark:text-zinc-500 w-16 text-right shrink-0">
                              {canal.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Card Vendas por Semana */}
      <section>
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute mb-3">Vendas por Semana</p>
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-8 rounded-lg"/>)}</div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full min-w-[380px]">
                <thead>
                  <tr className="border-b border-cream-200 dark:border-white/[0.04]">
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Canal</th>
                    <th className={thCls}>Sem 1</th>
                    <th className={thCls}>Sem 2</th>
                    <th className={thCls}>Sem 3</th>
                    <th className={thCls}>Sem 4</th>
                    <th className={thCls}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 dark:divide-white/[0.04]">
                  {canalRows.filter(c => vendas.some(v => v[c.key] > 0) || totalVendas[c.key] > 0).map(canal => (
                    <tr key={canal.key} className="hover:bg-cream-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300">{canal.label}</td>
                      {vendas.map(v => <td key={v.semana} className={tdCls}>{fmt(v[canal.key])}</td>)}
                      <td className={tdTotalCls}>{fmt(totalVendas[canal.key])}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-cream-200 dark:border-white/[0.08] bg-cream-50 dark:bg-zinc-900/40">
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-100">Total</td>
                    {vendas.map(v => <td key={v.semana} className={tdTotalCls}>{fmt(v.total)}</td>)}
                    <td className={`${tdTotalCls} text-emerald-600 dark:text-emerald-400`}>{fmt(totalVendas.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Card Funcionários por Semana */}
      <section>
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute mb-3">Funcionários por Semana</p>
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-8 rounded-lg"/>)}</div>
          ) : funcs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400 dark:text-zinc-500">Sem registros de funcionários neste mês</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full min-w-[380px]">
                <thead>
                  <tr className="border-b border-cream-200 dark:border-white/[0.04]">
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Funcionário</th>
                    <th className={thCls}>Sem 1</th>
                    <th className={thCls}>Sem 2</th>
                    <th className={thCls}>Sem 3</th>
                    <th className={thCls}>Sem 4</th>
                    <th className={thCls}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 dark:divide-white/[0.04]">
                  {funcs.map(f => (
                    <tr key={f.nome} className="hover:bg-cream-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300">{f.nome}</td>
                      <td className={tdCls}>{fmt(f.sem1)}</td>
                      <td className={tdCls}>{fmt(f.sem2)}</td>
                      <td className={tdCls}>{fmt(f.sem3)}</td>
                      <td className={tdCls}>{fmt(f.sem4)}</td>
                      <td className={tdTotalCls}>{fmt(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-cream-200 dark:border-white/[0.08] bg-cream-50 dark:bg-zinc-900/40">
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-100">Total</td>
                    <td className={tdTotalCls}>{fmt(totalFuncs.sem1)}</td>
                    <td className={tdTotalCls}>{fmt(totalFuncs.sem2)}</td>
                    <td className={tdTotalCls}>{fmt(totalFuncs.sem3)}</td>
                    <td className={tdTotalCls}>{fmt(totalFuncs.sem4)}</td>
                    <td className={`${tdTotalCls} text-accent`}>{fmt(totalFuncs.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
