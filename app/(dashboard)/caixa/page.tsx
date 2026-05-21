'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

  if (loading) {
    return <div className="text-center py-8 text-wood-500">Carregando...</div>
  }

  return (
    <div className="min-w-0">
      <h2 className="text-xl sm:text-2xl font-bold text-wood-700 dark:text-gray-100 mb-4 sm:mb-6">Controle de Caixa</h2>

      <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl shadow-sm border border-wood-200 dark:border-zinc-800 p-4 sm:p-6 mb-6">
        <h3 className="text-sm font-semibold text-wood-600 dark:text-gray-300 mb-4">Novo Registro</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1">
              <label className="block text-sm font-medium text-wood-600 dark:text-gray-300 mb-1">Data</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-wood-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <CurrencyInput
              label="Saldo Inicial"
              value={formData.saldoInicial}
              onChange={(v) => setFormData({ ...formData, saldoInicial: v })}
              required
            />
            <CurrencyInput
              label="Entradas"
              value={formData.entradas}
              onChange={(v) => setFormData({ ...formData, entradas: v })}
            />
            <CurrencyInput
              label="Saidas"
              value={formData.saidas}
              onChange={(v) => setFormData({ ...formData, saidas: v })}
            />
            <div>
              <label className="block text-sm font-medium text-wood-600 dark:text-gray-300 mb-1">Fechamento</label>
              <div className="w-full px-3 py-2 border border-wood-200 dark:border-zinc-700 rounded-md bg-wood-100 dark:bg-zinc-800 text-sm font-semibold text-wood-700 dark:text-gray-100">
                R$ {formatBRL(calcularFechamento(formData))}
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1">
              <label className="block text-sm font-medium text-wood-600 dark:text-gray-300 mb-1">Observacao</label>
              <input
                type="text"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Ex: Caixinha..."
                className="w-full px-3 py-2 border border-wood-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Salvando...' : 'Adicionar Registro'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl shadow-sm border border-wood-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-wood-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-wood-600 dark:text-gray-300">Historico de Registros</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] divide-y divide-wood-200 dark:divide-zinc-800">
            <thead className="bg-wood-100 dark:bg-zinc-800">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Data</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Saldo Inicial</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Entradas</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Saidas</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Fechamento</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Observacao</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wood-200 dark:divide-zinc-800">
              {registros.map((r) => (
                <tr key={r.id} className="hover:bg-wood-100 dark:hover:bg-zinc-800/60">
                  <td className="px-5 py-3 text-sm text-wood-700 dark:text-gray-100">
                    {format(new Date(r.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-5 py-3 text-sm text-wood-600 dark:text-zinc-400">R$ {formatBRL(r.saldoInicial)}</td>
                  <td className="px-5 py-3 text-sm text-green-600 dark:text-green-400">R$ {formatBRL(r.entradas)}</td>
                  <td className="px-5 py-3 text-sm text-red-600 dark:text-red-400">R$ {formatBRL(r.saidas)}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-wood-700 dark:text-gray-100">R$ {formatBRL(r.fechamento)}</td>
                  <td className="px-5 py-3 text-sm text-wood-500 dark:text-zinc-400">{r.observacao || '-'}</td>
                  <td className="px-5 py-3 text-sm">
                    <button onClick={() => handleEditStart(r)} className="text-primary hover:text-primary-dark font-medium mr-3">Editar</button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-wood-400 dark:text-zinc-500">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-wood-50 dark:bg-zinc-900 rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <h3 className="text-lg font-semibold text-wood-700 dark:text-gray-100 mb-5">Editar Registro</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-wood-600 dark:text-gray-300 mb-1">Data</label>
                <input
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <CurrencyInput label="Saldo Inicial" value={editData.saldoInicial} onChange={(v) => setEditData({ ...editData, saldoInicial: v })} />
              <CurrencyInput label="Entradas" value={editData.entradas} onChange={(v) => setEditData({ ...editData, entradas: v })} />
              <CurrencyInput label="Saidas" value={editData.saidas} onChange={(v) => setEditData({ ...editData, saidas: v })} />
              <div>
                <label className="block text-sm font-medium text-wood-600 dark:text-gray-300 mb-1">Fechamento</label>
                <div className="w-full px-3 py-2 border border-wood-200 dark:border-zinc-700 rounded-md bg-wood-100 dark:bg-zinc-800 text-sm font-semibold text-wood-700 dark:text-gray-100">
                  R$ {formatBRL(calcularFechamento(editData))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-wood-600 dark:text-gray-300 mb-1">Observacao</label>
                <input
                  type="text"
                  value={editData.observacao}
                  onChange={(e) => setEditData({ ...editData, observacao: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button onClick={handleEditSave} disabled={submitting} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditingId(null)} className="flex-1 py-2 border border-wood-300 dark:border-zinc-700 text-wood-600 dark:text-gray-300 rounded-lg font-medium hover:bg-wood-100 dark:hover:bg-zinc-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
