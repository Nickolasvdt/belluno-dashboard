'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, addMonths, subMonths, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import BottomSheet from '@/components/BottomSheet'
import CurrencyInput from '@/components/CurrencyInput'

type Tab     = 'feed' | 'vendas' | 'funcionarios' | 'insumos' | 'contas'
type FeedCat = 'todos' | 'insumo' | 'funcionario' | 'conta'

type Venda       = { id: number; date: string; avista: number; debito: number; credito: number; pix: number; ifood: number; outros: number; taxas: number; pizzas: number; observacao?: string | null }
type Funcionario = { id: number; date: string; nome: string; semana?: string | null; valor: number }
type Insumo      = { id: number; date: string; fornecedor: string; valor: number }
type Conta       = { id: number; date: string; despesa: string; valor: number; pago: boolean; diaVencimento?: number | null }
type FeedEntry   = { id: number; tipo: 'insumo' | 'funcionario' | 'conta'; date: string; descricao: string; valor: number; semana?: string | null; pago?: boolean; diaVencimento?: number | null }

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function fmtK(v: number) {
  if (v === 0) return '–'
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`
  return `R$ ${fmt(v)}`
}

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

const tipoCls: Record<'insumo' | 'funcionario' | 'conta', string> = {
  insumo:      'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  funcionario: 'bg-red-50 dark:bg-red-900/20 text-accent dark:text-red-400',
  conta:       'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400',
}
const tipoLabel: Record<'insumo' | 'funcionario' | 'conta', string> = {
  insumo: 'Insumo', funcionario: 'Func.', conta: 'Conta',
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <button onClick={onEdit}
        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-accent hover:bg-accent/5 transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </button>
    </>
  )
}

function ConfirmDelete({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <button onClick={onCancel}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-cream-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-medium">
        Cancelar
      </button>
      <button onClick={onConfirm}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-medium">
        Excluir
      </button>
    </>
  )
}

export default function MesPage() {
  const now = new Date()
  const [ref, setRef] = useState(startOfMonth(now))
  const [tab, setTab] = useState<Tab>('feed')
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [feedCat, setFeedCat] = useState<FeedCat>('todos')

  const mes = ref.getMonth() + 1
  const ano = ref.getFullYear()
  const mesLabel = format(ref, 'MMMM yyyy', { locale: ptBR })

  const [vendas, setVendas]             = useState<Venda[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [insumos, setInsumos]           = useState<Insumo[]>([])
  const [contas, setContas]             = useState<Conta[]>([])
  const [loading, setLoading]           = useState(true)

  const today = format(now, 'yyyy-MM-dd')
  const [submitting, setSubmitting] = useState(false)
  const [date, setDate]             = useState(today)
  const [avista, setAvista]         = useState(0)
  const [debito, setDebito]         = useState(0)
  const [credito, setCredito]       = useState(0)
  const [pix, setPix]               = useState(0)
  const [ifood, setIfood]           = useState(0)
  const [outros, setOutros]         = useState(0)
  const [taxas, setTaxas]           = useState(0)
  const [pizzas, setPizzas]         = useState(0)
  const [obsVenda, setObsVenda]     = useState('')
  const [nome, setNome]             = useState('')
  const [semana, setSemana]         = useState('')
  const [valor, setValor]           = useState(0)
  const [fornecedor, setFornecedor] = useState('')
  const [despesa, setDespesa]       = useState('')
  const [pago, setPago]             = useState(false)
  const [diaVenc, setDiaVenc]       = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
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
    } finally { setLoading(false) }
  }, [mes, ano])

  useEffect(() => { fetchAll() }, [fetchAll])

  const totalBruto   = r2(vendas.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros), 0))
  const totalTaxas   = r2(vendas.reduce((s, v) => r2(s + v.taxas), 0))
  const receita      = r2(totalBruto - totalTaxas)
  const totalFunc    = r2(funcionarios.reduce((s, f) => r2(s + f.valor), 0))
  const totalInsumos = r2(insumos.reduce((s, i) => r2(s + i.valor), 0))
  const totalContas  = r2(contas.reduce((s, c) => r2(s + c.valor), 0))
  const despesas     = r2(totalFunc + totalInsumos + totalContas)
  const resultado    = r2(receita - despesas)
  const totalPizzas  = vendas.reduce((s, v) => s + v.pizzas, 0)
  const isPositive   = resultado >= 0

  const feedEntries: FeedEntry[] = [
    ...insumos.map(i => ({ id: i.id, tipo: 'insumo' as const, date: i.date, descricao: i.fornecedor, valor: i.valor })),
    ...funcionarios.map(f => ({ id: f.id, tipo: 'funcionario' as const, date: f.date, descricao: f.nome, valor: f.valor, semana: f.semana })),
    ...contas.map(c => ({ id: c.id, tipo: 'conta' as const, date: c.date, descricao: c.despesa, valor: c.valor, pago: c.pago, diaVencimento: c.diaVencimento })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filteredFeed = feedEntries.filter(e => feedCat === 'todos' || e.tipo === feedCat)

  const tabs: { key: Tab; label: string; subtotal: string }[] = [
    { key: 'feed',        label: 'Feed',    subtotal: `${feedEntries.length}` },
    { key: 'vendas',      label: 'Vendas',  subtotal: fmtK(receita) },
    { key: 'funcionarios',label: 'Func.',   subtotal: fmtK(totalFunc) },
    { key: 'insumos',     label: 'Insumos', subtotal: fmtK(totalInsumos) },
    { key: 'contas',      label: 'Contas',  subtotal: fmtK(totalContas) },
  ]

  function resetForm() {
    setDate(today)
    setAvista(0); setDebito(0); setCredito(0); setPix(0); setIfood(0); setOutros(0); setTaxas(0); setPizzas(0); setObsVenda('')
    setNome(''); setSemana(''); setValor(0); setFornecedor('')
    setDespesa(''); setPago(false); setDiaVenc('')
    setEditItem(null)
  }

  function openEdit(item: any) {
    resetForm(); setEditItem(item)
    setDate(item.date?.slice(0, 10) ?? today)
    if (tab === 'vendas') {
      setAvista(item.avista ?? 0); setDebito(item.debito ?? 0); setCredito(item.credito ?? 0)
      setPix(item.pix ?? 0); setIfood(item.ifood ?? 0); setOutros(item.outros ?? 0)
      setTaxas(item.taxas ?? 0); setPizzas(item.pizzas ?? 0); setObsVenda(item.observacao ?? '')
    } else if (tab === 'funcionarios') {
      setNome(item.nome ?? ''); setSemana(item.semana ?? ''); setValor(item.valor ?? 0)
    } else if (tab === 'insumos') {
      setFornecedor(item.fornecedor ?? ''); setValor(item.valor ?? 0)
    } else if (tab === 'contas') {
      setDespesa(item.despesa ?? ''); setValor(item.valor ?? 0)
      setPago(item.pago ?? false); setDiaVenc(item.diaVencimento ? String(item.diaVencimento) : '')
    }
    setOpen(true)
  }

  function openEditFeed(e: FeedEntry) {
    resetForm(); setEditItem(e)
    setDate(e.date.slice(0, 10))
    if (e.tipo === 'insumo') {
      setFornecedor(e.descricao); setValor(e.valor)
    } else if (e.tipo === 'funcionario') {
      setNome(e.descricao); setSemana(e.semana ?? ''); setValor(e.valor)
    } else {
      setDespesa(e.descricao); setValor(e.valor)
      setPago(e.pago ?? false); setDiaVenc(e.diaVencimento ? String(e.diaVencimento) : '')
    }
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const activeTab = tab === 'feed' ? (editItem?.tipo ?? 'insumo') : tab
    try {
      const method = editItem ? 'PUT' : 'POST'
      if (activeTab === 'vendas') {
        const url = editItem ? `/api/fechamento/vendas/${editItem.id}` : '/api/fechamento/vendas'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, avista, debito, credito, pix, ifood, outros, taxas, pizzas, observacao: obsVenda }) })
      } else if (activeTab === 'funcionarios' || activeTab === 'funcionario') {
        const url = editItem ? `/api/fechamento/funcionarios/${editItem.id}` : '/api/fechamento/funcionarios'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, nome, semana, valor }) })
      } else if (activeTab === 'insumos' || activeTab === 'insumo') {
        const url = editItem ? `/api/fechamento/insumos/${editItem.id}` : '/api/fechamento/insumos'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, fornecedor, valor }) })
      } else {
        const url = editItem ? `/api/fechamento/contas/${editItem.id}` : '/api/fechamento/contas'
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, despesa, valor, pago, diaVencimento: diaVenc ? parseInt(diaVenc) : null }) })
      }
      setOpen(false); resetForm(); fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(tabKey: Tab | 'insumo' | 'funcionario' | 'conta', id: number) {
    const map: Record<string, string> = {
      vendas: `/api/fechamento/vendas/${id}`,
      funcionarios: `/api/fechamento/funcionarios/${id}`,
      funcionario:  `/api/fechamento/funcionarios/${id}`,
      insumos: `/api/fechamento/insumos/${id}`,
      insumo:  `/api/fechamento/insumos/${id}`,
      contas: `/api/fechamento/contas/${id}`,
      conta:  `/api/fechamento/contas/${id}`,
    }
    await fetch(map[tabKey], { method: 'DELETE' })
    setDeleteConfirm(null); fetchAll()
  }

  async function togglePago(c: Conta) {
    await fetch(`/api/fechamento/contas/${c.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: c.date, despesa: c.despesa, valor: c.valor, pago: !c.pago, diaVencimento: c.diaVencimento }),
    })
    fetchAll()
  }

  const brutoVenda = avista + debito + credito + pix + ifood + outros

  const sheetTitle: Record<string, string> = {
    feed:         editItem ? `Editar ${editItem.tipo === 'insumo' ? 'Insumo' : editItem.tipo === 'funcionario' ? 'Funcionário' : 'Conta'}` : 'Novo Registro',
    vendas:       editItem ? 'Editar Venda'       : 'Nova Venda',
    funcionarios: editItem ? 'Editar Funcionário' : 'Novo Funcionário',
    insumos:      editItem ? 'Editar Insumo'      : 'Novo Insumo',
    contas:       editItem ? 'Editar Conta'       : 'Nova Conta',
  }

  const emptyMsg: Record<Tab, string> = {
    feed:         'Nenhum registro neste mês',
    vendas:       'Sem vendas neste mês',
    funcionarios: 'Sem registros de funcionários',
    insumos:      'Sem insumos neste mês',
    contas:       'Sem contas neste mês',
  }

  return (
    <div className="space-y-5">

      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button onClick={() => setRef(subMonths(ref, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-zinc-400 transition-colors active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <h1 className="text-base font-display font-semibold text-gray-800 dark:text-gray-100 capitalize">{mesLabel}</h1>
        <button onClick={() => setRef(addMonths(ref, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-zinc-400 transition-colors active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
        </button>
      </div>

      {/* Hero resultado */}
      <div className={`rounded-2xl p-5 ${loading ? 'bg-gray-100 dark:bg-zinc-900' : isPositive ? 'bg-emerald-700' : 'bg-accent'}`}>
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-9 w-40 rounded" />
            <div className="skeleton h-3 w-32 rounded mt-2" />
          </div>
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/60 mb-1">Resultado do mês</p>
            <p className="font-display font-bold text-[clamp(30px,6vw,40px)] leading-none tracking-tight text-white mb-3">
              {isPositive ? '+' : '–'}&nbsp;R$&nbsp;{fmt(Math.abs(resultado))}
            </p>
            <p className="text-xs text-white/70">
              Receita <span className="font-semibold text-white">R$ {fmt(receita)}</span>
              <span className="mx-2 text-white/30">·</span>
              Despesas <span className="font-semibold text-white/85">R$ {fmt(despesas)}</span>
              {totalPizzas > 0 && (
                <><span className="mx-2 text-white/30">·</span><span className="font-semibold text-white">{totalPizzas}</span> pizzas</>
              )}
            </p>
          </>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all shrink-0 ${
              tab === t.key
                ? 'bg-white dark:bg-[#171411] text-gray-800 dark:text-gray-100 shadow-sm border border-cream-200 dark:border-white/[0.06]'
                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
            }`}>
            <span className="text-xs font-semibold">{t.label}</span>
            <span className={`font-mono text-[9px] ${tab === t.key ? 'text-gray-400 dark:text-zinc-500' : 'opacity-40'}`}>{t.subtotal}</span>
          </button>
        ))}
      </div>

      {/* ── FEED ── */}
      {tab === 'feed' && (
        <div className="space-y-3">
          {/* Filtro de categoria */}
          <div className="flex gap-1 flex-wrap">
            {([['todos', 'Todos'], ['insumo', 'Insumo'], ['funcionario', 'Func.'], ['conta', 'Conta']] as [FeedCat, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setFeedCat(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  feedCat === key
                    ? 'bg-gray-800 dark:bg-zinc-200 text-white dark:text-zinc-900 border-gray-800 dark:border-zinc-200'
                    : 'bg-white dark:bg-[#171411] border-cream-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-400'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
          ) : filteredFeed.length === 0 ? (
            <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] p-10 text-center shadow-sm">
              <p className="text-sm text-gray-400 dark:text-zinc-500">{emptyMsg.feed}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
              {filteredFeed.map(e => {
                const key = `feed-${e.tipo}-${e.id}`
                const confirming = deleteConfirm === key
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-3.5">
                    <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${tipoCls[e.tipo]}`}>
                      {tipoLabel[e.tipo]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{e.descricao}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        {format(parseISO(e.date.slice(0, 10)), 'dd/MM', { locale: ptBR })}
                        {e.semana ? ` · ${e.semana}` : ''}
                        {e.tipo === 'conta' && e.diaVencimento ? ` · vence dia ${e.diaVencimento}` : ''}
                        {e.tipo === 'conta' ? (e.pago ? ' · Pago' : ' · Pendente') : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {confirming ? (
                        <ConfirmDelete onCancel={() => setDeleteConfirm(null)} onConfirm={() => handleDelete(e.tipo, e.id)}/>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmt(e.valor)}</span>
                          <RowActions onEdit={() => openEditFeed(e)} onDelete={() => setDeleteConfirm(key)}/>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VENDAS ── */}
      {tab === 'vendas' && (
        loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
        ) : vendas.length === 0 ? (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] p-10 text-center shadow-sm">
            <p className="text-sm text-gray-400 dark:text-zinc-500">{emptyMsg.vendas}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {vendas.map(v => {
              const br = r2(v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros)
              const liq = r2(br - v.taxas)
              const dkey = `vendas-${v.id}`
              const confirming = deleteConfirm === dkey
              return (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {format(parseISO(v.date.slice(0, 10)), "dd/MM · EEEE", { locale: ptBR })}
                      {v.pizzas > 0 && <span className="ml-2 text-xs text-gray-400 dark:text-zinc-500">{v.pizzas} pzs</span>}
                    </p>
                    {!confirming && v.taxas > 0 && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        bruto R$ {fmt(br)} · taxas R$ {fmt(v.taxas)}
                      </p>
                    )}
                    {!confirming && v.observacao && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 italic mt-0.5">{v.observacao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {confirming ? (
                      <ConfirmDelete onCancel={() => setDeleteConfirm(null)} onConfirm={() => handleDelete('vendas', v.id)}/>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">R$ {fmt(liq)}</p>
                        <RowActions onEdit={() => openEdit(v)} onDelete={() => setDeleteConfirm(dkey)}/>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── FUNCIONÁRIOS ── */}
      {tab === 'funcionarios' && (
        loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
        ) : funcionarios.length === 0 ? (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] p-10 text-center shadow-sm">
            <p className="text-sm text-gray-400 dark:text-zinc-500">{emptyMsg.funcionarios}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {funcionarios.map(f => {
              const dkey = `funcionarios-${f.id}`
              const confirming = deleteConfirm === dkey
              return (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{f.nome}</p>
                    {!confirming && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        {format(parseISO(f.date.slice(0, 10)), 'dd/MM', { locale: ptBR })}
                        {f.semana && ` · ${f.semana}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {confirming ? (
                      <ConfirmDelete onCancel={() => setDeleteConfirm(null)} onConfirm={() => handleDelete('funcionarios', f.id)}/>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmt(f.valor)}</p>
                        <RowActions onEdit={() => openEdit(f)} onDelete={() => setDeleteConfirm(dkey)}/>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── INSUMOS ── */}
      {tab === 'insumos' && (
        loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
        ) : insumos.length === 0 ? (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] p-10 text-center shadow-sm">
            <p className="text-sm text-gray-400 dark:text-zinc-500">{emptyMsg.insumos}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {insumos.map(i => {
              const dkey = `insumos-${i.id}`
              const confirming = deleteConfirm === dkey
              return (
                <div key={i.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{i.fornecedor}</p>
                    {!confirming && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        {format(parseISO(i.date.slice(0, 10)), 'dd/MM', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {confirming ? (
                      <ConfirmDelete onCancel={() => setDeleteConfirm(null)} onConfirm={() => handleDelete('insumos', i.id)}/>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmt(i.valor)}</p>
                        <RowActions onEdit={() => openEdit(i)} onDelete={() => setDeleteConfirm(dkey)}/>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── CONTAS ── */}
      {tab === 'contas' && (
        loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
        ) : contas.length === 0 ? (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] p-10 text-center shadow-sm">
            <p className="text-sm text-gray-400 dark:text-zinc-500">{emptyMsg.contas}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {contas.map(c => {
              const dkey = `contas-${c.id}`
              const confirming = deleteConfirm === dkey
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                  {!confirming && (
                    <button onClick={() => togglePago(c)}
                      title={c.pago ? 'Marcar pendente' : 'Marcar pago'}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        c.pago ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-zinc-600'
                      }`}>
                      {c.pago && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${c.pago && !confirming ? 'text-gray-400 dark:text-zinc-600 line-through' : 'text-gray-800 dark:text-gray-100'}`}>
                      {c.despesa}
                    </p>
                    {!confirming && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        {c.diaVencimento ? `Vence dia ${c.diaVencimento}` : format(parseISO(c.date.slice(0, 10)), 'dd/MM', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {confirming ? (
                      <ConfirmDelete onCancel={() => setDeleteConfirm(null)} onConfirm={() => handleDelete('contas', c.id)}/>
                    ) : (
                      <>
                        <p className={`text-sm font-semibold ${c.pago ? 'text-gray-400 dark:text-zinc-600' : 'text-gray-800 dark:text-gray-100'}`}>
                          R$ {fmt(c.valor)}
                        </p>
                        <RowActions onEdit={() => openEdit(c)} onDelete={() => setDeleteConfirm(dkey)}/>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Formulário */}
      <BottomSheet open={open} onClose={() => { setOpen(false); resetForm() }} title={sheetTitle[tab]}>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} required />
          </div>

          {/* Vendas */}
          {tab === 'vendas' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput label="À Vista"              value={avista}  onChange={setAvista}  />
                <CurrencyInput label="Stone / Débito"       value={debito}  onChange={setDebito}  />
                <CurrencyInput label="Ticket / VR / Alelo"  value={credito} onChange={setCredito} />
                <CurrencyInput label="PIX (Tuna)"           value={pix}     onChange={setPix}     />
                <CurrencyInput label="iFood"                value={ifood}   onChange={setIfood}   />
                <CurrencyInput label="99Food / Keeta"       value={outros}  onChange={setOutros}  />
                <CurrencyInput label="Taxas"                value={taxas}   onChange={setTaxas}   />
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Pizzas</label>
                  <input type="number" value={pizzas || ''} onChange={e => setPizzas(parseInt(e.target.value) || 0)} placeholder="0" className={inp} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Observação</label>
                <input type="text" value={obsVenda} onChange={e => setObsVenda(e.target.value)} placeholder="Ex: Fechado, feriado..." className={inp} />
              </div>
              <div className="px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Bruto</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmt(r2(brutoVenda))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 mb-0.5">Líquido</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">R$ {fmt(r2(brutoVenda - taxas))}</p>
                </div>
              </div>
            </div>
          )}

          {/* Funcionários */}
          {tab === 'funcionarios' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Nome</label>
                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Semana</label>
                <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
              </div>
            </>
          )}

          {/* Insumos */}
          {tab === 'insumos' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Fornecedor</label>
                <input type="text" required value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="PMG, Sacolão, CristauLat..." className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
            </>
          )}

          {/* Contas */}
          {(tab === 'contas' || (tab === 'feed' && editItem?.tipo === 'conta')) && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Despesa</label>
                <input type="text" required value={despesa} onChange={e => setDespesa(e.target.value)} placeholder="Aluguel, Luz, Vivo..." className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Dia vencimento</label>
                  <input type="number" value={diaVenc} onChange={e => setDiaVenc(e.target.value)} placeholder="15" min="1" max="31" className={inp} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="pago-mes" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-[#8B2020]" />
                  <label htmlFor="pago-mes" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">Já pago</label>
                </div>
              </div>
            </>
          )}

          {/* Feed edit — insumo */}
          {tab === 'feed' && editItem?.tipo === 'insumo' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Fornecedor</label>
                <input type="text" required value={fornecedor} onChange={e => setFornecedor(e.target.value)} className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
            </>
          )}

          {/* Feed edit — funcionário */}
          {tab === 'feed' && editItem?.tipo === 'funcionario' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Nome</label>
                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Semana</label>
                <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
              </div>
            </>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99] mt-1">
            {submitting ? 'Salvando...' : editItem ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
