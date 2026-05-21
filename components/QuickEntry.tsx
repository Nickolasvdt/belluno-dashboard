'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import CurrencyInput from '@/components/CurrencyInput'

type Cat = 'insumo' | 'funcionario' | 'conta' | 'venda' | 'caixa'

const catLabels: Record<Cat, string> = {
  insumo: 'Insumo',
  funcionario: 'Funcionário',
  conta: 'Conta',
  venda: 'Venda',
  caixa: 'Caixa',
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'
const labelCls = 'block text-xs text-gray-400 dark:text-zinc-500 mb-1'

const FORNECEDORES = ['PMG', 'Sacolão', 'CristauLat', 'Atacado', 'Bom Baiano', 'Lenha', 'Embalagens', 'JMW', 'Mega G']
const FUNCIONARIOS = ['Priscila', 'Will', 'Soraya', 'Mauricio', 'Leandro', 'Nickolas', 'Moises']
const CONTAS = ['Aluguel', 'Luz', 'Sabesp', 'Vivo Fibra', 'Vivo pré', 'Sistema', 'Imposto MEI', 'Vigilante', 'Sociedade']

export default function QuickEntry() {
  const router = useRouter()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [cat, setCat] = useState<Cat>('insumo')
  const [date, setDate] = useState(today)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  const [semana, setSemana] = useState('')
  const [pago, setPago] = useState(false)
  const [pizzas, setPizzas] = useState(0)
  const [avista, setAvista] = useState(0)
  const [entradas, setEntradas] = useState(0)
  const [saidas, setSaidas] = useState(0)
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  function resetForm() {
    setDescricao(''); setValor(0); setSemana(''); setPago(false)
    setPizzas(0); setAvista(0); setEntradas(0); setSaidas(0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (cat === 'insumo') {
        await fetch('/api/fechamento/insumos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, fornecedor: descricao || 'Sem descrição', valor }),
        })
      } else if (cat === 'funcionario') {
        await fetch('/api/fechamento/funcionarios', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, nome: descricao || 'Funcionário', semana, valor }),
        })
      } else if (cat === 'conta') {
        await fetch('/api/fechamento/contas', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, despesa: descricao || 'Despesa', valor, pago }),
        })
      } else if (cat === 'venda') {
        const outros = Math.max(0, Math.round((valor - avista) * 100) / 100)
        await fetch('/api/fechamento/vendas', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, avista, debito: 0, credito: 0, pix: 0, ifood: 0, outros, taxas: 0, pizzas, observacao: descricao || null }),
        })
      } else {
        const fechamento = Math.round((saldoInicial + entradas - saidas) * 100) / 100
        await fetch('/api/caixa', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, saldoInicial, entradas, saidas, fechamento, observacao: descricao }),
        })
      }
      resetForm()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-cream-200 dark:border-zinc-800 p-4 min-w-0">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-600">Novo lançamento</p>
        {success && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Salvo</span>}
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 mb-4 bg-cream-100 dark:bg-zinc-800 rounded-lg p-1">
        {(['insumo', 'funcionario', 'conta', 'venda', 'caixa'] as Cat[]).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { setCat(c); resetForm() }}
            className={`flex-1 min-w-0 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              cat === c
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            <span className="block truncate">{catLabels[c]}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>

        {/* Insumo — fast 3-column layout */}
        {cat === 'insumo' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fornecedor</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                list="qe-fornecedores" placeholder="PMG, Sacolão..." className={inputCls} />
              <datalist id="qe-fornecedores">{FORNECEDORES.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <CurrencyInput label="Valor" value={valor} onChange={setValor} />
            </div>
          </div>
        )}

        {/* Funcionário */}
        {cat === 'funcionario' && (
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <CurrencyInput label="Valor" value={valor} onChange={setValor} />
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                list="qe-funcionarios" placeholder="Nome" className={inputCls} />
              <datalist id="qe-funcionarios">{FUNCIONARIOS.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Semana</label>
              <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Sem. 1" className={inputCls} />
            </div>
          </div>
        )}

        {/* Conta */}
        {cat === 'conta' && (
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <CurrencyInput label="Valor" value={valor} onChange={setValor} />
            <div className="col-span-2">
              <label className={labelCls}>Despesa</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                list="qe-contas" placeholder="Aluguel, luz..." className={inputCls} />
              <datalist id="qe-contas">{CONTAS.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <label className="flex items-center gap-2 cursor-pointer col-span-2">
              <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-xs text-gray-500 dark:text-zinc-400">Já pago</span>
            </label>
          </div>
        )}

        {/* Venda */}
        {cat === 'venda' && (
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <CurrencyInput label="Total bruto" value={valor} onChange={setValor} />
            <CurrencyInput label="À vista" value={avista} onChange={setAvista} />
            <div>
              <label className={labelCls}>Pizzas</label>
              <input type="number" min="0" value={pizzas || ''} onChange={e => setPizzas(parseInt(e.target.value) || 0)}
                placeholder="0" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Observação</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Opcional" className={inputCls} />
            </div>
          </div>
        )}

        {/* Caixa */}
        {cat === 'caixa' && (
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="col-span-2">
              <label className={labelCls}>Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <CurrencyInput label="Saldo inicial" value={saldoInicial} onChange={setSaldoInicial} />
            <CurrencyInput label="Entradas" value={entradas} onChange={setEntradas} />
            <CurrencyInput label="Saídas" value={saidas} onChange={setSaidas} />
            <div>
              <label className={labelCls}>Fechamento</label>
              <div className="w-full px-3 py-2 border border-cream-200 dark:border-zinc-700 rounded-lg bg-cream-100 dark:bg-zinc-800 text-sm font-semibold text-gray-800 dark:text-white">
                R$ {(Math.round((saldoInicial + entradas - saidas) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Observação</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Opcional" className={inputCls} />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Salvando...' : `Adicionar ${catLabels[cat]}`}
        </button>
      </form>
    </div>
  )
}
