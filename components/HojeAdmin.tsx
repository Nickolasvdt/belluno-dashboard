'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import BottomSheet from './BottomSheet'
import CurrencyInput from './CurrencyInput'
import WeeklyBarChart from './WeeklyBarChart'
import type { WeekData } from './WeeklyBarChart'
import Link from 'next/link'

type FechamentoDia = { id: number; date: string; avista: number; ifood: number; noventa9: number; keeta: number; extra: number; pizzas: number }
type CaixaHoje     = { id: number; date: string; saldoInicial: number; entradas: number; saidas: number; fechamento: number; observacao: string | null }
type Pendente      = { id: number; despesa: string; valor: number; diaVencimento: number | null }
type Resultado     = { receita: number; despesas: number; resultado: number; pizzas: number }

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

export default function HojeAdmin() {
  const now    = new Date()
  const today  = format(now, 'yyyy-MM-dd')
  const mes    = now.getMonth() + 1
  const ano    = now.getFullYear()
  const label  = format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })

  const [loading, setLoading]             = useState(true)
  const [resultado, setResultado]         = useState<Resultado>({ receita: 0, despesas: 0, resultado: 0, pizzas: 0 })
  const [fechamentoDia, setFechamentoDia] = useState<FechamentoDia | null>(null)
  const [caixaHoje, setCaixaHoje]         = useState<CaixaHoje | null>(null)
  const [pendentes, setPendentes]         = useState<Pendente[]>([])
  const [weeklyData, setWeeklyData]       = useState<WeekData[]>([])

  // FechamentoDia form
  const [editingFD, setEditingFD]     = useState(false)
  const [fdAvista, setFdAvista]       = useState(0)
  const [fdIfood, setFdIfood]         = useState(0)
  const [fdNoventa9, setFdNoventa9]   = useState(0)
  const [fdKeeta, setFdKeeta]         = useState(0)
  const [fdExtra, setFdExtra]         = useState(0)
  const [fdPizzas, setFdPizzas]       = useState(0)
  const [submittingFD, setSubmittingFD] = useState(false)

  // Caixa form
  const [caixaOpen, setCaixaOpen]           = useState(false)
  const [editCaixaId, setEditCaixaId]       = useState<number | null>(null)
  const [cxSaldoInicial, setCxSaldoInicial] = useState(0)
  const [cxEntradas, setCxEntradas]         = useState(0)
  const [cxSaidas, setCxSaidas]             = useState(0)
  const [cxObs, setCxObs]                   = useState('')
  const [submittingCx, setSubmittingCx]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch(`/api/hoje?date=${today}&mes=${mes}&ano=${ano}`).then(r => r.json())
      setResultado(data.resultado)
      setFechamentoDia(data.fechamentoDia)
      setCaixaHoje(data.caixaHoje)
      setPendentes(Array.isArray(data.pendentes) ? data.pendentes : [])
      setWeeklyData(Array.isArray(data.weeklyData) ? data.weeklyData : [])
    } finally { setLoading(false) }
  }, [today, mes, ano])

  useEffect(() => { load() }, [load])

  function startEditFD() {
    if (fechamentoDia) {
      setFdAvista(fechamentoDia.avista); setFdIfood(fechamentoDia.ifood)
      setFdNoventa9(fechamentoDia.noventa9); setFdKeeta(fechamentoDia.keeta)
      setFdExtra(fechamentoDia.extra); setFdPizzas(fechamentoDia.pizzas)
    } else {
      setFdAvista(0); setFdIfood(0); setFdNoventa9(0); setFdKeeta(0); setFdExtra(0); setFdPizzas(0)
    }
    setEditingFD(true)
  }

  async function saveFD(e: React.FormEvent) {
    e.preventDefault(); setSubmittingFD(true)
    try {
      const body = { date: today, avista: fdAvista, ifood: fdIfood, noventa9: fdNoventa9, keeta: fdKeeta, extra: fdExtra, pizzas: fdPizzas }
      if (fechamentoDia) {
        await fetch(`/api/fechamento-dia/${fechamentoDia.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/fechamento-dia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setEditingFD(false); await load()
    } finally { setSubmittingFD(false) }
  }

  function openCaixa() {
    if (caixaHoje) {
      setEditCaixaId(caixaHoje.id); setCxSaldoInicial(caixaHoje.saldoInicial)
      setCxEntradas(caixaHoje.entradas); setCxSaidas(caixaHoje.saidas); setCxObs(caixaHoje.observacao ?? '')
    } else {
      setEditCaixaId(null); setCxSaldoInicial(0); setCxEntradas(0); setCxSaidas(0); setCxObs('')
    }
    setCaixaOpen(true)
  }

  async function saveCaixa(e: React.FormEvent) {
    e.preventDefault(); setSubmittingCx(true)
    try {
      const fechamento = r2(cxSaldoInicial + cxEntradas - cxSaidas)
      const body = { date: today, saldoInicial: cxSaldoInicial, entradas: cxEntradas, saidas: cxSaidas, fechamento, observacao: cxObs }
      if (editCaixaId) {
        await fetch(`/api/caixa/${editCaixaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setCaixaOpen(false); await load()
    } finally { setSubmittingCx(false) }
  }

  const fdTotal      = r2(fdAvista + fdIfood + fdNoventa9 + fdKeeta + fdExtra)
  const isPositive   = resultado.resultado >= 0
  const cxFechamento = r2(cxSaldoInicial + cxEntradas - cxSaidas)

  return (
    <div className="space-y-5">

      {/* Bloco 1 — Fechamento do Dia */}
      <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] overflow-hidden shadow-sm">
        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Fechamento do Dia</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 capitalize mt-0.5">{label}</p>
          </div>
          {fechamentoDia && !editingFD && (
            <button onClick={startEditFD}
              className="text-xs text-accent font-semibold px-3 py-1.5 rounded-full border border-accent/25 hover:bg-accent/5 transition-colors">
              Editar
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-5 pb-5 space-y-2">
            {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-xl"/>)}
          </div>
        ) : !fechamentoDia || editingFD ? (
          <form onSubmit={saveFD} className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <CurrencyInput label="À Vista" value={fdAvista} onChange={setFdAvista} />
              <CurrencyInput label="iFood" value={fdIfood} onChange={setFdIfood} />
              <CurrencyInput label="99food" value={fdNoventa9} onChange={setFdNoventa9} />
              <CurrencyInput label="Keeta" value={fdKeeta} onChange={setFdKeeta} />
            </div>
            <CurrencyInput label="Extra" value={fdExtra} onChange={setFdExtra} />
            <div className="flex items-center justify-between px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-zinc-400">Total do Dia</p>
              <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">R$&nbsp;{fmt(fdTotal)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Pizzas</label>
              <input type="number" min="0" value={fdPizzas} onChange={e => setFdPizzas(parseInt(e.target.value) || 0)} className={inp} />
            </div>
            <div className="flex gap-2">
              {editingFD && (
                <button type="button" onClick={() => setEditingFD(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-cream-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400">
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={submittingFD}
                className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99]">
                {submittingFD ? 'Salvando...' : 'Salvar Fechamento'}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'À Vista',  value: fechamentoDia.avista },
                { label: 'iFood',    value: fechamentoDia.ifood },
                { label: '99food',   value: fechamentoDia.noventa9 },
                { label: 'Keeta',    value: fechamentoDia.keeta },
                { label: 'Extra',    value: fechamentoDia.extra },
                { label: 'Pizzas',   value: null, count: fechamentoDia.pizzas },
              ].map(s => (
                <div key={s.label} className="px-3 py-2.5 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">{s.label}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {s.count !== undefined ? s.count : `R$ ${fmt(s.value ?? 0)}`}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-zinc-400">Total do Dia</p>
              <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">
                R$&nbsp;{fmt(r2(fechamentoDia.avista + fechamentoDia.ifood + fechamentoDia.noventa9 + fechamentoDia.keeta + fechamentoDia.extra))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bloco 2 — Caixa do Dia */}
      <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] overflow-hidden shadow-sm">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Caixa do Dia</p>
          {caixaHoje ? (
            <button onClick={openCaixa}
              className="text-xs text-accent font-semibold px-3 py-1.5 rounded-full border border-accent/25 hover:bg-accent/5 transition-colors">
              Editar
            </button>
          ) : (
            <button onClick={openCaixa}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors">
              Registrar Caixa
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-5 pb-4"><div className="skeleton h-10 rounded-xl"/></div>
        ) : caixaHoje ? (
          <div className="grid grid-cols-3 border-t border-cream-200 dark:border-white/[0.05] divide-x divide-cream-200 dark:divide-white/[0.05] mb-3">
            {[
              { label: 'Inicial',  value: fmt(caixaHoje.saldoInicial), color: 'text-gray-600 dark:text-gray-300' },
              { label: 'Entradas', value: `+${fmt(caixaHoje.entradas)}`, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Saídas',   value: `−${fmt(caixaHoje.saidas)}`,  color: 'text-accent' },
            ].map(s => (
              <div key={s.label} className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">{s.label}</p>
                <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 pb-4 text-sm text-gray-400 dark:text-zinc-500">Caixa ainda não registrado hoje.</p>
        )}
      </div>

      {/* Bloco 3 — Resultado do Mês */}
      {loading ? (
        <div className="skeleton h-28 rounded-2xl" />
      ) : (
        <div className={`rounded-2xl p-5 ${isPositive ? 'bg-emerald-700' : 'bg-accent'}`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 mb-1">Resultado do mês</p>
          <p className="font-display font-semibold text-[clamp(28px,6vw,38px)] tracking-tight text-white leading-none mb-2">
            {isPositive ? '+' : '–'}&nbsp;R$&nbsp;{fmt(Math.abs(resultado.resultado))}
          </p>
          <p className="text-xs text-white/70">
            Receita&nbsp;<span className="font-semibold text-white">R$&nbsp;{fmt(resultado.receita)}</span>
            &nbsp;·&nbsp;
            Despesas&nbsp;<span className="font-semibold text-white/80">R$&nbsp;{fmt(resultado.despesas)}</span>
            {resultado.pizzas > 0 && <>&nbsp;·&nbsp;<span className="font-semibold text-white">{resultado.pizzas}</span> pizzas</>}
          </p>
        </div>
      )}

      {/* Bloco 4 — Gráfico semanal + contas pendentes */}
      {!loading && (
        <>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute">Semanas do mês</p>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1 text-[10px] text-mute"><span className="w-2 h-2 rounded-sm bg-emerald-600 inline-block" /> Receita</span>
                <span className="flex items-center gap-1 text-[10px] text-mute"><span className="w-2 h-2 rounded-sm bg-accent inline-block" /> Despesas</span>
              </div>
            </div>
            <WeeklyBarChart data={weeklyData} />
          </div>

          {pendentes.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute">Contas Pendentes</p>
                <Link href="/fechamento" className="text-xs text-accent font-medium hover:underline underline-offset-2">Ver todas →</Link>
              </div>
              <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
                {pendentes.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-gray-100 truncate">{c.despesa}</p>
                        {c.diaVencimento && <p className="font-mono text-[10px] text-mute">dia {c.diaVencimento}</p>}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-ink dark:text-gray-100 shrink-0 ml-3">R$ {fmt(c.valor)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Caixa BottomSheet */}
      <BottomSheet open={caixaOpen} onClose={() => setCaixaOpen(false)} title={editCaixaId ? 'Editar Caixa' : 'Registrar Caixa'}>
        <form onSubmit={saveCaixa} className="space-y-3.5">
          <CurrencyInput label="Saldo Inicial" value={cxSaldoInicial} onChange={setCxSaldoInicial} />
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Entradas" value={cxEntradas} onChange={setCxEntradas} />
            <CurrencyInput label="Saídas" value={cxSaidas} onChange={setCxSaidas} />
          </div>
          <div className="px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-zinc-400">Fechamento calculado</p>
            <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">R$&nbsp;{fmt(cxFechamento)}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Observação (opcional)</label>
            <input type="text" value={cxObs} onChange={e => setCxObs(e.target.value)} className={inp} />
          </div>
          <button type="submit" disabled={submittingCx}
            className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99]">
            {submittingCx ? 'Salvando...' : editCaixaId ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
