'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import BottomSheet from './BottomSheet'
import CurrencyInput from './CurrencyInput'

type Cat = 'insumo' | 'funcionario' | 'conta' | 'venda'

type Props = {
  defaultCat?: Cat
}

function r2(n: number) { return Math.round(n * 100) / 100 }

const inp =
  'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all'

const cats: { key: Cat; label: string }[] = [
  { key: 'venda',      label: 'Venda' },
  { key: 'insumo',     label: 'Insumo' },
  { key: 'funcionario',label: 'Funcionário' },
  { key: 'conta',      label: 'Conta' },
]

export default function QuickAddFAB({ defaultCat = 'venda' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState<Cat>(defaultCat)
  const [submitting, setSubmitting] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  const [semana, setSemana] = useState('')
  const [pago, setPago] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState('')
  const [avista, setAvista] = useState(0)
  const [debito, setDebito] = useState(0)
  const [credito, setCredito] = useState(0)
  const [pix, setPix] = useState(0)
  const [ifood, setIfood] = useState(0)
  const [outros, setOutros] = useState(0)
  const [taxas, setTaxas] = useState(0)
  const [pizzas, setPizzas] = useState(0)

  function reset() {
    setDescricao(''); setValor(0); setSemana(''); setPago(false); setDiaVencimento('')
    setAvista(0); setDebito(0); setCredito(0); setPix(0); setIfood(0); setOutros(0)
    setTaxas(0); setPizzas(0)
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setCat(defaultCat)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (cat === 'insumo') {
        await fetch('/api/fechamento/insumos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, fornecedor: descricao, valor }) })
      } else if (cat === 'funcionario') {
        await fetch('/api/fechamento/funcionarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, nome: descricao, semana, valor }) })
      } else if (cat === 'conta') {
        await fetch('/api/fechamento/contas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, despesa: descricao, valor, pago, diaVencimento: diaVencimento ? parseInt(diaVencimento) : null }) })
      } else {
        await fetch('/api/fechamento/vendas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, avista, debito, credito, pix, ifood, outros, taxas, pizzas }) })
      }
      reset()
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const brutoVenda = r2(avista + debito + credito + pix + ifood + outros)
  const liquidoVenda = r2(brutoVenda - taxas)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[5.5rem] right-4 md:bottom-6 md:right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-30 hover:bg-primary-dark transition-all active:scale-95"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <BottomSheet open={open} onClose={() => { setOpen(false); reset() }} title="Novo Registro">
        {/* Category selector */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {cats.map(c => (
            <button key={c.key} type="button" onClick={() => setCat(c.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                cat === c.key
                  ? 'bg-primary text-white border-primary'
                  : 'border-cream-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-primary/50 hover:text-primary'
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
          </div>

          {cat !== 'venda' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">
                  {cat === 'insumo' ? 'Fornecedor' : cat === 'funcionario' ? 'Nome' : 'Despesa'}
                </label>
                <input type="text" required value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder={cat === 'insumo' ? 'PMG, Sacolão, CristauLat...' : ''}
                  className={inp} />
              </div>
              <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
            </>
          )}

          {cat === 'funcionario' && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Semana / Referência</label>
              <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
            </div>
          )}

          {cat === 'conta' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Dia vencimento</label>
                <input type="number" value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} placeholder="15" min="1" max="31" className={inp} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="pago-fab" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="pago-fab" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">Já pago</label>
              </div>
            </div>
          )}

          {cat === 'venda' && (
            <div className="space-y-3.5">
              {/* Dinheiro & débito */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">Recebimentos</p>
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput label="À Vista" value={avista} onChange={setAvista} />
                  <CurrencyInput label="Stone / Débito" value={debito} onChange={setDebito} />
                  <CurrencyInput label="Ticket / VR / Alelo" value={credito} onChange={setCredito} />
                  <CurrencyInput label="PIX (Tuna)" value={pix} onChange={setPix} />
                </div>
              </div>
              {/* Delivery */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">Delivery</p>
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput label="iFood" value={ifood} onChange={setIfood} />
                  <CurrencyInput label="99Food / Keeta" value={outros} onChange={setOutros} />
                </div>
              </div>
              {/* Taxas e pizzas */}
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput label="Taxas" value={taxas} onChange={setTaxas} />
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Pizzas vendidas</label>
                  <input type="number" value={pizzas || ''} onChange={e => setPizzas(parseInt(e.target.value) || 0)} placeholder="0" className={inp} />
                </div>
              </div>
              {/* Preview */}
              <div className="px-3.5 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Bruto</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">R$ {brutoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-gray-300 dark:text-zinc-700 text-lg">→</div>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Líquido</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">R$ {liquidoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (cat !== 'venda' && valor === 0)}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-all active:scale-[0.99] mt-1"
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </>
  )
}
