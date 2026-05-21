'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

export default function CaixaPage() {
  const [registros, setRegistros] = useState<CashFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    saldoInicial: '',
    entradas: '',
    saidas: '',
    observacao: '',
  })

  useEffect(() => {
    carregarRegistros()
  }, [])

  async function carregarRegistros() {
    try {
      const res = await fetch('/api/caixa')
      const data = await res.json()
      setRegistros(data)
      
      // Atualiza o saldo inicial com o último fechamento
      if (data.length > 0) {
        setFormData(prev => ({
          ...prev,
          saldoInicial: data[0].fechamento.toString()
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar registros:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await carregarRegistros()
        setFormData({
          date: format(new Date(), 'yyyy-MM-dd'),
          saldoInicial: '',
          entradas: '',
          saidas: '',
          observacao: '',
        })
      }
    } catch (error) {
      console.error('Erro ao criar registro:', error)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja deletar este registro?')) return

    try {
      const res = await fetch(`/api/caixa/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await carregarRegistros()
      }
    } catch (error) {
      console.error('Erro ao deletar registro:', error)
    }
  }

  const calcularFechamento = () => {
    const saldo = parseFloat(formData.saldoInicial) || 0
    const entradas = parseFloat(formData.entradas) || 0
    const saidas = parseFloat(formData.saidas) || 0
    return saldo + entradas - saidas
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="px-4 sm:px-0">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Controle de Caixa</h2>

      {/* Formulário */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Novo Registro
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saldo Inicial (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.saldoInicial}
                onChange={(e) => setFormData({ ...formData, saldoInicial: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entradas (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.entradas}
                onChange={(e) => setFormData({ ...formData, entradas: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saídas (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.saidas}
                onChange={(e) => setFormData({ ...formData, saidas: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fechamento
              </label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 font-semibold text-gray-900">
                R$ {calcularFechamento().toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observação (opcional)
            </label>
            <input
              type="text"
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Ex: Caixinha, notas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Adicionar Registro
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Registros */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Histórico de Registros
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Inicial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entradas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saídas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(registro.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      R$ {registro.saldoInicial.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      R$ {registro.entradas.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      R$ {registro.saidas.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      R$ {registro.fechamento.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {registro.observacao || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(registro.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
