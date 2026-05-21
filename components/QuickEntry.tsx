'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import CurrencyInput from '@/components/CurrencyInput'

type Cat = 'venda' | 'insumo' | 'funcionario' | 'conta' | 'caixa'

const catLabels: Record<Cat, string> = {
  venda: 'Venda',
  insumo: 'Insumo',
  funcionario: 'Funcionário',
  conta: 'Conta',
  caixa: 'Caixa',
}

const catIcons: Record<Cat, string> = {
  venda: '💰',
  insumo: '🛒',
  funcionario: '👷',
  conta: '📄',
  caixa: '🏦',
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-zinc-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'

const FORNECEDORES_COMUNS = ['PMG', 'Sacolão', 'CristauLat', 'Atacado', 'Bom Baiano', 'Lenha', 'Embalagens', 'JMW', 'Mega G']
const FUNCIONARIOS_COMUNS = ['Priscila', 'Will', 'Soraya', 'Mauricio', 'Leandro', 'Nickolas', 'Moises']
const CONTAS_COMUNS = ['Aluguel', 'Luz', 'Sabesp', 'Vivo Fibra', 'Vivo pré', 'Sistema', 'Imposto MEI', 'Vigilante', 'Sociedade']

export default function QuickEntry() {
  const router = useRouter()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [cat, setCat] = useState<Cat>('venda')
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
    setDescricao('')
    setValor(0)
    setSemana('')
    setPago(false)
    setPizzas(0)
    setAvista(0)
    setEntradas(0)
    setSaidas(0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (cat === 'venda') {
        const outros = Math.max(0, Math.round((valor - avista) * 100) / 100)
        await fetch('/api/fechamento/vendas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, avista, debito: 0, credito: 0, pix: 0, ifood: 0, outros, taxas: 0, pizzas, observacao: descricao || null }),
        })
      } else if (cat === 'insumo') {
        await fetch('/api/fechamento/insumos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, fornecedor: descricao || 'Sem descrição', valor }),
        })
      } else if (cat === 'funcionario') {
        await fetch('/api/fechamento/funcionarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, nome: descricao || 'Funcionário', semana, valor }),
        })
      } else if (cat === 'conta') {
        await fetch('/api/fechamento/contas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, despesa: descricao || 'Despesa', valor, pago }),
        })
      } else {
        const fechamento = Math.round((saldoInicial + entradas - saidas) * 100) / 100
        await fetch('/api/caixa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  const suggestions = cat === 'insumo' ? FORNECEDORES_COMUNS
    : cat === 'funcionario' ? FUNCIONARIOS_COMUNS
    : cat === 'conta' ? CONTAS_COMUNS
    : []

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-3 sm:p-4 shadow-sm h-full min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Lançamento Rápido</h3>
        {success && <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✓ Salvo!</span>}
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 mb-4 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
        {(['venda', 'insumo', 'funcionario', 'conta', 'caixa'] as Cat[]).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { setCat(c); resetForm() }}
            title={catLabels[c]}
            className={`min-w-0 py-1.5 rounded-md text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${
              cat === c
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span>{catIcons[c]}</span>
            <span className="w-full px-1 text-[10px] leading-none truncate">{catLabels[c]}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {/* Date */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>

          {/* VENDA */}
          {cat === 'venda' && (
            <>
              <CurrencyInput label="Total Bruto" value={valor} onChange={setValor} />
              <CurrencyInput label="À Vista" value={avista} onChange={setAvista} />
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nº Pizzas</label>
                <input
                  type="number" min="0" value={pizzas || ''}
                  onChange={e => setPizzas(parseInt(e.target.value) || 0)}
                  placeholder="0" className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Observação (opcional)</label>
                <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Dia especial..." className={inputCls} />
              </div>
            </>
          )}

          {/* INSUMO / FUNCIONARIO / CONTA */}
          {(cat === 'insumo' || cat === 'funcionario' || cat === 'conta') && (
            <>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} />
              <div className={cat === 'funcionario' ? '' : 'sm:col-span-2'}>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {cat === 'insumo' ? 'Fornecedor' : cat === 'funcionario' ? 'Nome' : 'Despesa'}
                </label>
                <input
                  type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                  list={`sugs-${cat}`}
                  placeholder={cat === 'insumo' ? 'PMG, Sacolão...' : cat === 'funcionario' ? 'Nome' : 'Aluguel, Luz...'}
                  className={inputCls}
                />
                {suggestions.length > 0 && (
                  <datalist id={`sugs-${cat}`}>
                    {suggestions.map(s => <option key={s} value={s} />)}
                  </datalist>
                )}
              </div>
              {cat === 'funcionario' && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Semana</label>
                  <input type="text" value={semana} onChange={e => setSemana(e.target.value)}
                    placeholder="Sem. 1" className={inputCls} />
                </div>
              )}
              {cat === 'conta' && (
                <div className="flex items-center gap-2 sm:col-span-2 mt-1">
                  <input type="checkbox" id="qe-pago" checked={pago}
                    onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <label htmlFor="qe-pago" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">Já foi pago</label>
                </div>
              )}
            </>
          )}

          {/* CAIXA */}
          {cat === 'caixa' && (
            <>
              <CurrencyInput label="Saldo Inicial" value={saldoInicial} onChange={setSaldoInicial} />
              <CurrencyInput label="Entradas" value={entradas} onChange={setEntradas} />
              <CurrencyInput label="Saídas" value={saidas} onChange={setSaidas} />
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fechamento</label>
                <div className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm font-semibold text-gray-900 dark:text-white">
                  R$ {(Math.round((saldoInicial + entradas - saidas) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Observação</label>
                <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Opcional" className={inputCls} />
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Salvando...' : `+ ${catLabels[cat]}`}
        </button>
      </form>
    </div>
  )
}
