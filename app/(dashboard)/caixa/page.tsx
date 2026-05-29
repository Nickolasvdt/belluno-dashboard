'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import BottomSheet from '@/components/BottomSheet'
import CurrencyInput from '@/components/CurrencyInput'

type CashFlow = {
  id: number
  date: string
  saldoInicial: number
  entradas: number
  saidas: number
  fechamento: number
  diferenca: number | null
  observacao: string | null
}

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

export default function CaixaPage() {
  const [registros, setRegistros] = useState<CashFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [entradas, setEntradas] = useState(0)
  const [saidas, setSaidas] = useState(0)
  const [diferenca, setDiferenca] = useState('')
  const [observacao, setObservacao] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const data = await fetch('/api/caixa').then(r => r.json())
      setRegistros(Array.isArray(data) ? data : [])
      if (Array.isArray(data) && data.length > 0) setSaldoInicial(data[0].fechamento)
    } finally { setLoading(false) }
  }

  function openNew() {
    setEditId(null)
    setDate(today)
    setSaldoInicial(registros[0]?.fechamento ?? 0)
    setEntradas(0); setSaidas(0); setDiferenca(''); setObservacao('')
    setOpen(true)
  }

  function openEdit(r: CashFlow) {
    setEditId(r.id)
    setDate(r.date.slice(0, 10))
    setSaldoInicial(r.saldoInicial)
    setEntradas(r.entradas)
    setSaidas(r.saidas)
    setDiferenca(r.diferenca != null ? String(r.diferenca) : '')
    setObservacao(r.observacao ?? '')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = { date, saldoInicial, entradas, saidas, diferenca: diferenca !== '' ? diferenca : null, observacao }
      if (editId) {
        await fetch(`/api/caixa/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setOpen(false)
      await carregar()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/caixa/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    carregar()
  }

  const fechamentoCalc = r2(saldoInicial + entradas - saidas)
  const hoje = registros[0]
  const temHoje = hoje && hoje.date.slice(0, 10) === today

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-7 w-24 rounded-lg" />
      <div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-display font-semibold text-gray-800 dark:text-gray-100">Caixa</h1>
        {!temHoje && (
          <button onClick={openNew}
            className="px-3.5 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors active:scale-[0.98]">
            Registrar hoje
          </button>
        )}
      </div>

      {/* Hero card — hoje */}
      {temHoje ? (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] overflow-hidden shadow-sm">
          <div className="px-5 pt-4 pb-3 flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 capitalize">
                {format(parseISO(hoje.date.slice(0, 10)), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-300 dark:text-zinc-600 mt-0.5">Fechamento</p>
            </div>
            <button onClick={() => openEdit(hoje)}
              className="text-xs text-accent font-semibold px-3 py-1.5 rounded-full border border-accent/25 hover:bg-accent/5 transition-colors">
              Editar
            </button>
          </div>

          <div className="px-5 pb-4">
            <p className="font-display font-bold text-[clamp(32px,7vw,44px)] leading-none tracking-tight text-gray-900 dark:text-gray-100">
              R$&nbsp;{fmt(hoje.fechamento)}
            </p>
          </div>

          <div className="grid grid-cols-3 border-t border-cream-200 dark:border-white/[0.05] divide-x divide-cream-200 dark:divide-white/[0.05]">
            {[
              { label: 'Inicial',  value: fmt(hoje.saldoInicial),    color: 'text-gray-600 dark:text-gray-300' },
              { label: 'Entradas', value: `+${fmt(hoje.entradas)}`,  color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Saídas',   value: `−${fmt(hoje.saidas)}`,    color: 'text-accent' },
            ].map(s => (
              <div key={s.label} className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">{s.label}</p>
                <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {(hoje.diferenca != null || hoje.observacao) && (
            <div className="px-5 py-3 border-t border-cream-200 dark:border-white/[0.05] flex flex-wrap gap-3">
              {hoje.diferenca != null && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  hoje.diferenca === 0 ? 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400' :
                  hoje.diferenca > 0   ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                  'bg-red-50 dark:bg-red-900/20 text-accent dark:text-red-400'
                }`}>
                  Diferença: {hoje.diferenca >= 0 ? '+' : ''}R$ {fmt(hoje.diferenca)}
                </span>
              )}
              {hoje.observacao && (
                <span className="text-xs text-gray-400 dark:text-zinc-500 italic">{hoje.observacao}</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-dashed border-cream-300 dark:border-zinc-700 p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">Sem fechamento para hoje</p>
          <button onClick={openNew}
            className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark transition-colors active:scale-[0.98]">
            Registrar agora
          </button>
        </div>
      )}

      {/* Histórico */}
      {registros.length > (temHoje ? 1 : 0) && (
        <section>
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-zinc-500 mb-3">Histórico</p>
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {registros.slice(temHoje ? 1 : 0, 30).map(r => {
              const confirming = deleteConfirm === r.id
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  {confirming ? (
                    <>
                      <p className="flex-1 text-sm text-gray-600 dark:text-zinc-400">
                        Excluir {format(parseISO(r.date.slice(0, 10)), 'dd/MM', { locale: ptBR })}?
                      </p>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-cream-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-medium">
                        Cancelar
                      </button>
                      <button onClick={() => handleDelete(r.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-medium">
                        Excluir
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {format(parseISO(r.date.slice(0, 10)), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400">+{fmt(r.entradas)}</span>
                          <span className="mx-1 text-gray-300 dark:text-zinc-700">·</span>
                          <span className="text-accent">−{fmt(r.saidas)}</span>
                          {r.observacao && <span className="ml-1 italic"> · {r.observacao}</span>}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 shrink-0">R$ {fmt(r.fechamento)}</p>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => openEdit(r)}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-accent hover:bg-accent/5 transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => setDeleteConfirm(r.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Formulário */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={editId ? 'Editar Fechamento' : 'Novo Fechamento'}>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} required />
          </div>
          <CurrencyInput label="Saldo Inicial" value={saldoInicial} onChange={setSaldoInicial} required />
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Entradas" value={entradas} onChange={setEntradas} />
            <CurrencyInput label="Saídas" value={saidas} onChange={setSaidas} />
          </div>
          <div className="px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-zinc-400">Fechamento calculado</p>
            <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">R$&nbsp;{fmt(fechamentoCalc)}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Diferença (opcional)</label>
            <input type="number" step="0.01" value={diferenca} onChange={e => setDiferenca(e.target.value)}
              placeholder="Diferença entre caixa físico e calculado" className={inp} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Observação (opcional)</label>
            <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} className={inp} />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99] mt-1">
            {submitting ? 'Salvando...' : editId ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
