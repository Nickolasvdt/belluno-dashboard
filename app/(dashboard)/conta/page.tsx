'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
const labelCls = 'block text-xs text-gray-500 dark:text-zinc-400 mb-1'

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
      setMessage({ type: 'error', text: 'As senhas não coincidem.' })
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
    <div className="w-full max-w-md min-w-0">
      <h2 className="text-xl font-display font-semibold text-gray-800 dark:text-gray-100 mb-5">Minha Conta</h2>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-cream-200 dark:border-zinc-800 shadow-sm p-5">
        <div className="mb-5 pb-4 border-b border-cream-200 dark:border-zinc-800">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Usuário: <span className="font-semibold text-gray-800 dark:text-gray-200">{session?.user?.username}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Perfil: <span className="font-semibold text-gray-800 dark:text-gray-200">{session?.user?.role}</span>
          </p>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-4">Alterar Senha</p>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>Senha Atual</label>
            <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nova Senha</label>
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={6} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Confirmar Nova Senha</label>
            <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {loading ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
