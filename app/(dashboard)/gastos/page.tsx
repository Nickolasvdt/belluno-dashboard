'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import CurrencyInput from '@/components/CurrencyInput'

type Tipo = 'insumo' | 'funcionario' | 'conta'

type Entrada = {
  id: number
  tipo: Tipo
  date: string
  descricao: string
  valor: number
  semana?: string | null
  pago?: boolean
}

type Filtro = 'hoje' | 'semana' | 'semana_passada' | 'mes' | 'custom'

function round2(n: number) { return Math.round(n * 100) / 100 }
function formatBRL(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const inputCls = 'px-3 py-2 border border-gray-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
const labelCls = 'block text-xs text-gray-500 dark:text-zinc-400 mb-1'
const card = 'bg-white dark:bg-zinc-900 rounded-xl border border-cream-200 dark:border-zinc-800 shadow-sm'

const tipoCls: Record<Tipo, string> = {
  insumo: 'bg-amber-50 dark:bg-zinc-800 text-amber-700 dark:text-amber-400',
  funcionario: 'bg-red-50 dark:bg-zinc-800 text-primary',
  conta: 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400',
}
const tipoLabel: Record<Tipo, string> = {
  insumo: 'Insumo',
  funcionario: 'Funcionário',
  conta: 'Conta',
}

export default function GastosPage() {
  const now = new Date()
  const [filtro, setFiltro] = useState<Filtro>('semana')
  const [mesFiltro, setMesFiltro] = useState(now.getMonth() + 1)
  const [anoFiltro, setAnoFiltro] = useState(now.getFullYear())

  const [tipo, setTipo] = useState<Tipo>('insumo')
  const [date, setDate] = useState(format(now, 'yyyy-MM-dd'))
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  const [semana, setSemana] = useState('')
  const [pago, setPago] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [loading, setLoading] = useState(false)

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      let mes = mesFiltro, ano = anoFiltro
      if (filtro !== 'custom') { mes = now.getMonth() + 1; ano = now.getFullYear() }
      const qs = `mes=${mes}&ano=${ano}`
      const [ins, func, cont] = await Promise.all([
        fetch(`/api/fechamento/insumos?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/funcionarios?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/contas?${qs}`).then(r => r.json()),
      ])
      const merged: Entrada[] = [
        ...((Array.isArray(ins) ? ins : []).map((i: any) => ({ id: i.id, tipo: 'insumo' as Tipo, date: i.date, descricao: i.fornecedor, valor: i.valor }))),
        ...((Array.isArray(func) ? func : []).map((f: any) => ({ id: f.id, tipo: 'funcionario' as Tipo, date: f.date, descricao: f.nome, valor: f.valor, semana: f.semana }))),
        ...((Array.isArray(cont) ? cont : []).map((c: any) => ({ id: c.id, tipo: 'conta' as Tipo, date: c.date, descricao: c.despesa, valor: c.valor, pago: c.pago }))),
      ]
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEntradas(merged)
    } finally {
      setLoading(false)
    }
  }, [filtro, mesFiltro, anoFiltro])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = entradas.filter(e => {
    const d = new Date(e.date)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (filtro === 'hoje') {
      const next = new Date(today); next.setDate(next.getDate() + 1)
      return d >= today && d < next
    }
    if (filtro === 'semana') return isWithinInterval(d, { start: startOfWeek(today, { locale: ptBR }), end: endOfWeek(today, { locale: ptBR }) })
    if (filtro === 'semana_passada') {
      const prev = subWeeks(today, 1)
      return isWithinInterval(d, { start: startOfWeek(prev, { locale: ptBR }), end: endOfWeek(prev, { locale: ptBR }) })
    }
    if (filtro === 'mes') return isWithinInterval(d, { start: startOfMonth(today), end: endOfMonth(today) })
    return true
  })

  const totalFiltrado = round2(filtered.reduce((acc, e) => round2(acc + e.valor), 0))
  const totalInsumos = round2(filtered.filter(e => e.tipo === 'insumo').reduce((acc, e) => round2(acc + e.valor), 0))
  const totalFuncionarios = round2(filtered.filter(e => e.tipo === 'funcionario').reduce((acc, e) => round2(acc + e.valor), 0))
  const totalContas = round2(filtered.filter(e => e.tipo === 'conta').reduce((acc, e) => round2(acc + e.valor), 0))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim() || valor === 0) return
    setSubmitting(true)
    try {
      if (tipo === 'insumo') {
        await fetch('/api/fechamento/insumos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, fornecedor: descricao, valor }) })
      } else if (tipo === 'funcionario') {
        await fetch('/api/fechamento/funcionarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, nome: descricao, semana, valor }) })
      } else {
        await fetch('/api/fechamento/contas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, despesa: descricao, valor, pago }) })
      }
      setDescricao(''); setValor(0); setSemana(''); setPago(false)
      fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(entrada: Entrada) {
    if (!confirm('Excluir este registro?')) return
    const endpoints: Record<Tipo, string> = {
      insumo: `/api/fechamento/insumos/${entrada.id}`,
      funcionario: `/api/fechamento/funcionarios/${entrada.id}`,
      conta: `/api/fechamento/contas/${entrada.id}`,
    }
    await fetch(endpoints[entrada.tipo], { method: 'DELETE' })
    fetchAll()
  }

  const filtroOpts: { key: Filtro; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'semana_passada', label: 'Semana passada' },
    { key: 'mes', label: 'Este mês' },
    { key: 'custom', label: 'Mês/Ano' },
  ]

  return (
    <div className="min-w-0">
      <h2 className="text-xl font-display font-semibold text-gray-800 dark:text-gray-100 mb-5">Gastos Rápidos</h2>

      {/* Formulário */}
      <div className={`${card} p-4 sm:p-5 mb-5`}>
        {/* Tipo selector */}
        <div className="flex gap-1 mb-4">
          {(['insumo', 'funcionario', 'conta'] as Tipo[]).map(t => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                tipo === t ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-primary hover:text-primary'
              }`}>
              {tipoLabel[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
            <div>
              <CurrencyInput label="Valor" value={valor} onChange={v => setValor(v)} required />
            </div>
            <div className={tipo === 'funcionario' ? '' : 'col-span-2 md:col-span-2'}>
              <label className={labelCls}>{tipo === 'insumo' ? 'Fornecedor' : tipo === 'funcionario' ? 'Nome' : 'Despesa'}</label>
              <input type="text" required value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder={tipo === 'insumo' ? 'Bom Baiano, Lenha...' : tipo === 'funcionario' ? 'Nome' : 'Aluguel...'}
                className={`w-full ${inputCls}`} />
            </div>
            {tipo === 'funcionario' && (
              <div>
                <label className={labelCls}>Semana/Ref.</label>
                <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={`w-full ${inputCls}`} />
              </div>
            )}
            {tipo === 'conta' && (
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="pago" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="pago" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">Pago</label>
              </div>
            )}
          </div>
          <button type="submit" disabled={submitting || !descricao.trim() || valor === 0}
            className="mt-4 w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {submitting ? 'Salvando...' : '+ Adicionar'}
          </button>
        </form>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5 mb-4 items-center">
        {filtroOpts.map(opt => (
          <button key={opt.key} onClick={() => setFiltro(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filtro === opt.key ? 'bg-primary text-white' : 'bg-white dark:bg-zinc-900 border border-cream-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-primary hover:text-primary'
            }`}>
            {opt.label}
          </button>
        ))}
        {filtro === 'custom' && (
          <>
            <select value={mesFiltro} onChange={e => setMesFiltro(parseInt(e.target.value))} className={`${inputCls} w-full sm:w-auto`}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={anoFiltro} onChange={e => setAnoFiltro(parseInt(e.target.value))} className={`${inputCls} w-full sm:w-auto`}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
        {loading && <span className="text-xs text-gray-400 ml-1">Carregando...</span>}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total', value: totalFiltrado, color: 'text-gray-800 dark:text-white' },
          { label: 'Insumos', value: totalInsumos, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Funcionários', value: totalFuncionarios, color: 'text-primary' },
          { label: 'Contas', value: totalContas, color: 'text-gray-500 dark:text-zinc-400' },
        ].map(c => (
          <div key={c.label} className={`${card} p-3 min-w-0`}>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wide">{c.label}</p>
            <p className={`text-base font-bold break-words ${c.color}`}>R$ {formatBRL(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className={`${card} overflow-hidden`}>
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400 dark:text-zinc-500">Nenhum registro no período.</p>
        ) : (
          <div className="divide-y divide-cream-200 dark:divide-zinc-800">
            {filtered.map(e => (
              <div key={`${e.tipo}-${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/60">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${tipoCls[e.tipo]}`}>
                    {tipoLabel[e.tipo]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{e.descricao}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">
                      {format(new Date(e.date), 'dd/MM/yy', { locale: ptBR })}
                      {e.semana ? ` · ${e.semana}` : ''}
                      {e.tipo === 'conta' && e.pago !== undefined ? ` · ${e.pago ? 'Pago' : 'Pendente'}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-primary whitespace-nowrap">R$ {formatBRL(e.valor)}</span>
                  <button onClick={() => handleDelete(e)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xl"
                    title="Excluir">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
