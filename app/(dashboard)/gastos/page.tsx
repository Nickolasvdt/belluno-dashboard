'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import BottomSheet from '@/components/BottomSheet'
import CurrencyInput from '@/components/CurrencyInput'

type Tipo = 'insumo' | 'funcionario' | 'conta'
type Filtro = 'hoje' | 'semana' | 'semana_passada' | 'mes'

type Entrada = {
  id: number
  tipo: Tipo
  date: string
  descricao: string
  valor: number
  semana?: string | null
  pago?: boolean
  diaVencimento?: number | null
}

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const inp = 'w-full px-3 py-2.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

const tipoCls: Record<Tipo, string> = {
  insumo: 'bg-amber-50 dark:bg-zinc-800 text-amber-700 dark:text-amber-400',
  funcionario: 'bg-red-50 dark:bg-zinc-800 text-primary',
  conta: 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400',
}
const tipoLabel: Record<Tipo, string> = { insumo: 'Insumo', funcionario: 'Funcionário', conta: 'Conta' }

const filtroOpts: { key: Filtro; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'semana_passada', label: 'Semana passada' },
  { key: 'mes', label: 'Este mês' },
]

export default function RegistrosPage() {
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('semana')
  const [catFiltro, setCatFiltro] = useState<Tipo | 'todos'>('todos')

  // Add sheet state
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<Tipo>('insumo')
  const [date, setDate] = useState(format(now, 'yyyy-MM-dd'))
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  const [semana, setSemana] = useState('')
  const [pago, setPago] = useState(false)
  const [diaVenc, setDiaVenc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const qs = `mes=${mes}&ano=${ano}`
      const [ins, func, cont] = await Promise.all([
        fetch(`/api/fechamento/insumos?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/funcionarios?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/contas?${qs}`).then(r => r.json()),
      ])
      const merged: Entrada[] = [
        ...(Array.isArray(ins) ? ins : []).map((i: any) => ({ id: i.id, tipo: 'insumo' as Tipo, date: i.date, descricao: i.fornecedor, valor: i.valor })),
        ...(Array.isArray(func) ? func : []).map((f: any) => ({ id: f.id, tipo: 'funcionario' as Tipo, date: f.date, descricao: f.nome, valor: f.valor, semana: f.semana })),
        ...(Array.isArray(cont) ? cont : []).map((c: any) => ({ id: c.id, tipo: 'conta' as Tipo, date: c.date, descricao: c.despesa, valor: c.valor, pago: c.pago, diaVencimento: c.diaVencimento })),
      ]
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEntradas(merged)
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  useEffect(() => { fetchAll() }, [fetchAll])

  function applyFiltro(e: Entrada) {
    const d = parseISO(e.date.slice(0, 10))
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (filtro === 'hoje') { const next = new Date(today); next.setDate(next.getDate() + 1); return d >= today && d < next }
    if (filtro === 'semana') return isWithinInterval(d, { start: startOfWeek(today, { locale: ptBR }), end: endOfWeek(today, { locale: ptBR }) })
    if (filtro === 'semana_passada') { const prev = subWeeks(today, 1); return isWithinInterval(d, { start: startOfWeek(prev, { locale: ptBR }), end: endOfWeek(prev, { locale: ptBR }) }) }
    return isWithinInterval(d, { start: startOfMonth(today), end: endOfMonth(today) })
  }

  const filtered = entradas.filter(e => applyFiltro(e) && (catFiltro === 'todos' || e.tipo === catFiltro))
  const total = r2(filtered.reduce((s, e) => r2(s + e.valor), 0))

  function reset() { setDescricao(''); setValor(0); setSemana(''); setPago(false); setDiaVenc('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (tipo === 'insumo') {
        await fetch('/api/fechamento/insumos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, fornecedor: descricao, valor }) })
      } else if (tipo === 'funcionario') {
        await fetch('/api/fechamento/funcionarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, nome: descricao, semana, valor }) })
      } else {
        await fetch('/api/fechamento/contas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, despesa: descricao, valor, pago, diaVencimento: diaVenc ? parseInt(diaVenc) : null }) })
      }
      reset(); setOpen(false); fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(e: Entrada) {
    if (!confirm('Excluir este registro?')) return
    const endpoints: Record<Tipo, string> = {
      insumo: `/api/fechamento/insumos/${e.id}`,
      funcionario: `/api/fechamento/funcionarios/${e.id}`,
      conta: `/api/fechamento/contas/${e.id}`,
    }
    await fetch(endpoints[e.tipo], { method: 'DELETE' })
    fetchAll()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-display font-semibold text-gray-800 dark:text-gray-100">Registros</h1>

      {/* Period filter */}
      <div className="flex gap-1.5 flex-wrap">
        {filtroOpts.map(opt => (
          <button key={opt.key} onClick={() => setFiltro(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filtro === opt.key ? 'bg-primary text-white' : 'bg-white dark:bg-zinc-900 border border-cream-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-primary hover:text-primary'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5">
        {(['todos', 'insumo', 'funcionario', 'conta'] as const).map(c => (
          <button key={c} onClick={() => setCatFiltro(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              catFiltro === c ? 'bg-gray-800 dark:bg-zinc-200 text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 border border-cream-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400'
            }`}>
            {c === 'todos' ? 'Todos' : tipoLabel[c]}
          </button>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100">R$ {fmt(total)}</span>
        <span className="text-xs text-gray-400 dark:text-zinc-500">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span>
        {loading && <span className="text-xs text-gray-400">•••</span>}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-gray-400 dark:text-zinc-500">Nenhum registro no período</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800 divide-y divide-cream-200 dark:divide-zinc-800 overflow-hidden shadow-sm">
          {filtered.map(e => (
            <div key={`${e.tipo}-${e.id}`} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${tipoCls[e.tipo]}`}>
                {tipoLabel[e.tipo]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{e.descricao}</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500">
                  {format(parseISO(e.date.slice(0, 10)), 'dd/MM', { locale: ptBR })}
                  {e.semana ? ` · ${e.semana}` : ''}
                  {e.tipo === 'conta' && e.diaVencimento ? ` · vence dia ${e.diaVencimento}` : ''}
                  {e.tipo === 'conta' ? ` · ${e.pago ? 'Pago' : 'Pendente'}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmt(e.valor)}</span>
                <button onClick={() => handleDelete(e)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/25 flex items-center justify-center z-30 hover:bg-primary-dark transition-all active:scale-95"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add bottom sheet */}
      <BottomSheet open={open} onClose={() => { setOpen(false); reset() }} title="Novo Registro">
        <div className="flex gap-1.5 mb-5">
          {(['insumo', 'funcionario', 'conta'] as Tipo[]).map(t => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                tipo === t ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-primary hover:text-primary'
              }`}>
              {tipoLabel[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">
              {tipo === 'insumo' ? 'Fornecedor' : tipo === 'funcionario' ? 'Nome' : 'Despesa'}
            </label>
            <input type="text" required value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder={tipo === 'insumo' ? 'PMG, Sacolão, CristauLat...' : ''}
              className={inp} />
          </div>
          <CurrencyInput label="Valor" value={valor} onChange={setValor} required />

          {tipo === 'funcionario' && (
            <div>
              <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Semana</label>
              <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
            </div>
          )}

          {tipo === 'conta' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Dia vencimento</label>
                <input type="number" value={diaVenc} onChange={e => setDiaVenc(e.target.value)} placeholder="15" min="1" max="31" className={inp} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="pago-r" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="pago-r" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">Já pago</label>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || valor === 0}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors mt-1">
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
