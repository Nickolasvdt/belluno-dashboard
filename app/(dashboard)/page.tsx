import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import QuickAddFAB from '@/components/QuickAddFAB'

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

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

  type R = { tipo: 'insumo' | 'funcionario'; desc: string; valor: number; date: Date }
  const recent: R[] = [
    ...insumos.slice(0, 4).map(i => ({ tipo: 'insumo' as const, desc: i.fornecedor, valor: i.valor, date: i.date })),
    ...funcionarios.slice(0, 3).map(f => ({ tipo: 'funcionario' as const, desc: f.nome, valor: f.valor, date: f.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)

  const mesLabel   = format(now, 'MMMM yyyy', { locale: ptBR })
  const isPositive = resultado >= 0

  return (
    <div className="space-y-6">
      {/* Month label */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 capitalize">
        {mesLabel}
      </p>

      {/* Hero card — gradient based on resultado */}
      <div className={`rounded-2xl p-5 shadow-md ${isPositive
        ? 'bg-gradient-to-br from-emerald-600 to-emerald-500'
        : 'bg-gradient-to-br from-[#8B2020] to-[#b02a2a]'
      }`}>
        <p className="text-xs text-white/70 mb-1 uppercase tracking-wide">Resultado do mês</p>
        <p className="text-4xl font-display font-bold tracking-tight mb-5 text-white">
          {isPositive ? '+' : '–'}&nbsp;R$&nbsp;{fmt(Math.abs(resultado))}
        </p>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-[10px] text-white/60 mb-0.5 uppercase tracking-wide">Receita líquida</p>
            <p className="text-lg font-bold text-white">R$ {fmt(receita)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/60 mb-0.5 uppercase tracking-wide">Despesas</p>
            <p className="text-lg font-bold text-white/80">R$ {fmt(despesas)}</p>
          </div>
        </div>
      </div>

      {/* Today status */}
      <div className="flex gap-2">
        <div className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium ${
          vendaHoje
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-900/15 border-amber-200/80 dark:border-amber-800/40 text-amber-700 dark:text-amber-400'
        }`}>
          {vendaHoje
            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.2" /><polyline points="3.5,7 6,9.5 10.5,4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" /><line x1="7" y1="4" x2="7" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="7" cy="9.5" r="0.75" fill="currentColor" /></svg>
          }
          <span className="text-xs">Venda{vendaHoje ? ' registrada' : ' pendente'}</span>
        </div>
        <div className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium ${
          caixaHoje
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-900/15 border-amber-200/80 dark:border-amber-800/40 text-amber-700 dark:text-amber-400'
        }`}>
          {caixaHoje
            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.2" /><polyline points="3.5,7 6,9.5 10.5,4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" /><line x1="7" y1="4" x2="7" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="7" cy="9.5" r="0.75" fill="currentColor" /></svg>
          }
          <span className="text-xs">Caixa{caixaHoje ? ' fechado' : ' pendente'}</span>
        </div>
      </div>

      {/* Pending accounts */}
      {pendentes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
              Contas Pendentes
            </p>
            <Link href="/fechamento" className="text-xs text-primary font-semibold hover:underline underline-offset-2">
              Ver todas →
            </Link>
          </div>
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {pendentes.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{c.despesa}</p>
                    {c.diaVencimento && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500">Vence dia {c.diaVencimento}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 shrink-0 ml-3">
                  R$ {fmt(c.valor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent registrations */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
              Gastos Recentes
            </p>
            <Link href="/gastos" className="text-xs text-primary font-semibold hover:underline underline-offset-2">
              Ver todos →
            </Link>
          </div>
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {recent.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    item.tipo === 'insumo'
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-primary dark:text-red-400'
                  }`}>
                    {item.tipo === 'insumo' ? 'Insumo' : 'Func.'}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.desc}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 shrink-0 ml-3">
                  R$ {fmt(item.valor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <QuickAddFAB />
    </div>
  )
}
