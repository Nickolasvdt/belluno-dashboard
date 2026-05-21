'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import CurrencyInput from '@/components/CurrencyInput'

// ─── Types ───────────────────────────────────────────────────────────────────

type Venda = {
  id: number
  date: string
  avista: number
  debito: number
  credito: number
  pix: number
  ifood: number
  outros: number
  taxas: number
  pizzas: number
  observacao: string | null
}

type Funcionario = {
  id: number
  date: string
  nome: string
  semana: string | null
  valor: number
}

type ContaFixa = {
  id: number
  date: string
  despesa: string
  valor: number
  pago: boolean
  diaVencimento: number | null
}

type Insumo = {
  id: number
  date: string
  fornecedor: string
  valor: number
}

type Tab = 'vendas' | 'funcionarios' | 'contas' | 'insumos'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function sum(arr: number[]) {
  return round2(arr.reduce((acc, v) => round2(acc + v), 0))
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-wood-50 dark:bg-zinc-900 rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-wood-700 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-wood-400 hover:text-wood-600 dark:hover:text-gray-200 hover:bg-wood-200/70 dark:hover:bg-zinc-800 text-2xl font-bold leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FechamentoPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [tab, setTab] = useState<Tab>('vendas')

  const [vendas, setVendas] = useState<Venda[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [contas, setContas] = useState<ContaFixa[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(false)

  const [editVenda, setEditVenda] = useState<Venda | null>(null)
  const [editFuncionario, setEditFuncionario] = useState<Funcionario | null>(null)
  const [editConta, setEditConta] = useState<ContaFixa | null>(null)
  const [editInsumo, setEditInsumo] = useState<Insumo | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const emptyVenda = () => ({ date: format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd'), avista: 0, debito: 0, credito: 0, pix: 0, ifood: 0, outros: 0, taxas: 0, pizzas: 0, observacao: '' })
  const emptyFunc = () => ({ date: format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd'), nome: '', semana: '', valor: 0 })
  const emptyConta = () => ({ date: format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd'), despesa: '', valor: 0, pago: false, diaVencimento: '' })
  const emptyInsumo = () => ({ date: format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd'), fornecedor: '', valor: 0 })

  const [vendaForm, setVendaForm] = useState(emptyVenda())
  const [funcForm, setFuncForm] = useState(emptyFunc())
  const [contaForm, setContaForm] = useState(emptyConta())
  const [insumoForm, setInsumoForm] = useState(emptyInsumo())

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const qs = `mes=${mes}&ano=${ano}`
    try {
      const [v, f, c, i] = await Promise.all([
        fetch(`/api/fechamento/vendas?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/funcionarios?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/contas?${qs}`).then(r => r.json()),
        fetch(`/api/fechamento/insumos?${qs}`).then(r => r.json()),
      ])
      setVendas(Array.isArray(v) ? v : [])
      setFuncionarios(Array.isArray(f) ? f : [])
      setContas(Array.isArray(c) ? c : [])
      setInsumos(Array.isArray(i) ? i : [])
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Métricas ─────────────────────────────────────────────────────────────

  const brutoDia = (v: Venda) => round2(v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros)
  const totalReceita = sum(vendas.map(brutoDia))
  const totalTaxas = sum(vendas.map(v => v.taxas))
  const receitaLiquida = round2(totalReceita - totalTaxas)
  const totalFunc = sum(funcionarios.map(f => f.valor))
  const totalFixas = sum(contas.map(c => c.valor))
  const totalInsumos = sum(insumos.map(i => i.valor))
  const totalDespesa = round2(totalFunc + totalFixas + totalInsumos)
  const lucroLiquido = round2(receitaLiquida - totalDespesa)
  const cmvPct = totalReceita > 0 ? round2((totalInsumos / totalReceita) * 100) : 0
  const totalPizzas = vendas.reduce((acc, v) => acc + v.pizzas, 0)
  const pizzasComReceita = vendas.reduce((acc, v) => brutoDia(v) > 0 ? acc + v.pizzas : acc, 0)
  const ticketMedio = pizzasComReceita > 0 ? round2(totalReceita / pizzasComReceita) : 0

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async function post(url: string, body: object) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }
  async function put(url: string, body: object) {
    return fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }
  async function del(url: string) {
    if (!confirm('Excluir este registro?')) return
    await fetch(url, { method: 'DELETE' })
    fetchAll()
  }

  async function handleVendaSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true)
    try { await post('/api/fechamento/vendas', vendaForm); setVendaForm(emptyVenda()); fetchAll() }
    finally { setSubmitting(false) }
  }
  async function handleVendaEdit() {
    if (!editVenda) return; setSubmitting(true)
    try { await put(`/api/fechamento/vendas/${editVenda.id}`, editVenda); setEditVenda(null); fetchAll() }
    finally { setSubmitting(false) }
  }

  async function handleFuncSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true)
    try { await post('/api/fechamento/funcionarios', funcForm); setFuncForm(emptyFunc()); fetchAll() }
    finally { setSubmitting(false) }
  }
  async function handleFuncEdit() {
    if (!editFuncionario) return; setSubmitting(true)
    try { await put(`/api/fechamento/funcionarios/${editFuncionario.id}`, editFuncionario); setEditFuncionario(null); fetchAll() }
    finally { setSubmitting(false) }
  }

  async function handleContaSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true)
    try {
      await post('/api/fechamento/contas', {
        ...contaForm,
        diaVencimento: (contaForm as any).diaVencimento || null,
      })
      setContaForm(emptyConta()); fetchAll()
    }
    finally { setSubmitting(false) }
  }
  async function handleContaEdit() {
    if (!editConta) return; setSubmitting(true)
    try {
      await put(`/api/fechamento/contas/${editConta.id}`, editConta)
      setEditConta(null); fetchAll()
    }
    finally { setSubmitting(false) }
  }

  async function handleInsumoSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true)
    try { await post('/api/fechamento/insumos', insumoForm); setInsumoForm(emptyInsumo()); fetchAll() }
    finally { setSubmitting(false) }
  }
  async function handleInsumoEdit() {
    if (!editInsumo) return; setSubmitting(true)
    try { await put(`/api/fechamento/insumos/${editInsumo.id}`, editInsumo); setEditInsumo(null); fetchAll() }
    finally { setSubmitting(false) }
  }

  // ─── Classes helpers ──────────────────────────────────────────────────────

  const inputCls = 'w-full px-3 py-2 border border-wood-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm'
  const labelCls = 'block text-sm font-medium text-wood-600 dark:text-gray-300 mb-1'
  const thCls = 'px-3 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase whitespace-nowrap'
  const tdCls = 'px-3 py-3 text-sm text-wood-700 dark:text-gray-100 whitespace-nowrap'
  const saveBtnCls = 'flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors'
  const cancelBtnCls = 'flex-1 py-2 border border-wood-300 dark:border-zinc-700 text-wood-600 dark:text-gray-300 rounded-lg font-medium hover:bg-wood-100 dark:hover:bg-zinc-800 transition-colors'

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div className="min-w-0">
      <h2 className="text-xl sm:text-2xl font-bold text-wood-700 dark:text-gray-100 mb-4 sm:mb-6">Fechamento Mensal</h2>

      {/* Seletor Mês/Ano */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="w-full sm:w-auto px-3 py-2 border border-wood-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-primary">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(parseInt(e.target.value))} className="w-full sm:w-auto px-3 py-2 border border-wood-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-primary">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {loading && <span className="text-sm text-wood-400">Carregando...</span>}
      </div>

      {/* ─── Painel Resumo ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Receita Bruta', value: `R$ ${formatBRL(totalReceita)}`, color: 'text-green-600 dark:text-green-400' },
          { label: 'Taxas (cartão)', value: `- R$ ${formatBRL(totalTaxas)}`, color: 'text-orange-600 dark:text-orange-400' },
          { label: 'Receita Líquida', value: `R$ ${formatBRL(receitaLiquida)}`, color: 'text-green-700 dark:text-green-300' },
          { label: 'CMV %', value: `${cmvPct.toFixed(1)}%`, color: cmvPct <= 30 ? 'text-green-600 dark:text-green-400' : cmvPct <= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400', sub: 'Insumos / Receita' },
          { label: 'Funcionários', value: `R$ ${formatBRL(totalFunc)}`, color: 'text-red-600 dark:text-red-400' },
          { label: 'Contas Fixas', value: `R$ ${formatBRL(totalFixas)}`, color: 'text-red-600 dark:text-red-400' },
          { label: 'Insumos', value: `R$ ${formatBRL(totalInsumos)}`, color: 'text-red-600 dark:text-red-400' },
          { label: 'Total Despesa', value: `R$ ${formatBRL(totalDespesa)}`, color: 'text-red-700 dark:text-red-400' },
          { label: 'Lucro Líquido', value: `R$ ${formatBRL(lucroLiquido)}`, color: lucroLiquido >= 0 ? 'text-green-700 dark:text-green-400 font-bold' : 'text-red-700 dark:text-red-400 font-bold', large: true },
          { label: 'Pizzas', value: `${totalPizzas}`, color: 'text-wood-600 dark:text-gray-300', sub: `Ticket R$ ${formatBRL(ticketMedio)}` },
        ].map(card => (
          <div key={card.label} className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 p-3 shadow-sm min-w-0">
            <p className="text-xs text-wood-500 dark:text-zinc-400 font-medium mb-1">{card.label}</p>
            <p className={`text-sm sm:text-base font-semibold break-words ${card.color}`}>{card.value}</p>
            {card.sub && <p className="text-xs text-wood-400 dark:text-zinc-500 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* ─── Abas ─── */}
      <div className="flex gap-0.5 -mx-3 sm:mx-0 px-3 sm:px-0 mb-4 border-b border-wood-200 dark:border-zinc-800 overflow-x-auto">
        {(['vendas', 'funcionarios', 'contas', 'insumos'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = { vendas: 'Vendas', funcionarios: 'Funcionários', contas: 'Contas Fixas', insumos: 'Insumos' }
          return (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-wood-500 dark:text-zinc-400 hover:text-wood-600 dark:hover:text-gray-200'}`}>
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* ─── ABA VENDAS ─── */}
      {tab === 'vendas' && (
        <div>
          <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 p-4 sm:p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-wood-600 dark:text-gray-300 mb-4">Nova Venda</h3>
            <form onSubmit={handleVendaSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={labelCls}>Data</label>
                  <input type="date" required value={vendaForm.date} onChange={e => setVendaForm({ ...vendaForm, date: e.target.value })} className={inputCls} />
                </div>
                <CurrencyInput label="À Vista" value={vendaForm.avista} onChange={v => setVendaForm({ ...vendaForm, avista: v })} />
                <CurrencyInput label="Débito/Stone" value={vendaForm.debito} onChange={v => setVendaForm({ ...vendaForm, debito: v })} />
                <CurrencyInput label="Crédito/VR" value={vendaForm.credito} onChange={v => setVendaForm({ ...vendaForm, credito: v })} />
                <CurrencyInput label="PIX" value={vendaForm.pix} onChange={v => setVendaForm({ ...vendaForm, pix: v })} />
                <CurrencyInput label="iFood" value={vendaForm.ifood} onChange={v => setVendaForm({ ...vendaForm, ifood: v })} />
                <CurrencyInput label="Outros" value={vendaForm.outros} onChange={v => setVendaForm({ ...vendaForm, outros: v })} />
                <CurrencyInput label="Taxas cartão" value={vendaForm.taxas} onChange={v => setVendaForm({ ...vendaForm, taxas: v })} />
                <div>
                  <label className={labelCls}>Nº Pizzas</label>
                  <input type="number" min="0" value={vendaForm.pizzas} onChange={e => setVendaForm({ ...vendaForm, pizzas: parseInt(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={labelCls}>Bruto (auto)</label>
                  <div className="w-full px-3 py-2 border border-wood-200 dark:border-zinc-700 rounded-md bg-wood-100 dark:bg-zinc-800 text-sm font-semibold text-wood-700 dark:text-gray-100">
                    R$ {formatBRL(round2(vendaForm.avista + vendaForm.debito + vendaForm.credito + vendaForm.pix + vendaForm.ifood + vendaForm.outros))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Observação</label>
                  <input type="text" value={vendaForm.observacao ?? ''} onChange={e => setVendaForm({ ...vendaForm, observacao: e.target.value })} className={inputCls} placeholder="Opcional" />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full sm:w-auto px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>

          <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] divide-y divide-wood-200 dark:divide-zinc-800">
                <thead className="bg-wood-100 dark:bg-zinc-800">
                  <tr>
                    {['Data', 'À Vista', 'Déb/Stone', 'Créd/VR', 'PIX', 'iFood', 'Outros', 'Bruto', 'Taxas', 'Líquido', 'Pizzas', 'Ações'].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-wood-200 dark:divide-zinc-800">
                  {vendas.map(v => {
                    const bruto = round2(v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros)
                    const liquido = round2(bruto - v.taxas)
                    const fechado = bruto === 0
                    return (
                      <tr key={v.id} className="hover:bg-wood-100 dark:hover:bg-zinc-800/60">
                        <td className={tdCls}>{format(new Date(v.date), 'dd/MM', { locale: ptBR })}</td>
                        {fechado ? (
                          <td colSpan={9} className="px-3 py-3 text-xs text-wood-400 dark:text-zinc-500">
                            {v.observacao || 'PIZZARIA FECHADA'}
                          </td>
                        ) : (
                          <>
                            <td className={tdCls}>{v.avista > 0 ? `R$ ${formatBRL(v.avista)}` : '—'}</td>
                            <td className={tdCls}>{v.debito > 0 ? `R$ ${formatBRL(v.debito)}` : '—'}</td>
                            <td className={tdCls}>{v.credito > 0 ? `R$ ${formatBRL(v.credito)}` : '—'}</td>
                            <td className={tdCls}>{v.pix > 0 ? `R$ ${formatBRL(v.pix)}` : '—'}</td>
                            <td className={tdCls}>{v.ifood > 0 ? `R$ ${formatBRL(v.ifood)}` : '—'}</td>
                            <td className={tdCls}>{v.outros > 0 ? `R$ ${formatBRL(v.outros)}` : '—'}</td>
                            <td className={`${tdCls} font-semibold text-green-600 dark:text-green-400`}>R$ {formatBRL(bruto)}</td>
                            <td className={`${tdCls} text-orange-600 dark:text-orange-400`}>{v.taxas > 0 ? `R$ ${formatBRL(v.taxas)}` : '—'}</td>
                            <td className={`${tdCls} font-semibold`}>R$ {formatBRL(liquido)}</td>
                            <td className={tdCls}>{v.pizzas || '—'}</td>
                          </>
                        )}
                        <td className={tdCls}>
                          <button onClick={() => setEditVenda({ ...v })} className="text-primary hover:text-primary-dark text-sm font-medium mr-3">Editar</button>
                          <button onClick={() => del(`/api/fechamento/vendas/${v.id}`)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium">Excluir</button>
                        </td>
                      </tr>
                    )
                  })}
                  {vendas.length === 0 && (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-sm text-wood-400 dark:text-zinc-500">Nenhuma venda registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA FUNCIONÁRIOS ─── */}
      {tab === 'funcionarios' && (
        <div>
          <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 p-4 sm:p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-wood-600 dark:text-gray-300 mb-4">Novo Pagamento</h3>
            <form onSubmit={handleFuncSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" required value={funcForm.date} onChange={e => setFuncForm({ ...funcForm, date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Nome</label>
                  <input type="text" required value={funcForm.nome} onChange={e => setFuncForm({ ...funcForm, nome: e.target.value })} className={inputCls} placeholder="Nome do funcionário" />
                </div>
                <div>
                  <label className={labelCls}>Semana/Ref.</label>
                  <input type="text" value={funcForm.semana} onChange={e => setFuncForm({ ...funcForm, semana: e.target.value })} className={inputCls} placeholder="Ex: Semana 1" />
                </div>
                <CurrencyInput label="Valor" value={funcForm.valor} onChange={v => setFuncForm({ ...funcForm, valor: v })} required />
              </div>
              <button type="submit" disabled={submitting} className="w-full sm:w-auto px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>
          <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[680px] divide-y divide-wood-200 dark:divide-zinc-800">
                <thead className="bg-wood-100 dark:bg-zinc-800">
                  <tr>{['Data', 'Nome', 'Semana/Ref.', 'Valor', 'Ações'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-wood-200 dark:divide-zinc-800">
                  {funcionarios.map(f => (
                    <tr key={f.id} className="hover:bg-wood-100 dark:hover:bg-zinc-800/60">
                      <td className={tdCls}>{format(new Date(f.date), 'dd/MM', { locale: ptBR })}</td>
                      <td className={tdCls}>{f.nome}</td>
                      <td className={`${tdCls} text-wood-500 dark:text-zinc-400`}>{f.semana || '—'}</td>
                      <td className={`${tdCls} font-semibold text-red-600 dark:text-red-400`}>R$ {formatBRL(f.valor)}</td>
                      <td className={tdCls}>
                        <button onClick={() => setEditFuncionario({ ...f })} className="text-primary hover:text-primary-dark text-sm font-medium mr-3">Editar</button>
                        <button onClick={() => del(`/api/fechamento/funcionarios/${f.id}`)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {funcionarios.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-wood-400 dark:text-zinc-500">Nenhum pagamento registrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA CONTAS FIXAS ─── */}
      {tab === 'contas' && (
        <div>
          <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 p-4 sm:p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-wood-600 dark:text-gray-300 mb-4">Nova Conta Fixa</h3>
            <form onSubmit={handleContaSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                <div>
                  <label className={labelCls}>Data de Lançamento</label>
                  <input type="date" required value={contaForm.date} onChange={e => setContaForm({ ...contaForm, date: e.target.value })} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Despesa / Descrição</label>
                  <input type="text" required value={contaForm.despesa} onChange={e => setContaForm({ ...contaForm, despesa: e.target.value })} className={inputCls} placeholder="Ex: Aluguel, Luz, Sabesp..." />
                </div>
                <CurrencyInput label="Valor" value={contaForm.valor} onChange={v => setContaForm({ ...contaForm, valor: v })} required />
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 mb-4">
                <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-2">
                  <label className="text-sm text-wood-600 dark:text-zinc-400">Vence todo dia:</label>
                  <select
                    value={(contaForm as any).diaVencimento || ''}
                    onChange={e => setContaForm({ ...contaForm, ...(contaForm as any), diaVencimento: e.target.value || null })}
                    className="w-full min-[420px]:w-auto px-3 py-1.5 border border-wood-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-primary"
                  >
                    <option value="">— sem recorrência —</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>Dia {d}</option>
                    ))}
                  </select>
                  {(contaForm as any).diaVencimento && (
                    <span className="text-xs text-primary font-medium bg-red-50 dark:bg-primary/10 px-2 py-0.5 rounded-full">Recorrente</span>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={contaForm.pago} onChange={e => setContaForm({ ...contaForm, pago: e.target.checked })} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-wood-600 dark:text-gray-300">Marcar como pago</span>
                </label>
              </div>
              <button type="submit" disabled={submitting} className="w-full sm:w-auto px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>
          <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[800px] divide-y divide-wood-200 dark:divide-zinc-800">
                <thead className="bg-wood-100 dark:bg-zinc-800">
                  <tr>{['Data', 'Despesa', 'Vencimento', 'Valor', 'Status', 'Ações'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-wood-200 dark:divide-zinc-800">
                  {contas.map(c => (
                    <tr key={c.id} className="hover:bg-wood-100 dark:hover:bg-zinc-800/60">
                      <td className={tdCls}>{format(new Date(c.date), 'dd/MM', { locale: ptBR })}</td>
                      <td className={tdCls}>{c.despesa}</td>
                      <td className={`${tdCls}`}>
                        {c.diaVencimento
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-red-50 dark:bg-primary/10 px-2 py-0.5 rounded-full">🔄 Todo dia {c.diaVencimento}</span>
                          : <span className="text-wood-400 dark:text-zinc-600">—</span>
                        }
                      </td>
                      <td className={`${tdCls} font-semibold text-red-600 dark:text-red-400`}>R$ {formatBRL(c.valor)}</td>
                      <td className={tdCls}>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.pago ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                          {c.pago ? '✓ Pago' : '⏳ Pendente'}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <button onClick={() => setEditConta({ ...c })} className="text-primary hover:text-primary-dark text-sm font-medium mr-3">Editar</button>
                        <button onClick={() => del(`/api/fechamento/contas/${c.id}`)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {contas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-wood-400 dark:text-zinc-600">Nenhuma conta fixa registrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA INSUMOS ─── */}
      {tab === 'insumos' && (
        <div>
          <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 p-4 sm:p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-wood-600 dark:text-gray-300 mb-4">Novo Insumo / Compra</h3>
            <form onSubmit={handleInsumoSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={labelCls}>Data</label>
                  <input type="date" required value={insumoForm.date} onChange={e => setInsumoForm({ ...insumoForm, date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fornecedor / Descrição</label>
                  <input type="text" required value={insumoForm.fornecedor} onChange={e => setInsumoForm({ ...insumoForm, fornecedor: e.target.value })} className={inputCls} placeholder="Ex: PMG, Sacolão, Lenha..." />
                </div>
                <CurrencyInput label="Valor" value={insumoForm.valor} onChange={v => setInsumoForm({ ...insumoForm, valor: v })} required />
              </div>
              <button type="submit" disabled={submitting} className="w-full sm:w-auto px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>
          <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[620px] divide-y divide-wood-200 dark:divide-zinc-800">
                <thead className="bg-wood-100 dark:bg-zinc-800">
                  <tr>{['Data', 'Fornecedor / Descrição', 'Valor', 'Ações'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-wood-200 dark:divide-zinc-800">
                  {insumos.map(i => (
                    <tr key={i.id} className="hover:bg-wood-100 dark:hover:bg-zinc-800/60">
                      <td className={tdCls}>{format(new Date(i.date), 'dd/MM', { locale: ptBR })}</td>
                      <td className={tdCls}>{i.fornecedor}</td>
                      <td className={`${tdCls} font-semibold text-red-600 dark:text-red-400`}>R$ {formatBRL(i.valor)}</td>
                      <td className={tdCls}>
                        <button onClick={() => setEditInsumo({ ...i })} className="text-primary hover:text-primary-dark text-sm font-medium mr-3">Editar</button>
                        <button onClick={() => del(`/api/fechamento/insumos/${i.id}`)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {insumos.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-wood-400 dark:text-zinc-500">Nenhum insumo registrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modais de Edição ─── */}

      {editVenda && (
        <Modal title="Editar Venda" onClose={() => setEditVenda(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="sm:col-span-2">
              <label className={labelCls}>Data</label>
              <input type="date" value={editVenda.date.slice(0, 10)} onChange={e => setEditVenda({ ...editVenda, date: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="À Vista" value={editVenda.avista} onChange={v => setEditVenda({ ...editVenda, avista: v })} />
            <CurrencyInput label="Débito/Stone" value={editVenda.debito} onChange={v => setEditVenda({ ...editVenda, debito: v })} />
            <CurrencyInput label="Crédito/VR" value={editVenda.credito} onChange={v => setEditVenda({ ...editVenda, credito: v })} />
            <CurrencyInput label="PIX" value={editVenda.pix} onChange={v => setEditVenda({ ...editVenda, pix: v })} />
            <CurrencyInput label="iFood" value={editVenda.ifood} onChange={v => setEditVenda({ ...editVenda, ifood: v })} />
            <CurrencyInput label="Outros" value={editVenda.outros} onChange={v => setEditVenda({ ...editVenda, outros: v })} />
            <CurrencyInput label="Taxas de cartão" value={editVenda.taxas} onChange={v => setEditVenda({ ...editVenda, taxas: v })} />
            <div>
              <label className={labelCls}>Nº Pizzas</label>
              <input type="number" min="0" value={editVenda.pizzas} onChange={e => setEditVenda({ ...editVenda, pizzas: parseInt(e.target.value) || 0 })} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observação</label>
              <input type="text" value={editVenda.observacao ?? ''} onChange={e => setEditVenda({ ...editVenda, observacao: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleVendaEdit} disabled={submitting} className={saveBtnCls}>{submitting ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => setEditVenda(null)} className={cancelBtnCls}>Cancelar</button>
          </div>
        </Modal>
      )}

      {editFuncionario && (
        <Modal title="Editar Funcionário" onClose={() => setEditFuncionario(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={editFuncionario.date.slice(0, 10)} onChange={e => setEditFuncionario({ ...editFuncionario, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" value={editFuncionario.nome} onChange={e => setEditFuncionario({ ...editFuncionario, nome: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Semana/Ref.</label>
              <input type="text" value={editFuncionario.semana ?? ''} onChange={e => setEditFuncionario({ ...editFuncionario, semana: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="Valor" value={editFuncionario.valor} onChange={v => setEditFuncionario({ ...editFuncionario, valor: v })} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleFuncEdit} disabled={submitting} className={saveBtnCls}>{submitting ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => setEditFuncionario(null)} className={cancelBtnCls}>Cancelar</button>
          </div>
        </Modal>
      )}

      {editConta && (
        <Modal title="Editar Conta Fixa" onClose={() => setEditConta(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={editConta.date.slice(0, 10)} onChange={e => setEditConta({ ...editConta, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Despesa</label>
              <input type="text" value={editConta.despesa} onChange={e => setEditConta({ ...editConta, despesa: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="Valor" value={editConta.valor} onChange={v => setEditConta({ ...editConta, valor: v })} />
            <div>
              <label className={labelCls}>Vence todo dia</label>
              <select
                value={editConta.diaVencimento ?? ''}
                onChange={e => setEditConta({ ...editConta, diaVencimento: e.target.value ? parseInt(e.target.value) : null })}
                className={inputCls}
              >
                <option value="">— sem recorrência —</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>Dia {d}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editConta.pago} onChange={e => setEditConta({ ...editConta, pago: e.target.checked })} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-wood-600 dark:text-gray-300">Pago</span>
              </label>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleContaEdit} disabled={submitting} className={saveBtnCls}>{submitting ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => setEditConta(null)} className={cancelBtnCls}>Cancelar</button>
          </div>
        </Modal>
      )}

      {editInsumo && (
        <Modal title="Editar Insumo" onClose={() => setEditInsumo(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={editInsumo.date.slice(0, 10)} onChange={e => setEditInsumo({ ...editInsumo, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fornecedor</label>
              <input type="text" value={editInsumo.fornecedor} onChange={e => setEditInsumo({ ...editInsumo, fornecedor: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="Valor" value={editInsumo.valor} onChange={v => setEditInsumo({ ...editInsumo, valor: v })} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleInsumoEdit} disabled={submitting} className={saveBtnCls}>{submitting ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => setEditInsumo(null)} className={cancelBtnCls}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
