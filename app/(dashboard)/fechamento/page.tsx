'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import BottomSheet from '@/components/BottomSheet'
import CurrencyInput from '@/components/CurrencyInput'

type Tab = 'vendas' | 'funcionarios' | 'insumos' | 'contas'

type Venda = { id: number; date: string; avista: number; debito: number; credito: number; pix: number; ifood: number; outros: number; taxas: number; pizzas: number; observacao?: string | null }
type Funcionario = { id: number; date: string; nome: string; semana?: string | null; valor: number }
type Insumo = { id: number; date: string; fornecedor: string; valor: number }
type Conta = { id: number; date: string; despesa: string; valor: number; pago: boolean; diaVencimento?: number | null }

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function fmtK(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : fmt(v) }

const inp = 'w-full px-3 py-2.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

const TABS: { key: Tab; label: string }[] = [
  { key: 'vendas', label: 'Vendas' },
  { key: 'funcionarios', label: 'Funcionários' },
  { key: 'insumos', label: 'Insumos' },
  { key: 'contas', label: 'Contas' },
]

export default function MesPage() {
  const now = new Date()
  const [ref, setRef] = useState(startOfMonth(now))
  const [tab, setTab] = useState<Tab>('vendas')
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)

  const mes = ref.getMonth() + 1
  const ano = ref.getFullYear()
  const mesLabel = format(ref, 'MMMM yyyy', { locale: ptBR })

  const [vendas, setVendas] = useState<Venda[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const today = format(now, 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [submitting, setSubmitting] = useState(false)
  // Venda fields
  const [avista, setAvista] = useState(0); const [debito, setDebito] = useState(0)
  const [credito, setCredito] = useState(0); const [pix, setPix] = useState(0)
  const [ifood, setIfood] = useState(0); const [outros, setOutros] = useState(0)
  const [taxas, setTaxas] = useState(0); const [pizzas, setPizzas] = useState(0)
  const [obsVenda, setObsVenda] = useState('')
  // Func fields
  const [nome, setNome] = useState(''); const [semana, setSemana] = useState(''); const [valor, setValor] = useState(0)
  // Insumo fields
  const [fornecedor, setFornecedor] = useState('')
  // Conta fields
  const [despesa, setDespesa] = useState(''); const [pago, setPago] = useState(false); const [diaVenc, setDiaVenc] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const qs = `mes=${mes}&ano=${ano}`
    const [v, f, i, c] = await Promise.all([
      fetch(`/api/fechamento/vendas?${qs}`).then(r => r.json()),
      fetch(`/api/fechamento/funcionarios?${qs}`).then(r => r.json()),
      fetch(`/api/fechamento/insumos?${qs}`).then(r => r.json()),
      fetch(`/api/fechamento/contas?${qs}`).then(r => r.json()),
    ])
    setVendas(Array.isArray(v) ? v.sort((a: Venda, b: Venda) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [])
    setFuncionarios(Array.isArray(f) ? f : [])
    setInsumos(Array.isArray(i) ? i : [])
    setContas(Array.isArray(c) ? c.sort((a: Conta, b: Conta) => (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99)) : [])
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Summary calcs
  const totalBruto = r2(vendas.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros), 0))
  const totalTaxas = r2(vendas.reduce((s, v) => r2(s + v.taxas), 0))
  const receita = r2(totalBruto - totalTaxas)
  const totalFunc = r2(funcionarios.reduce((s, f) => r2(s + f.valor), 0))
  const totalInsumos = r2(insumos.reduce((s, i) => r2(s + i.valor), 0))
  const totalContas = r2(contas.reduce((s, c) => r2(s + c.valor), 0))
  const despesas = r2(totalFunc + totalInsumos + totalContas)
  const resultado = r2(receita - despesas)
  const totalPizzas = vendas.reduce((s, v) => s + v.pizzas, 0)

  function resetForm() {
    setDate(today)
    setAvista(0); setDebito(0); setCredito(0); setPix(0); setIfood(0); setOutros(0); setTaxas(0); setPizzas(0); setObsVenda('')
    setNome(''); setSemana(''); setValor(0)
    setFornecedor('')
    setDespesa(''); setPago(false); setDiaVenc('')
    setEditItem(null)
  }

  function openAdd() { resetForm(); setOpen(true) }

  function openEdit(item: any) {
    resetForm()
    setEditItem(item)
    setDate(item.date?.slice(0, 10) ?? today)
    if (tab === 'vendas') {
      setAvista(item.avista ?? 0); setDebito(item.debito ?? 0); setCredito(item.credito ?? 0)
      setPix(item.pix ?? 0); setIfood(item.ifood ?? 0); setOutros(item.outros ?? 0)
      setTaxas(item.taxas ?? 0); setPizzas(item.pizzas ?? 0); setObsVenda(item.observacao ?? '')
    } else if (tab === 'funcionarios') {
      setNome(item.nome ?? ''); setSemana(item.semana ?? ''); setValor(item.valor ?? 0)
    } else if (tab === 'insumos') {
      setFornecedor(item.fornecedor ?? ''); setValor(item.valor ?? 0)
    } else {
      setDespesa(item.despesa ?? ''); setValor(item.valor ?? 0)
      setPago(item.pago ?? false); setDiaVenc(item.diaVencimento ? String(item.diaVencimento) : '')
    }
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const method = editItem ? 'PUT' : 'POST'
      if (tab === 'vendas') {
        const url = editItem ? `/api/fechamento/vendas/${editItem.id}` : '/api/fechamento/vendas'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, avista, debito, credito, pix, ifood, outros, taxas, pizzas, observacao: obsVenda }) })
      } else if (tab === 'funcionarios') {
        const url = editItem ? `/api/fechamento/funcionarios/${editItem.id}` : '/api/fechamento/funcionarios'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, nome, semana, valor }) })
      } else if (tab === 'insumos') {
        const url = editItem ? `/api/fechamento/insumos/${editItem.id}` : '/api/fechamento/insumos'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, fornecedor, valor }) })
      } else {
        const url = editItem ? `/api/fechamento/contas/${editItem.id}` : '/api/fechamento/contas'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, despesa, valor, pago, diaVencimento: diaVenc ? parseInt(diaVenc) : null }) })
      }
      setOpen(false); resetForm(); fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(tab: Tab, id: number) {
    if (!confirm('Excluir?')) return
    const urls: Record<Tab, string> = {
      vendas: `/api/fechamento/vendas/${id}`,
      funcionarios: `/api/fechamento/funcionarios/${id}`,
      insumos: `/api/fechamento/insumos/${id}`,
      contas: `/api/fechamento/contas/${id}`,
    }
    await fetch(urls[tab], { method: 'DELETE' })
    fetchAll()
  }

  async function togglePago(c: Conta) {
    await fetch(`/api/fechamento/contas/${c.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: c.date, despesa: c.despesa, valor: c.valor, pago: !c.pago, diaVencimento: c.diaVencimento }),
    })
    fetchAll()
  }

  const brutoVenda = avista + debito + credito + pix + ifood + outros
  const isPositive = resultado >= 0

  const sheetTitle: Record<Tab, string> = {
    vendas: editItem ? 'Editar Venda' : 'Nova Venda',
    funcionarios: editItem ? 'Editar Funcionário' : 'Novo Funcionário',
    insumos: editItem ? 'Editar Insumo' : 'Novo Insumo',
    contas: editItem ? 'Editar Conta' : 'Nova Conta',
  }

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setRef(subMonths(ref, 1))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-100 dark:hover:bg-zinc-800 text-gray-500 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6" /></svg>
        </button>
        <h1 className="text-base font-display font-semibold text-gray-800 dark:text-gray-100 capitalize">{mesLabel}</h1>
        <button onClick={() => setRef(addMonths(ref, 1))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-100 dark:hover:bg-zinc-800 text-gray-500 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6" /></svg>
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Receita', value: receita, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Despesas', value: despesas, color: 'text-primary' },
          { label: 'Resultado', value: resultado, color: isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary' },
          { label: 'Pizzas', value: totalPizzas, color: 'text-gray-700 dark:text-gray-300', isInt: true },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-zinc-900 rounded-xl border border-cream-200 dark:border-zinc-800 p-3 shadow-sm text-center">
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-sm font-bold ${s.color}`}>
              {s.isInt ? s.value : `R$ ${fmtK(s.value)}`}
            </p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex bg-cream-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.key ? 'bg-white dark:bg-zinc-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-xs text-gray-400">Carregando...</p>}

      {/* Tab content */}
      {!loading && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800 divide-y divide-cream-200 dark:divide-zinc-800 overflow-hidden shadow-sm">

          {/* Vendas */}
          {tab === 'vendas' && (
            <>
              {vendas.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-400 dark:text-zinc-500">Sem vendas neste mês</p>
              ) : vendas.map(v => {
                const br = r2(v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros)
                return (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {format(new Date(v.date), 'dd/MM', { locale: ptBR })}
                          <span className="text-gray-400 dark:text-zinc-500 text-xs ml-1">
                            {format(new Date(v.date), 'EEE', { locale: ptBR })}
                          </span>
                        </p>
                        {v.pizzas > 0 && <span className="text-xs text-gray-400 dark:text-zinc-500">{v.pizzas} pizzas</span>}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        {v.taxas > 0 && `taxas: R$ ${fmt(v.taxas)} · `}líq: R$ {fmt(r2(br - v.taxas))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">R$ {fmt(br)}</p>
                      <button onClick={() => openEdit(v)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-primary hover:bg-primary/5 transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => handleDelete('vendas', v.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Funcionários */}
          {tab === 'funcionarios' && (
            <>
              {funcionarios.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-400 dark:text-zinc-500">Sem registros de funcionários</p>
              ) : funcionarios.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{f.nome}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">
                      {format(new Date(f.date), 'dd/MM', { locale: ptBR })}
                      {f.semana ? ` · ${f.semana}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmt(f.valor)}</p>
                    <button onClick={() => openEdit(f)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-primary hover:bg-primary/5 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete('funcionarios', f.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Insumos */}
          {tab === 'insumos' && (
            <>
              {insumos.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-400 dark:text-zinc-500">Sem insumos neste mês</p>
              ) : insumos.map(i => (
                <div key={i.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{i.fornecedor}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">{format(new Date(i.date), 'dd/MM', { locale: ptBR })}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmt(i.valor)}</p>
                    <button onClick={() => openEdit(i)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-primary hover:bg-primary/5 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete('insumos', i.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Contas */}
          {tab === 'contas' && (
            <>
              {contas.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-400 dark:text-zinc-500">Sem contas neste mês</p>
              ) : contas.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                  <button onClick={() => togglePago(c)} title={c.pago ? 'Marcar pendente' : 'Marcar pago'}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      c.pago ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-zinc-600'
                    }`}>
                    {c.pago && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${c.pago ? 'text-gray-400 dark:text-zinc-500 line-through' : 'text-gray-800 dark:text-gray-100'}`}>{c.despesa}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">
                      {c.diaVencimento ? `Vence dia ${c.diaVencimento}` : format(new Date(c.date), 'dd/MM', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className={`text-sm font-semibold ${c.pago ? 'text-gray-400 dark:text-zinc-500' : 'text-gray-800 dark:text-gray-100'}`}>R$ {fmt(c.valor)}</p>
                    <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-primary hover:bg-primary/5 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete('contas', c.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/25 flex items-center justify-center z-30 hover:bg-primary-dark transition-all active:scale-95"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Form bottom sheet */}
      <BottomSheet open={open} onClose={() => { setOpen(false); resetForm() }} title={sheetTitle[tab]}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} required />
          </div>

          {tab === 'vendas' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput label="À Vista" value={avista} onChange={setAvista} />
                <CurrencyInput label="Stone / Débito" value={debito} onChange={setDebito} />
                <CurrencyInput label="Ticket / VR / Alelo" value={credito} onChange={setCredito} />
                <CurrencyInput label="PIX (Tuna)" value={pix} onChange={setPix} />
                <CurrencyInput label="iFood" value={ifood} onChange={setIfood} />
                <CurrencyInput label="99Food / Keeta" value={outros} onChange={setOutros} />
                <CurrencyInput label="Taxas" value={taxas} onChange={setTaxas} />
                <div>
                  <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Pizzas</label>
                  <input type="number" value={pizzas || ''} onChange={e => setPizzas(parseInt(e.target.value) || 0)} placeholder="0" className={inp} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Observação</label>
                <input type="text" value={obsVenda} onChange={e => setObsVenda(e.target.value)} placeholder="Ex: Fechado, feriado..." className={inp} />
              </div>
              <div className="p-3 bg-cream-100 dark:bg-zinc-800 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-zinc-400">Bruto · Líquido</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  R$ {fmt(brutoVenda)} · <span className="text-emerald-600 dark:text-emerald-400">R$ {fmt(r2(brutoVenda - taxas))}</span>
                </p>
              </div>
            </div>
          )}

          {tab === 'funcionarios' && (
            <>
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Nome</label>
                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Semana</label>
                <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
              </div>
            </>
          )}

          {tab === 'insumos' && (
            <>
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Fornecedor</label>
                <input type="text" required value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="PMG, Sacolão, CristauLat..." className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
            </>
          )}

          {tab === 'contas' && (
            <>
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Despesa</label>
                <input type="text" required value={despesa} onChange={e => setDespesa(e.target.value)} placeholder="Aluguel, Luz, Vivo..." className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Dia vencimento</label>
                  <input type="number" value={diaVenc} onChange={e => setDiaVenc(e.target.value)} placeholder="15" min="1" max="31" className={inp} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="pago-mes" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <label htmlFor="pago-mes" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">Já pago</label>
                </div>
              </div>
            </>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors mt-1">
            {submitting ? 'Salvando...' : editItem ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
