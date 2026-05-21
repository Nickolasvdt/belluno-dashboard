'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, isWithinInterval, parseISO } from 'date-fns'
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

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

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

  // Fetch all entries for the selected period
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      let mes = mesFiltro, ano = anoFiltro
      if (filtro !== 'custom') {
        mes = now.getMonth() + 1
        ano = now.getFullYear()
      }
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

  // Filter entries based on current filtro
  const filtered = entradas.filter(e => {
    const d = new Date(e.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (filtro === 'hoje') {
      const nextDay = new Date(today)
      nextDay.setDate(nextDay.getDate() + 1)
      return d >= today && d < nextDay
    }
    if (filtro === 'semana') {
      const start = startOfWeek(today, { locale: ptBR })
      const end = endOfWeek(today, { locale: ptBR })
      return isWithinInterval(d, { start, end })
    }
    if (filtro === 'semana_passada') {
      const prevWeekStart = startOfWeek(subWeeks(today, 1), { locale: ptBR })
      const prevWeekEnd = endOfWeek(subWeeks(today, 1), { locale: ptBR })
      return isWithinInterval(d, { start: prevWeekStart, end: prevWeekEnd })
    }
    if (filtro === 'mes') {
      const start = startOfMonth(today)
      const end = endOfMonth(today)
      return isWithinInterval(d, { start, end })
    }
    // custom: all loaded entries (month/year already filtered by API)
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
        await fetch('/api/fechamento/insumos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, fornecedor: descricao, valor }),
        })
      } else if (tipo === 'funcionario') {
        await fetch('/api/fechamento/funcionarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, nome: descricao, semana, valor }),
        })
      } else {
        await fetch('/api/fechamento/contas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, despesa: descricao, valor, pago }),
        })
      }

      setDescricao('')
      setValor(0)
      setSemana('')
      setPago(false)
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

  const tipoCls: Record<Tipo, string> = {
    insumo: 'bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-sky-400',
    funcionario: 'bg-purple-100 dark:bg-zinc-800 text-purple-700 dark:text-violet-400',
    conta: 'bg-orange-100 dark:bg-zinc-800 text-orange-700 dark:text-amber-400',
  }
  const tipoLabel: Record<Tipo, string> = {
    insumo: 'Insumo',
    funcionario: 'Funcionário',
    conta: 'Conta Fixa',
  }

  const filtroOpts: { key: Filtro; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'semana', label: 'Esta Semana' },
    { key: 'semana_passada', label: 'Semana Passada' },
    { key: 'mes', label: 'Este Mês' },
    { key: 'custom', label: 'Mês/Ano' },
  ]

  const inputCls = 'px-3 py-2 border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-primary focus:border-primary'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

  return (
    <div className="min-w-0">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Gastos Rápidos</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Registre compras, pagamentos e contas. Os dados aparecem automaticamente no Fechamento.</p>

      {/* Formulário rápido */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4 sm:p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Novo Lançamento</h3>
        <form onSubmit={handleSubmit}>
          {/* Tipo selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(['insumo', 'funcionario', 'conta'] as Tipo[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  tipo === t
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary'
                }`}
              >
                {tipoLabel[t]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`w-full ${inputCls}`} />
            </div>
            <div>
              <CurrencyInput label="Valor" value={valor} onChange={v => setValor(v)} required />
            </div>
            <div className={tipo === 'funcionario' ? 'sm:col-span-2 md:col-span-1' : 'sm:col-span-2 md:col-span-2'}>
              <label className={labelCls}>
                {tipo === 'insumo' ? 'Fornecedor / Descrição' : tipo === 'funcionario' ? 'Nome' : 'Despesa'}
              </label>
              <input
                type="text"
                required
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder={tipo === 'insumo' ? 'Ex: Bom Baiano, Lenha...' : tipo === 'funcionario' ? 'Nome do funcionário' : 'Ex: Aluguel'}
                className={`w-full ${inputCls}`}
              />
            </div>
            {tipo === 'funcionario' && (
              <div className="sm:col-span-2 md:col-span-1">
                <label className={labelCls}>Semana/Ref.</label>
                <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={`w-full ${inputCls}`} />
              </div>
            )}
            {tipo === 'conta' && (
              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input type="checkbox" id="pago" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="pago" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Marcar como pago</label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !descricao.trim() || valor === 0}
            className="mt-4 w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Salvando...' : '+ Adicionar'}
          </button>
        </form>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {filtroOpts.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFiltro(opt.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === opt.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {filtro === 'custom' && (
          <>
            <select value={mesFiltro} onChange={e => setMesFiltro(parseInt(e.target.value))} className={`${inputCls} w-full sm:w-auto`}>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={anoFiltro} onChange={e => setAnoFiltro(parseInt(e.target.value))} className={`${inputCls} w-full sm:w-auto`}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
        {loading && <span className="text-sm text-gray-400 sm:ml-2">Carregando...</span>}
      </div>

      {/* Mini resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total', value: totalFiltrado, color: 'text-gray-900 dark:text-gray-100' },
          { label: 'Insumos', value: totalInsumos, color: 'text-blue-600 dark:text-sky-400' },
          { label: 'Funcionários', value: totalFuncionarios, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Contas Fixas', value: totalContas, color: 'text-orange-600 dark:text-orange-400' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-3 shadow-sm min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
            <p className={`text-base font-bold break-words ${c.color}`}>R$ {formatBRL(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum registro no período selecionado.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(e => (
              <div key={`${e.tipo}-${e.id}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800/60">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${tipoCls[e.tipo]}`}>
                    {tipoLabel[e.tipo]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.descricao}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {format(new Date(e.date), 'dd/MM/yy', { locale: ptBR })}
                      {e.semana ? ` · ${e.semana}` : ''}
                      {e.tipo === 'conta' && e.pago !== undefined
                        ? ` · ${e.pago ? '✅ Pago' : '⏳ Pendente'}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 shrink-0 w-full sm:w-auto">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">R$ {formatBRL(e.valor)}</span>
                  <button
                    onClick={() => handleDelete(e)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xl"
                    title="Excluir"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
