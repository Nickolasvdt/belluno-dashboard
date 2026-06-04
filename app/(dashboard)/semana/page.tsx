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

type CanalCfg = { key: keyof Omit<VendaSemana, 'semana' | 'total'>; label: string; bar: string; dot: string }

const canais: CanalCfg[] = [
  { key: 'avista',   label: 'À Vista', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { key: 'pix',      label: 'PIX',     bar: 'bg-sky-500',     dot: 'bg-sky-500' },
  { key: 'ifood',    label: 'iFood',   bar: 'bg-orange-500',  dot: 'bg-orange-500' },
  { key: 'debito',   label: 'Débito',  bar: 'bg-violet-500',  dot: 'bg-violet-500' },
  { key: 'credito',  label: 'Crédito', bar: 'bg-amber-500',   dot: 'bg-amber-500' },
  { key: 'noventa9', label: '99food',  bar: 'bg-pink-500',    dot: 'bg-pink-500' },
  { key: 'keeta',    label: 'Keeta',   bar: 'bg-teal-500',    dot: 'bg-teal-500' },
  { key: 'extra',    label: 'Extra',   bar: 'bg-indigo-500',  dot: 'bg-indigo-500' },
  { key: 'outros',   label: 'Outros',  bar: 'bg-gray-400',    dot: 'bg-gray-400' },
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

  const canaisAtivosGlobal = canais.filter(c => totalVendas[c.key] > 0)

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

      {/* Vendas por Semana com distribuição por canal */}
      <section>
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute mb-3">Vendas por Semana</p>
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-8 rounded-lg"/>)}</div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr className="border-b border-cream-200 dark:border-white/[0.04]">
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Canal</th>
                    {vendas.map(v => <th key={v.semana} className={thCls}>Sem {v.semana}</th>)}
                    <th className={thCls}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 dark:divide-white/[0.04]">
                  {canalRows.filter(c => vendas.some(v => v[c.key] > 0) || totalVendas[c.key] > 0).map(canal => {
                    const cfg = canais.find(c => c.key === canal.key)
                    return (
                      <tr key={canal.key} className="hover:bg-cream-50/60 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {cfg && <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />}
                            <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">{canal.label}</span>
                          </div>
                        </td>
                        {vendas.map(v => <td key={v.semana} className={tdCls}>{fmt(v[canal.key])}</td>)}
                        <td className={tdTotalCls}>{fmt(totalVendas[canal.key])}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-cream-200 dark:border-white/[0.08] bg-cream-50 dark:bg-zinc-900/40">
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-100">Total</td>
                    {vendas.map(v => <td key={v.semana} className={tdTotalCls}>{fmt(v.total)}</td>)}
                    <td className={`${tdTotalCls} text-emerald-600 dark:text-emerald-400`}>{fmt(totalVendas.total)}</td>
                  </tr>
                  {vendas.length > 0 && totalVendas.total > 0 && (
                    <tr className="border-t border-cream-200 dark:border-white/[0.04] bg-cream-50/60 dark:bg-zinc-900/20">
                      <td className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-400 dark:text-zinc-600 whitespace-nowrap">Distribuição</td>
                      {vendas.map(v => (
                        <td key={v.semana} className="px-3 py-2">
                          {v.total > 0 ? (
                            <div className="flex h-2 rounded-full overflow-hidden gap-px min-w-[48px]">
                              {canaisAtivosGlobal
                                .filter(c => v[c.key] > 0)
                                .sort((a, b) => v[b.key] - v[a.key])
                                .map(c => (
                                  <div
                                    key={c.key}
                                    className={`h-full ${c.bar}`}
                                    style={{ width: `${Math.round((v[c.key] / v.total) * 100)}%` }}
                                    title={`${c.label}: ${Math.round((v[c.key] / v.total) * 100)}%`}
                                  />
                                ))}
                            </div>
                          ) : <span className="text-[10px] text-gray-300 dark:text-zinc-700">–</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {totalVendas.total > 0 && (
                          <div className="flex h-2 rounded-full overflow-hidden gap-px min-w-[48px]">
                            {canaisAtivosGlobal.map(c => (
                              <div
                                key={c.key}
                                className={`h-full ${c.bar}`}
                                style={{ width: `${Math.round((totalVendas[c.key] / totalVendas.total) * 100)}%` }}
                                title={`${c.label}: ${Math.round((totalVendas[c.key] / totalVendas.total) * 100)}%`}
                              />
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Legenda dos canais ativos */}
        {!loading && canaisAtivosGlobal.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1">
            {canaisAtivosGlobal.map(c => (
              <span key={c.key} className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-zinc-500">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {c.label}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Funcionários por Semana */}
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
