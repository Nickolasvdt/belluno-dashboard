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

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ─── Modal reutilizável ───────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">×</button>
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

  // Modal state
  const [editVenda, setEditVenda] = useState<Venda | null>(null)
  const [editFuncionario, setEditFuncionario] = useState<Funcionario | null>(null)
  const [editConta, setEditConta] = useState<ContaFixa | null>(null)
  const [editInsumo, setEditInsumo] = useState<Insumo | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const emptyVenda = () => ({ date: format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd'), avista: 0, debito: 0, credito: 0, pix: 0, ifood: 0, pizzas: 0, observacao: '' })
  const emptyFunc = () => ({ date: format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd'), nome: '', semana: '', valor: 0 })
  const emptyConta = () => ({ date: format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd'), despesa: '', valor: 0, pago: false })
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
        fetch(`/api/fechamento/vendas?${qs}`).then((r) => r.json()),
        fetch(`/api/fechamento/funcionarios?${qs}`).then((r) => r.json()),
        fetch(`/api/fechamento/contas?${qs}`).then((r) => r.json()),
        fetch(`/api/fechamento/insumos?${qs}`).then((r) => r.json()),
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

  // ─── Resumo ───────────────────────────────────────────────────────────────

  const totalReceita = sum(vendas.map((v) => round2(v.avista + v.debito + v.credito + v.pix + v.ifood)))
  const totalFunc = sum(funcionarios.map((f) => f.valor))
  const totalFixas = sum(contas.map((c) => c.valor))
  const totalInsumos = sum(insumos.map((i) => i.valor))
  const totalDespesa = round2(totalFunc + totalFixas + totalInsumos)
  const lucroLiquido = round2(totalReceita - totalDespesa)

  // ─── CRUD helpers ─────────────────────────────────────────────────────────

  async function postData(url: string, body: object) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function putData(url: string, body: object) {
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function deleteData(url: string) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return
    await fetch(url, { method: 'DELETE' })
    fetchAll()
  }

  // ─── Submit handlers ──────────────────────────────────────────────────────

  async function handleVendaSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await postData('/api/fechamento/vendas', vendaForm)
      setVendaForm(emptyVenda())
      fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleVendaEdit() {
    if (!editVenda) return
    setSubmitting(true)
    try {
      await putData(`/api/fechamento/vendas/${editVenda.id}`, editVenda)
      setEditVenda(null)
      fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleFuncSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await postData('/api/fechamento/funcionarios', funcForm)
      setFuncForm(emptyFunc())
      fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleFuncEdit() {
    if (!editFuncionario) return
    setSubmitting(true)
    try {
      await putData(`/api/fechamento/funcionarios/${editFuncionario.id}`, editFuncionario)
      setEditFuncionario(null)
      fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleContaSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await postData('/api/fechamento/contas', contaForm)
      setContaForm(emptyConta())
      fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleContaEdit() {
    if (!editConta) return
    setSubmitting(true)
    try {
      await putData(`/api/fechamento/contas/${editConta.id}`, editConta)
      setEditConta(null)
      fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleInsumoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await postData('/api/fechamento/insumos', insumoForm)
      setInsumoForm(emptyInsumo())
      fetchAll()
    } finally { setSubmitting(false) }
  }

  async function handleInsumoEdit() {
    if (!editInsumo) return
    setSubmitting(true)
    try {
      await putData(`/api/fechamento/insumos/${editInsumo.id}`, editInsumo)
      setEditInsumo(null)
      fetchAll()
    } finally { setSubmitting(false) }
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const thCls = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase'
  const tdCls = 'px-4 py-3 text-sm text-gray-900 dark:text-gray-100'

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Fechamento Mensal</h2>

      {/* Seletor Mês/Ano */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={mes}
          onChange={(e) => setMes(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-primary"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={ano}
          onChange={(e) => setAno(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-primary"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {loading && <span className="text-sm text-gray-400">Carregando...</span>}
      </div>

      {/* Painel Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Receita Bruta', value: totalReceita, color: 'text-green-600 dark:text-green-400' },
          { label: 'Funcionários', value: totalFunc, color: 'text-red-600 dark:text-red-400' },
          { label: 'Contas Fixas', value: totalFixas, color: 'text-red-600 dark:text-red-400' },
          { label: 'Insumos', value: totalInsumos, color: 'text-red-600 dark:text-red-400' },
          { label: 'Total Despesa', value: totalDespesa, color: 'text-red-700 dark:text-red-400' },
          { label: 'Lucro Líquido', value: lucroLiquido, color: lucroLiquido >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400' },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{card.label}</p>
            <p className={`text-lg font-bold ${card.color}`}>R$ {formatBRL(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {(['vendas', 'funcionarios', 'contas', 'insumos'] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = {
            vendas: 'Vendas',
            funcionarios: 'Funcionários',
            contas: 'Contas Fixas',
            insumos: 'Insumos',
          }
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* ─── ABA VENDAS ─── */}
      {tab === 'vendas' && (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Nova Venda</h3>
            <form onSubmit={handleVendaSubmit}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="col-span-2 md:col-span-1">
                  <label className={labelCls}>Data</label>
                  <input type="date" required value={vendaForm.date} onChange={(e) => setVendaForm({ ...vendaForm, date: e.target.value })} className={inputCls} />
                </div>
                <CurrencyInput label="À Vista" value={vendaForm.avista} onChange={(v) => setVendaForm({ ...vendaForm, avista: v })} />
                <CurrencyInput label="Débito" value={vendaForm.debito} onChange={(v) => setVendaForm({ ...vendaForm, debito: v })} />
                <CurrencyInput label="Crédito/VR" value={vendaForm.credito} onChange={(v) => setVendaForm({ ...vendaForm, credito: v })} />
                <CurrencyInput label="PIX" value={vendaForm.pix} onChange={(v) => setVendaForm({ ...vendaForm, pix: v })} />
                <CurrencyInput label="iFood" value={vendaForm.ifood} onChange={(v) => setVendaForm({ ...vendaForm, ifood: v })} />
                <div>
                  <label className={labelCls}>Nº Pizzas</label>
                  <input type="number" min="0" value={vendaForm.pizzas} onChange={(e) => setVendaForm({ ...vendaForm, pizzas: parseInt(e.target.value) || 0 })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Bruto (auto)</label>
                  <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    R$ {formatBRL(round2(vendaForm.avista + vendaForm.debito + vendaForm.credito + vendaForm.pix + vendaForm.ifood))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Observação</label>
                  <input type="text" value={vendaForm.observacao} onChange={(e) => setVendaForm({ ...vendaForm, observacao: e.target.value })} className={inputCls} placeholder="Opcional" />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Data', 'À Vista', 'Débito', 'Crédito/VR', 'PIX', 'iFood', 'Bruto', 'Pizzas', 'Obs.', 'Ações'].map((h) => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {vendas.map((v) => {
                    const bruto = round2(v.avista + v.debito + v.credito + v.pix + v.ifood)
                    const fechado = bruto === 0
                    return (
                      <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className={tdCls}>{format(new Date(v.date), 'dd/MM', { locale: ptBR })}</td>
                        <td className={tdCls}>{fechado ? '—' : `R$ ${formatBRL(v.avista)}`}</td>
                        <td className={tdCls}>{fechado ? '—' : `R$ ${formatBRL(v.debito)}`}</td>
                        <td className={tdCls}>{fechado ? '—' : `R$ ${formatBRL(v.credito)}`}</td>
                        <td className={tdCls}>{fechado ? '—' : `R$ ${formatBRL(v.pix)}`}</td>
                        <td className={tdCls}>{fechado ? '—' : `R$ ${formatBRL(v.ifood)}`}</td>
                        <td className={`${tdCls} font-semibold`}>
                          {fechado ? <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">PIZZARIA FECHADA</span> : `R$ ${formatBRL(bruto)}`}
                        </td>
                        <td className={tdCls}>{v.pizzas || '—'}</td>
                        <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>{v.observacao || '—'}</td>
                        <td className={tdCls}>
                          <button onClick={() => setEditVenda({ ...v })} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium mr-3">Editar</button>
                          <button onClick={() => deleteData(`/api/fechamento/vendas/${v.id}`)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium">Excluir</button>
                        </td>
                      </tr>
                    )
                  })}
                  {vendas.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nenhuma venda registrada.</td></tr>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Novo Pagamento</h3>
            <form onSubmit={handleFuncSubmit}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" required value={funcForm.date} onChange={(e) => setFuncForm({ ...funcForm, date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Nome</label>
                  <input type="text" required value={funcForm.nome} onChange={(e) => setFuncForm({ ...funcForm, nome: e.target.value })} className={inputCls} placeholder="Nome do funcionário" />
                </div>
                <div>
                  <label className={labelCls}>Semana/Ref.</label>
                  <input type="text" value={funcForm.semana} onChange={(e) => setFuncForm({ ...funcForm, semana: e.target.value })} className={inputCls} placeholder="Ex: Semana 1" />
                </div>
                <CurrencyInput label="Valor" value={funcForm.valor} onChange={(v) => setFuncForm({ ...funcForm, valor: v })} required />
              </div>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Data', 'Nome', 'Semana/Ref.', 'Valor', 'Ações'].map((h) => <th key={h} className={thCls}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {funcionarios.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className={tdCls}>{format(new Date(f.date), 'dd/MM', { locale: ptBR })}</td>
                      <td className={tdCls}>{f.nome}</td>
                      <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>{f.semana || '—'}</td>
                      <td className={`${tdCls} font-semibold text-red-600 dark:text-red-400`}>R$ {formatBRL(f.valor)}</td>
                      <td className={tdCls}>
                        <button onClick={() => setEditFuncionario({ ...f })} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium mr-3">Editar</button>
                        <button onClick={() => deleteData(`/api/fechamento/funcionarios/${f.id}`)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {funcionarios.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nenhum pagamento registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA CONTAS FIXAS ─── */}
      {tab === 'contas' && (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Nova Conta Fixa</h3>
            <form onSubmit={handleContaSubmit}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" required value={contaForm.date} onChange={(e) => setContaForm({ ...contaForm, date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Despesa</label>
                  <input type="text" required value={contaForm.despesa} onChange={(e) => setContaForm({ ...contaForm, despesa: e.target.value })} className={inputCls} placeholder="Ex: Aluguel" />
                </div>
                <CurrencyInput label="Valor" value={contaForm.valor} onChange={(v) => setContaForm({ ...contaForm, valor: v })} required />
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={contaForm.pago} onChange={(e) => setContaForm({ ...contaForm, pago: e.target.checked })} className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Pago</span>
                  </label>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Data', 'Despesa', 'Valor', 'Status', 'Ações'].map((h) => <th key={h} className={thCls}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {contas.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className={tdCls}>{format(new Date(c.date), 'dd/MM', { locale: ptBR })}</td>
                      <td className={tdCls}>{c.despesa}</td>
                      <td className={`${tdCls} font-semibold text-red-600 dark:text-red-400`}>R$ {formatBRL(c.valor)}</td>
                      <td className={tdCls}>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.pago ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                          {c.pago ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <button onClick={() => setEditConta({ ...c })} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium mr-3">Editar</button>
                        <button onClick={() => deleteData(`/api/fechamento/contas/${c.id}`)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {contas.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nenhuma conta fixa registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA INSUMOS ─── */}
      {tab === 'insumos' && (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Novo Insumo</h3>
            <form onSubmit={handleInsumoSubmit}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" required value={insumoForm.date} onChange={(e) => setInsumoForm({ ...insumoForm, date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fornecedor</label>
                  <input type="text" required value={insumoForm.fornecedor} onChange={(e) => setInsumoForm({ ...insumoForm, fornecedor: e.target.value })} className={inputCls} placeholder="Nome do fornecedor" />
                </div>
                <CurrencyInput label="Valor" value={insumoForm.valor} onChange={(v) => setInsumoForm({ ...insumoForm, valor: v })} required />
              </div>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {submitting ? 'Salvando...' : 'Adicionar'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Data', 'Fornecedor', 'Valor', 'Ações'].map((h) => <th key={h} className={thCls}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {insumos.map((i) => (
                    <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className={tdCls}>{format(new Date(i.date), 'dd/MM', { locale: ptBR })}</td>
                      <td className={tdCls}>{i.fornecedor}</td>
                      <td className={`${tdCls} font-semibold text-red-600 dark:text-red-400`}>R$ {formatBRL(i.valor)}</td>
                      <td className={tdCls}>
                        <button onClick={() => setEditInsumo({ ...i })} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium mr-3">Editar</button>
                        <button onClick={() => deleteData(`/api/fechamento/insumos/${i.id}`)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {insumos.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nenhum insumo registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modais de edição ─── */}

      {editVenda && (
        <Modal title="Editar Venda" onClose={() => setEditVenda(null)}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="col-span-2">
              <label className={labelCls}>Data</label>
              <input type="date" value={editVenda.date.slice(0, 10)} onChange={(e) => setEditVenda({ ...editVenda, date: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="À Vista" value={editVenda.avista} onChange={(v) => setEditVenda({ ...editVenda, avista: v })} />
            <CurrencyInput label="Débito" value={editVenda.debito} onChange={(v) => setEditVenda({ ...editVenda, debito: v })} />
            <CurrencyInput label="Crédito/VR" value={editVenda.credito} onChange={(v) => setEditVenda({ ...editVenda, credito: v })} />
            <CurrencyInput label="PIX" value={editVenda.pix} onChange={(v) => setEditVenda({ ...editVenda, pix: v })} />
            <CurrencyInput label="iFood" value={editVenda.ifood} onChange={(v) => setEditVenda({ ...editVenda, ifood: v })} />
            <div>
              <label className={labelCls}>Nº Pizzas</label>
              <input type="number" min="0" value={editVenda.pizzas} onChange={(e) => setEditVenda({ ...editVenda, pizzas: parseInt(e.target.value) || 0 })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Observação</label>
              <input type="text" value={editVenda.observacao ?? ''} onChange={(e) => setEditVenda({ ...editVenda, observacao: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleVendaEdit} disabled={submitting} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setEditVenda(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {editFuncionario && (
        <Modal title="Editar Funcionário" onClose={() => setEditFuncionario(null)}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={editFuncionario.date.slice(0, 10)} onChange={(e) => setEditFuncionario({ ...editFuncionario, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" value={editFuncionario.nome} onChange={(e) => setEditFuncionario({ ...editFuncionario, nome: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Semana/Ref.</label>
              <input type="text" value={editFuncionario.semana ?? ''} onChange={(e) => setEditFuncionario({ ...editFuncionario, semana: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="Valor" value={editFuncionario.valor} onChange={(v) => setEditFuncionario({ ...editFuncionario, valor: v })} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleFuncEdit} disabled={submitting} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setEditFuncionario(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {editConta && (
        <Modal title="Editar Conta Fixa" onClose={() => setEditConta(null)}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={editConta.date.slice(0, 10)} onChange={(e) => setEditConta({ ...editConta, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Despesa</label>
              <input type="text" value={editConta.despesa} onChange={(e) => setEditConta({ ...editConta, despesa: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="Valor" value={editConta.valor} onChange={(v) => setEditConta({ ...editConta, valor: v })} />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editConta.pago} onChange={(e) => setEditConta({ ...editConta, pago: e.target.checked })} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Pago</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleContaEdit} disabled={submitting} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setEditConta(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {editInsumo && (
        <Modal title="Editar Insumo" onClose={() => setEditInsumo(null)}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={editInsumo.date.slice(0, 10)} onChange={(e) => setEditInsumo({ ...editInsumo, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fornecedor</label>
              <input type="text" value={editInsumo.fornecedor} onChange={(e) => setEditInsumo({ ...editInsumo, fornecedor: e.target.value })} className={inputCls} />
            </div>
            <CurrencyInput label="Valor" value={editInsumo.valor} onChange={(v) => setEditInsumo({ ...editInsumo, valor: v })} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleInsumoEdit} disabled={submitting} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setEditInsumo(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
