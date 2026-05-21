import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, startOfMonth, endOfMonth } from 'date-fns'
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
  const end = endOfMonth(now)

  const [vendas, insumos, funcionarios, contas] = await Promise.all([
    prisma.venda.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.insumo.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: 'desc' } }),
    prisma.funcionario.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: 'desc' } }),
    prisma.contaFixa.findMany({ where: { date: { gte: start, lte: end } } }),
  ])

  const bruto = r2(vendas.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros), 0))
  const taxas = r2(vendas.reduce((s, v) => r2(s + v.taxas), 0))
  const receita = r2(bruto - taxas)
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

  const mesLabel = format(now, 'MMMM yyyy', { locale: ptBR })
  const isPositive = resultado >= 0

  return (
    <div className="space-y-6">
      {/* Month label */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 capitalize">{mesLabel}</p>

      {/* Hero card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800 p-5 shadow-sm">
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Resultado do mês</p>
        <p className={`text-4xl font-display font-bold tracking-tight mb-5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
          {isPositive ? '+' : '–'}&nbsp;R$&nbsp;{fmt(Math.abs(resultado))}
        </p>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cream-200 dark:border-zinc-800">
          <div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mb-0.5 uppercase tracking-wide">Receita líquida</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">R$ {fmt(receita)}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mb-0.5 uppercase tracking-wide">Despesas</p>
            <p className="text-lg font-bold text-primary">R$ {fmt(despesas)}</p>
          </div>
        </div>
      </div>

      {/* Pending accounts */}
      {pendentes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Contas Pendentes</p>
            <Link href="/fechamento" className="text-xs text-primary font-semibold">Ver todas →</Link>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800 divide-y divide-cream-200 dark:divide-zinc-800 overflow-hidden shadow-sm">
            {pendentes.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{c.despesa}</p>
                    {c.diaVencimento && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500">Vence dia {c.diaVencimento}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 shrink-0 ml-3">R$ {fmt(c.valor)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent registrations */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Registros Recentes</p>
            <Link href="/gastos" className="text-xs text-primary font-semibold">Ver todos →</Link>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800 divide-y divide-cream-200 dark:divide-zinc-800 overflow-hidden shadow-sm">
            {recent.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    item.tipo === 'insumo'
                      ? 'bg-amber-50 dark:bg-zinc-800 text-amber-700 dark:text-amber-400'
                      : 'bg-red-50 dark:bg-zinc-800 text-primary'
                  }`}>
                    {item.tipo === 'insumo' ? 'Insumo' : 'Func.'}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.desc}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 shrink-0 ml-3">R$ {fmt(item.valor)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <QuickAddFAB />
    </div>
  )
}
