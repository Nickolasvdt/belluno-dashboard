import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import WeeklyBarChart from '@/components/WeeklyBarChart'
import type { WeekData } from '@/components/WeeklyBarChart'

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function weekOf(date: Date): number { return Math.min(Math.ceil(new Date(date).getDate() / 7), 4) }

export default async function HojePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'CAIXA') redirect('/caixa')

  const now = new Date()
  const start = startOfMonth(now)
  const end   = endOfMonth(now)
  const todayStart = startOfDay(now)
  const todayEnd   = endOfDay(now)

  const [vendas, insumos, funcionarios, contas, vendaHoje, caixaHoje] = await Promise.all([
    prisma.venda.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.insumo.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: 'desc' } }),
    prisma.funcionario.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: 'desc' } }),
    prisma.contaFixa.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.venda.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
    prisma.cashFlow.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
  ])

  const bruto    = r2(vendas.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros), 0))
  const taxas    = r2(vendas.reduce((s, v) => r2(s + v.taxas), 0))
  const receita  = r2(bruto - taxas)
  const despesas = r2(
    insumos.reduce((s, i) => r2(s + i.valor), 0) +
    funcionarios.reduce((s, f) => r2(s + f.valor), 0) +
    contas.reduce((s, c) => r2(s + c.valor), 0)
  )
  const resultado = r2(receita - despesas)

  const pendentes = contas
    .filter(c => !c.pago)
    .sort((a, b) => (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99))
    .slice(0, 5)

  const weeklyData: WeekData[] = [1, 2, 3, 4].map(w => {
    const wVendas  = vendas.filter(v => weekOf(v.date) === w)
    const wInsumos = insumos.filter(i => weekOf(i.date) === w)
    const wFunc    = funcionarios.filter(f => weekOf(f.date) === w)
    const wContas  = contas.filter(c => weekOf(c.date) === w)
    const rec  = r2(wVendas.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros - v.taxas), 0))
    const desp = r2(
      wInsumos.reduce((s, i) => r2(s + i.valor), 0) +
      wFunc.reduce((s, f) => r2(s + f.valor), 0) +
      wContas.reduce((s, c) => r2(s + c.valor), 0)
    )
    return { label: `S${w}`, receita: rec, despesas: desp }
  })

  const isPositive = resultado >= 0

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl p-5 ${isPositive ? 'bg-emerald-700' : 'bg-accent'}`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 mb-1">Resultado do mês</p>
        <p className="font-display font-semibold text-[clamp(28px,6vw,38px)] tracking-tight text-white leading-none mb-2">
          {isPositive ? '+' : '–'}&nbsp;R$&nbsp;{fmt(Math.abs(resultado))}
        </p>
        <p className="text-xs text-white/70">
          Receita&nbsp;<span className="font-semibold text-white">R$&nbsp;{fmt(receita)}</span>
          &nbsp;·&nbsp;
          Despesas&nbsp;<span className="font-semibold text-white/80">R$&nbsp;{fmt(despesas)}</span>
        </p>
      </div>

      <div className="flex gap-2">
        {[
          { ok: !!vendaHoje, label: vendaHoje ? 'Venda registrada' : 'Venda pendente' },
          { ok: !!caixaHoje, label: caixaHoje ? 'Caixa fechado' : 'Caixa pendente' },
        ].map(({ ok, label }) => (
          <div key={label} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${
            ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-900/15 border-amber-200/80 dark:border-amber-800/40 text-amber-700 dark:text-amber-400'
          }`}>
            {ok
              ? <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.2"/><polyline points="3.5,7 6,9.5 10.5,4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><line x1="7" y1="4" x2="7" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="9.5" r="0.75" fill="currentColor"/></svg>
            }
            {label}
          </div>
        ))}
      </div>

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
                    {c.diaVencimento && (
                      <p className="font-mono text-[10px] text-mute">dia {c.diaVencimento}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-ink dark:text-gray-100 shrink-0 ml-3">R$ {fmt(c.valor)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
