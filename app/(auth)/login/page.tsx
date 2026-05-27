'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'

const inputCls =
  'w-full px-3.5 py-3 bg-white dark:bg-zinc-900/80 border border-cream-200 dark:border-zinc-800 rounded-xl text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/60 transition-all'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { username, password, redirect: false })
    if (result?.error) {
      setError('Usuário ou senha incorretos')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] dark:bg-[#0e0c0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-[68px] h-[68px] rounded-full overflow-hidden ring-[3px] ring-cream-200 dark:ring-white/[0.07] shadow-md">
              <Image src="/belluno_logo.png" alt="Belluno" width={68} height={68} unoptimized />
            </div>
          </div>
          <h1 className="font-display text-[28px] font-bold text-gray-900 dark:text-gray-50 tracking-tight leading-none">
            Belluno
          </h1>
          <p className="font-display italic text-gray-400 dark:text-zinc-500 text-sm mt-1.5">
            Pizzaria · Gestão
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm p-6">
          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-all active:scale-[0.99] mt-1"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
