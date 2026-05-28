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

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all'

const tipoCls: Record<Tipo, string> = {
  insumo:      'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  funcionario: 'bg-red-50 dark:bg-red-900/20 text-primary dark:text-red-400',
  conta:       'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400',
}
const tipoLabel: Record<Tipo, string> = { insumo: 'Insumo', funcionario: 'Func.', conta: 'Conta' }

const filtroOpts: { key: Filtro; label: string }[] = [
  { key: 'hoje',          label: 'Hoje' },
  { key: 'semana',        label: 'Esta semana' },
  { key: 'semana_passada',label: 'Semana passada' },
  { key: 'mes',           label: 'Este mês' },
]

export default function RegistrosPage() {
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()
  const prevMes = mes === 1 ? 12 : mes - 1
  const prevAno = mes === 1 ? ano - 1 : ano

  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('mes')
  const [catFiltro, setCatFiltro] = useState<Tipo | 'todos'>('todos')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
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
      const qsPrev = `mes=${prevMes}&ano=${prevAno}`
      const [ins, func, cont, insPrev, funcPrev, contPrev] = await Promise.all([
        fetch(`/api/fechamento/insumos?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/funcionarios?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/contas?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/insumos?${qsPrev}`).then(r => r.json()),
        fetch(`/api/fechamento/funcionarios?${qsPrev}`).then(r => r.json()),
        fetch(`/api/fechamento/contas?${qsPrev}`).then(r => r.json()),
      ])
      const allIns  = [...(Array.isArray(ins)  ? ins  : []), ...(Array.isArray(insPrev)  ? insPrev  : [])]
      const allFunc = [...(Array.isArray(func) ? func : []), ...(Array.isArray(funcPrev) ? funcPrev : [])]
      const allCont = [...(Array.isArray(cont) ? cont : []), ...(Array.isArray(contPrev) ? contPrev : [])]
      const merged: Entrada[] = [
        ...allIns.map((i: any)  => ({ id: i.id, tipo: 'insumo'      as Tipo, date: i.date, descricao: i.fornecedor, valor: i.valor })),
        ...allFunc.map((f: any) => ({ id: f.id, tipo: 'funcionario'  as Tipo, date: f.date, descricao: f.nome, valor: f.valor, semana: f.semana })),
        ...allCont.map((c: any) => ({ id: c.id, tipo: 'conta'        as Tipo, date: c.date, descricao: c.despesa, valor: c.valor, pago: c.pago, diaVencimento: c.diaVencimento })),
      ]
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEntradas(merged)
    } finally { setLoading(false) }
  }, [mes, ano, prevMes, prevAno])

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

  function reset() {
    setEditId(null)
    setDescricao(''); setValor(0); setSemana(''); setPago(false); setDiaVenc('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
  }

  function openEdit(e: Entrada) {
    setEditId(e.id)
    setTipo(e.tipo)
    setDate(e.date.slice(0, 10))
    setDescricao(e.descricao)
    setValor(e.valor)
    setSemana(e.semana ?? '')
    setPago(e.pago ?? false)
    setDiaVenc(e.diaVencimento ? String(e.diaVencimento) : '')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const method = editId ? 'PUT' : 'POST'
      if (tipo === 'insumo') {
        const url = editId ? `/api/fechamento/insumos/${editId}` : '/api/fechamento/insumos'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, fornecedor: descricao, valor }) })
      } else if (tipo === 'funcionario') {
        const url = editId ? `/api/fechamento/funcionarios/${editId}` : '/api/fechamento/funcionarios'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, nome: descricao, semana, valor }) })
      } else {
        const url = editId ? `/api/fechamento/contas/${editId}` : '/api/fechamento/contas'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, despesa: descricao, valor, pago, diaVencimento: diaVenc ? parseInt(diaVenc) : null }) })
      }
      reset(); setOpen(false); fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(e: Entrada) {
    const endpoints: Record<Tipo, string> = {
      insumo:      `/api/fechamento/insumos/${e.id}`,
      funcionario: `/api/fechamento/funcionarios/${e.id}`,
      conta:       `/api/fechamento/contas/${e.id}`,
    }
    await fetch(endpoints[e.tipo], { method: 'DELETE' })
    setDeleteConfirm(null)
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
              filtro === opt.key
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-[#171411] border border-cream-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-primary/40 hover:text-primary'
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
              catFiltro === c
                ? 'bg-gray-800 dark:bg-zinc-200 text-white dark:text-zinc-900'
                : 'bg-white dark:bg-[#171411] border border-cream-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-600'
            }`}>
            {c === 'todos' ? 'Todos' : tipoLabel[c]}
          </button>
        ))}
      </div>

      {/* Total + count */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100">R$ {fmt(total)}</span>
        <span className="text-xs text-gray-400 dark:text-zinc-500">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span>
        {loading && <span className="text-xs text-gray-300 dark:text-zinc-700">•••</span>}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] p-10 text-center shadow-sm">
          <p className="text-sm text-gray-400 dark:text-zinc-500">Nenhum registro no período</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
          {filtered.map(e => {
            const key = `${e.tipo}-${e.id}`
            const confirming = deleteConfirm === key
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${tipoCls[e.tipo]}`}>
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
                  {confirming ? (
                    <>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-cream-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-medium">
                        Cancelar
                      </button>
                      <button onClick={() => handleDelete(e)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-medium">
                        Excluir
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmt(e.valor)}</span>
                      <button onClick={() => openEdit(e)}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-primary hover:bg-primary/5 transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteConfirm(key)}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { reset(); setOpen(true) }}
        className="fixed bottom-[5.5rem] right-4 md:bottom-6 md:right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-30 hover:bg-primary-dark transition-all active:scale-95"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add/Edit bottom sheet */}
      <BottomSheet open={open} onClose={() => { setOpen(false); reset() }} title={editId ? 'Editar Registro' : 'Novo Registro'}>
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {(['insumo', 'funcionario', 'conta'] as Tipo[]).map(t => (
            <button key={t} type="button" onClick={() => !editId && setTipo(t)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                tipo === t
                  ? 'bg-primary text-white border-primary'
                  : 'border-cream-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400'
              } ${editId ? 'opacity-60 cursor-default' : 'hover:border-primary/50 hover:text-primary'}`}>
              {tipoLabel[t] === 'Func.' ? 'Funcionário' : tipoLabel[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">
              {tipo === 'insumo' ? 'Fornecedor' : tipo === 'funcionario' ? 'Nome' : 'Despesa'}
            </label>
            <input type="text" required value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder={tipo === 'insumo' ? 'PMG, Sacolão, CristauLat...' : ''}
              className={inp} />
          </div>
          <CurrencyInput label="Valor" value={valor} onChange={setValor} required />

          {tipo === 'funcionario' && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Semana</label>
              <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
            </div>
          )}

          {tipo === 'conta' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Dia vencimento</label>
                <input type="number" value={diaVenc} onChange={e => setDiaVenc(e.target.value)} placeholder="15" min="1" max="31" className={inp} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="pago-r" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="pago-r" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">Já pago</label>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || valor === 0}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-all active:scale-[0.99] mt-1">
            {submitting ? 'Salvando...' : editId ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
