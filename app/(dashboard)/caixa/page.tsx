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

const inp = 'w-full px-3 py-2.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

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

  const fechamento = r2(saldoInicial + entradas - saidas)
  const hoje = registros[0]
  const temHoje = hoje && hoje.date.slice(0, 10) === today

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-400">Carregando...</p></div>

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-display font-semibold text-gray-800 dark:text-gray-100">Caixa</h1>

      {/* Today's hero card */}
      {temHoje ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">
                {format(parseISO(hoje.date.slice(0, 10)), "dd 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Fechamento</p>
            </div>
            <button onClick={() => openEdit(hoje)} className="text-xs text-primary font-semibold px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary/5 transition-colors">
              Editar
            </button>
          </div>
          <p className="text-4xl font-display font-bold text-gray-900 dark:text-gray-100 mb-5">
            R$ {fmt(hoje.fechamento)}
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-cream-200 dark:border-zinc-800">
            <div>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Saldo Inicial</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">R$ {fmt(hoje.saldoInicial)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Entradas</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">R$ {fmt(hoje.entradas)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Saídas</p>
              <p className="text-sm font-semibold text-primary">R$ {fmt(hoje.saidas)}</p>
            </div>
          </div>
          {hoje.diferenca != null && (
            <div className="mt-3 pt-3 border-t border-cream-200 dark:border-zinc-800 flex items-center justify-between">
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Diferença</p>
              <p className={`text-sm font-semibold ${hoje.diferenca >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                {hoje.diferenca >= 0 ? '+' : ''}R$ {fmt(hoje.diferenca)}
              </p>
            </div>
          )}
          {hoje.observacao && (
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-3 pt-3 border-t border-cream-200 dark:border-zinc-800">{hoje.observacao}</p>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-cream-200 dark:border-zinc-700 p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400 dark:text-zinc-500 mb-3">Sem registro para hoje</p>
          <button onClick={openNew} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
            Registrar agora
          </button>
        </div>
      )}

      {/* History */}
      {registros.length > (temHoje ? 1 : 0) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2.5">Histórico</p>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800 divide-y divide-cream-200 dark:divide-zinc-800 overflow-hidden shadow-sm">
            {registros.slice(temHoje ? 1 : 0, 20).map(r => {
              const confirming = deleteConfirm === r.id
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {format(parseISO(r.date.slice(0, 10)), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      {r.observacao && !confirming && (
                        <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{r.observacao}</p>
                      )}
                    </div>
                    {!confirming && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400">+{fmt(r.entradas)}</span>
                        <span className="mx-1">·</span>
                        <span className="text-primary">-{fmt(r.saidas)}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {confirming ? (
                      <>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-medium">
                          Cancelar
                        </button>
                        <button onClick={() => handleDelete(r.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-medium">
                          Excluir
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">R$ {fmt(r.fechamento)}</p>
                          <p className="text-[11px] text-gray-400 dark:text-zinc-500">inicial: {fmt(r.saldoInicial)}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => openEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-primary hover:bg-primary/5 transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteConfirm(r.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openNew}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/25 flex items-center justify-center z-30 hover:bg-primary-dark transition-all active:scale-95"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add/Edit sheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={editId ? 'Editar Registro' : 'Novo Registro de Caixa'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} required />
          </div>
          <CurrencyInput label="Saldo Inicial" value={saldoInicial} onChange={setSaldoInicial} required />
          <CurrencyInput label="Entradas" value={entradas} onChange={setEntradas} />
          <CurrencyInput label="Saídas" value={saidas} onChange={setSaidas} />
          <div className="p-3 bg-cream-100 dark:bg-zinc-800 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-zinc-400">Fechamento calculado</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {fmt(fechamento)}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Diferença (opcional)</label>
            <input type="number" step="0.01" value={diferenca} onChange={e => setDiferenca(e.target.value)}
              placeholder="0,00 (positivo ou negativo)" className={inp} />
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">Diferença entre o caixa físico e o fechamento calculado</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Observação (opcional)</label>
            <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="" className={inp} />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors mt-1">
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
