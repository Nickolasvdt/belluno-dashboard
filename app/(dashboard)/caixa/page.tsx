'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import CurrencyInput from '@/components/CurrencyInput'

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
const labelCls = 'block text-xs text-gray-500 dark:text-zinc-400 mb-1'
const card = 'bg-white dark:bg-zinc-900 rounded-xl border border-cream-200 dark:border-zinc-800 shadow-sm'

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

type FormData = {
  date: string
  saldoInicial: number
  entradas: number
  saidas: number
  observacao: string
}

const emptyForm = (): FormData => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  saldoInicial: 0,
  entradas: 0,
  saidas: 0,
  observacao: '',
})

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function CaixaPage() {
  const [registros, setRegistros] = useState<CashFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<FormData>(emptyForm())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    carregarRegistros()
  }, [])

  async function carregarRegistros() {
    try {
      const res = await fetch('/api/caixa')
      const data = await res.json()
      setRegistros(data)
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, saldoInicial: data[0].fechamento }))
      }
    } catch (error) {
      console.error('Erro ao carregar registros:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        const data = await (await fetch('/api/caixa')).json()
        setRegistros(data)
        const novoForm = emptyForm()
        novoForm.saldoInicial = data[0]?.fechamento ?? 0
        setFormData(novoForm)
      }
    } catch (error) {
      console.error('Erro ao criar registro:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return
    try {
      const res = await fetch(`/api/caixa/${id}`, { method: 'DELETE' })
      if (res.ok) await carregarRegistros()
    } catch (error) {
      console.error('Erro ao deletar registro:', error)
    }
  }

  function handleEditStart(r: CashFlow) {
    setEditingId(r.id)
    setEditData({
      date: r.date.slice(0, 10),
      saldoInicial: r.saldoInicial,
      entradas: r.entradas,
      saidas: r.saidas,
      observacao: r.observacao ?? '',
    })
  }

  async function handleEditSave() {
    if (!editingId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/caixa/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (res.ok) {
        setEditingId(null)
        await carregarRegistros()
      }
    } catch (error) {
      console.error('Erro ao editar registro:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const calcularFechamento = (d: FormData) => round2(d.saldoInicial + d.entradas - d.saidas)

  if (loading) return <div className="text-center py-8 text-gray-400">Carregando...</div>

  return (
    <div>
      <h2 className="text-xl font-display font-semibold text-gray-800 dark:text-gray-100 mb-5">Controle de Caixa</h2>

      <div className={`${card} p-4 sm:p-5 mb-5`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-4">Novo Registro</p>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="Saldo Inicial" value={formData.saldoInicial} onChange={v => setFormData({ ...formData, saldoInicial: v })} required />
            <CurrencyInput label="Entradas" value={formData.entradas} onChange={v => setFormData({ ...formData, entradas: v })} />
            <CurrencyInput label="Saídas" value={formData.saidas} onChange={v => setFormData({ ...formData, saidas: v })} />
            <div>
              <label className={labelCls}>Fechamento</label>
              <div className="w-full px-3 py-2 border border-cream-200 dark:border-zinc-700 rounded-lg bg-cream-100 dark:bg-zinc-800 text-sm font-semibold text-gray-800 dark:text-gray-100">
                R$ {formatBRL(calcularFechamento(formData))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Observação</label>
              <input type="text" value={formData.observacao} onChange={e => setFormData({ ...formData, observacao: e.target.value })} placeholder="Opcional" className={inputCls} />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {submitting ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-cream-200 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Histórico</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cream-200 dark:divide-zinc-800">
            <thead className="bg-cream-100 dark:bg-zinc-800">
              <tr>
                {['Data', 'Saldo Inicial', 'Entradas', 'Saídas', 'Fechamento', 'Observação', 'Ações'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 dark:divide-zinc-800">
              {registros.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/60">
                  <td className="px-5 py-3 text-sm text-gray-800 dark:text-gray-100 whitespace-nowrap">{format(new Date(r.date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">R$ {formatBRL(r.saldoInicial)}</td>
                  <td className="px-5 py-3 text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">R$ {formatBRL(r.entradas)}</td>
                  <td className="px-5 py-3 text-sm text-primary whitespace-nowrap">R$ {formatBRL(r.saidas)}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">R$ {formatBRL(r.fechamento)}</td>
                  <td className="px-5 py-3 text-sm text-gray-400 dark:text-zinc-500">{r.observacao || '—'}</td>
                  <td className="px-5 py-3 text-sm whitespace-nowrap">
                    <button onClick={() => handleEditStart(r)} className="text-primary hover:text-primary-dark font-medium mr-3">Editar</button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-zinc-500">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Editar Registro</h3>
              <button onClick={() => setEditingId(null)} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 text-2xl font-bold leading-none">×</button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-5">
              <div className="sm:col-span-2">
                <label className={labelCls}>Data</label>
                <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} className={inputCls} />
              </div>
              <CurrencyInput label="Saldo Inicial" value={editData.saldoInicial} onChange={v => setEditData({ ...editData, saldoInicial: v })} />
              <CurrencyInput label="Entradas" value={editData.entradas} onChange={v => setEditData({ ...editData, entradas: v })} />
              <CurrencyInput label="Saídas" value={editData.saidas} onChange={v => setEditData({ ...editData, saidas: v })} />
              <div>
                <label className={labelCls}>Fechamento</label>
                <div className="w-full px-3 py-2 border border-cream-200 dark:border-zinc-700 rounded-lg bg-cream-100 dark:bg-zinc-800 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  R$ {formatBRL(calcularFechamento(editData))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Observação</label>
                <input type="text" value={editData.observacao} onChange={e => setEditData({ ...editData, observacao: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleEditSave} disabled={submitting} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditingId(null)} className="flex-1 py-2 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
