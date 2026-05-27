'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

const inputCls = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5'

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
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('')
    } else {
      setMessage({ type: 'error', text: data.error ?? 'Erro ao alterar senha.' })
    }
    setLoading(false)
  }

  const role = session?.user?.role

  return (
    <div className="w-full max-w-md min-w-0">
      <h2 className="text-xl font-display font-semibold text-gray-800 dark:text-gray-100 mb-5">Minha Conta</h2>

      <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm p-5">
        {/* User info */}
        <div className="mb-5 pb-4 border-b border-cream-200 dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {session?.user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{session?.user?.username}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 capitalize mt-0.5">{role?.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-4">Alterar Senha</p>

        {message && (
          <div className={`mb-4 px-3.5 py-2.5 rounded-xl text-sm border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/50'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200/80 dark:border-red-800/50'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
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
            className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            {loading ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
