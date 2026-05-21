'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

export default function ContaPage() {
  const { data: session } = useSession()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmar) {
      setMessage({ type: 'error', text: 'As senhas nao coincidem.' })
      return
    }
    setLoading(true)
    const res = await fetch('/api/conta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senhaAtual, novaSenha }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmar('')
    } else {
      setMessage({ type: 'error', text: data.error ?? 'Erro ao alterar senha.' })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Minha Conta</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6 pb-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">Usuario: <span className="font-semibold text-gray-800">{session?.user?.username}</span></p>
          <p className="text-sm text-gray-500 mt-1">Perfil: <span className="font-semibold text-gray-800">{session?.user?.role}</span></p>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 mb-4">Alterar Senha</h3>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
