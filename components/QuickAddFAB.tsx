'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import BottomSheet from './BottomSheet'
import CurrencyInput from './CurrencyInput'

type Cat    = 'venda' | 'insumo' | 'funcionario' | 'conta' | 'caixa'
type Metodo = 'avista' | 'debito' | 'credito' | 'pix' | 'ifood'

function r2(n: number) { return Math.round(n * 100) / 100 }

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-mute dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

const CATS: { key: Cat; label: string; icon: React.ReactNode }[] = [
  {
    key: 'venda', label: 'Venda',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.97-1.67L23 6H6"/></svg>,
  },
  {
    key: 'insumo', label: 'Insumo',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
  },
  {
    key: 'funcionario', label: 'Funcionário',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5"/></svg>,
  },
  {
    key: 'conta', label: 'Conta',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
  },
  {
    key: 'caixa', label: 'Caixa',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/></svg>,
  },
]

export default function QuickAddFAB() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState<Cat | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate]           = useState(today)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor]         = useState(0)
  const [semana, setSemana]       = useState('')
  const [pago, setPago]           = useState(false)
  const [diaVencimento, setDiaVencimento] = useState('')

  // Venda
  const [metodo, setMetodo]   = useState<Metodo>('avista')
  const [desconto, setDesconto] = useState(0)
  const [entrega, setEntrega] = useState(0)
  const [obsVenda, setObsVenda] = useState('')

  // Caixa
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [entradas, setEntradas]         = useState(0)
  const [saidas, setSaidas]             = useState(0)
  const [obsCaixa, setObsCaixa]         = useState('')

  useEffect(() => {
    if (cat === 'caixa') {
      fetch('/api/caixa')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) setSaldoInicial(data[0].fechamento)
        })
        .catch(() => {})
    }
  }, [cat])

  function reset() {
    setCat(null)
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setDescricao(''); setValor(0); setSemana(''); setPago(false); setDiaVencimento('')
    setMetodo('avista'); setDesconto(0); setEntrega(0); setObsVenda('')
    setSaldoInicial(0); setEntradas(0); setSaidas(0); setObsCaixa('')
  }

  function openModal() { reset(); setOpen(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (cat === 'venda') {
        await fetch('/api/fechamento/vendas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            avista:  metodo === 'avista'  ? valor : 0,
            debito:  metodo === 'debito'  ? valor : 0,
            credito: metodo === 'credito' ? valor : 0,
            pix:     metodo === 'pix'     ? valor : 0,
            ifood:   metodo === 'ifood'   ? valor : 0,
            outros:  entrega,
            taxas:   desconto,
            pizzas:  0,
            observacao: obsVenda,
          })
        })
      } else if (cat === 'insumo') {
        await fetch('/api/fechamento/insumos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, fornecedor: descricao, valor }) })
      } else if (cat === 'funcionario') {
        await fetch('/api/fechamento/funcionarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, nome: descricao, semana, valor }) })
      } else if (cat === 'conta') {
        await fetch('/api/fechamento/contas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, despesa: descricao, valor, pago, diaVencimento: diaVencimento ? parseInt(diaVencimento) : null }) })
      } else if (cat === 'caixa') {
        const fechamento = r2(saldoInicial + entradas - saidas)
        await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, saldoInicial, entradas, saidas, fechamento, observacao: obsCaixa }) })
      }
      reset(); setOpen(false); router.refresh()
    } finally { setSubmitting(false) }
  }

  const brutoVenda = r2(valor + entrega)
  const fechamentoCaixa = r2(saldoInicial + entradas - saidas)

  const canSubmit = cat !== null && (
    (cat === 'venda' && valor > 0) ||
    (cat === 'caixa') ||
    (cat === 'insumo' && descricao.trim() !== '' && valor > 0) ||
    (cat === 'funcionario' && descricao.trim() !== '' && valor > 0) ||
    (cat === 'conta' && descricao.trim() !== '' && valor > 0)
  )

  return (
    <>
      <button
        onClick={openModal}
        className="fixed bottom-[5.5rem] right-4 md:bottom-6 md:right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg shadow-accent/30 flex items-center justify-center z-30 hover:bg-accent-dark transition-all active:scale-95"
        aria-label="Adicionar registro"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <BottomSheet open={open} onClose={() => { setOpen(false); reset() }} title="Novo Registro">

        {cat === null && (
          <div className="grid grid-cols-2 gap-3">
            {CATS.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCat(c.key)}
                className={`flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl border border-cream-200 dark:border-zinc-800 bg-cream-50/60 dark:bg-zinc-900/40 text-ink dark:text-gray-200 hover:border-accent/40 hover:bg-accent/5 transition-all ${c.key === 'caixa' ? 'col-span-2 flex-row gap-3 py-4' : ''}`}
              >
                <span className="text-mute dark:text-zinc-400">{c.icon}</span>
                <span className="text-sm font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {cat !== null && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <button type="button" onClick={() => setCat(null)}
              className="flex items-center gap-1.5 text-xs text-mute hover:text-ink dark:hover:text-gray-200 transition-colors mb-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
              Voltar
            </button>

            <div>
              <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
            </div>

            {(cat === 'insumo' || cat === 'funcionario' || cat === 'conta') && (
              <>
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">
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
                <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Semana</label>
                <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
              </div>
            )}

            {cat === 'conta' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Dia vencimento</label>
                  <input type="number" value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} placeholder="15" min="1" max="31" className={inp} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="pago-fab" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-[#8B2020]" />
                  <label htmlFor="pago-fab" className="text-sm text-ink dark:text-gray-300 cursor-pointer">Já pago</label>
                </div>
              </div>
            )}

            {cat === 'venda' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Método de pagamento</label>
                  <select value={metodo} onChange={e => setMetodo(e.target.value as Metodo)} className={inp}>
                    <option value="avista">À Vista</option>
                    <option value="debito">Stone / Débito</option>
                    <option value="credito">Ticket / VR / Alelo</option>
                    <option value="pix">PIX</option>
                    <option value="ifood">iFood</option>
                  </select>
                </div>
                <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
                <CurrencyInput label="Desconto (opcional)" value={desconto} onChange={setDesconto} />
                <CurrencyInput label="Entrega (opcional)" value={entrega} onChange={setEntrega} />
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Nome (opcional)</label>
                  <input type="text" value={obsVenda} onChange={e => setObsVenda(e.target.value)} placeholder="Nome do cliente ou observação" className={inp} />
                </div>
                <div className="flex justify-between items-center px-3.5 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-mute">Bruto</p>
                    <p className="text-sm font-semibold text-ink dark:text-gray-100">R$ {brutoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-mute"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-mute">Líquido</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">R$ {r2(brutoVenda - desconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}

            {cat === 'caixa' && (
              <div className="space-y-3.5">
                <CurrencyInput label="Saldo Inicial" value={saldoInicial} onChange={setSaldoInicial} />
                <CurrencyInput label="Entradas" value={entradas} onChange={setEntradas} />
                <CurrencyInput label="Saídas" value={saidas} onChange={setSaidas} />
                <div className="flex justify-between items-center px-3.5 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
                  <p className="text-sm font-medium text-mute dark:text-zinc-400">Fechamento calculado</p>
                  <p className="text-base font-semibold text-ink dark:text-gray-100">R$ {fechamentoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Observação</label>
                  <input type="text" value={obsCaixa} onChange={e => setObsCaixa(e.target.value)} className={inp} />
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting || !canSubmit}
              className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99] mt-1">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        )}
      </BottomSheet>
    </>
  )
}
