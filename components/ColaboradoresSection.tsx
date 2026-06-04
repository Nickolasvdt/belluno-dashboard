'use client'

import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'

type Colaborador = { id: number; nome: string; ativo: boolean }

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

export default function ColaboradoresSection() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function carregar() {
    const data = await fetch('/api/colaboradores').then(r => r.json())
    setColaboradores(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      setNome('')
      setOpen(false)
      await carregar()
    } finally { setSubmitting(false) }
  }

  async function toggleAtivo(c: Colaborador) {
    await fetch(`/api/colaboradores/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !c.ativo }),
    })
    await carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-xl text-ink dark:text-gray-100">Colaboradores</h2>
        <button
          onClick={() => { setNome(''); setOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-dark transition-all active:scale-95"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
      ) : colaboradores.length === 0 ? (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-dashed border-cream-300 dark:border-zinc-700 p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400 dark:text-zinc-500">Nenhum colaborador cadastrado</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
          {colaboradores.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${c.ativo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-600'}`} />
              <p className={`flex-1 text-sm font-medium ${c.ativo ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-zinc-500'}`}>
                {c.nome}
              </p>
              <button
                onClick={() => toggleAtivo(c)}
                className="text-xs px-2.5 py-1 rounded-lg border border-cream-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-accent/40 hover:text-accent transition-colors font-medium"
              >
                {c.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </div>
          ))}
        </div>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Novo Colaborador">
        <form onSubmit={handleAdd} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Nome</label>
            <input
              type="text" required value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do colaborador"
              className={inp}
              autoFocus
            />
          </div>
          <button type="submit" disabled={submitting || !nome.trim()}
            className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99]">
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
