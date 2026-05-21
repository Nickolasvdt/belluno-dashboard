import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import GraficoFechamento from '@/components/GraficoFechamento'
import QuickEntry from '@/components/QuickEntry'

function round2(n: number) { return Math.round(n * 100) / 100 }
function sum(arr: number[]) { return round2(arr.reduce((a, v) => round2(a + v), 0)) }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

async function getDashboardData() {
  const hoje = new Date()
  const inicioMes = startOfMonth(hoje)
  const fimMes = endOfMonth(hoje)

  const [vendas, funcionarios, contas, insumos, contasPendentes] = await Promise.all([
    prisma.venda.findMany({ where: { date: { gte: inicioMes, lte: fimMes } } }),
    prisma.funcionario.findMany({ where: { date: { gte: inicioMes, lte: fimMes } } }),
    prisma.contaFixa.findMany({ where: { date: { gte: inicioMes, lte: fimMes } } }),
    prisma.insumo.findMany({ where: { date: { gte: inicioMes, lte: fimMes } } }),
    prisma.contaFixa.findMany({
      where: { pago: false },
      orderBy: { diaVencimento: 'asc' },
      take: 8,
    }),
  ])

  const brutoDia = (v: typeof vendas[0]) => round2(v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros)
  const totalReceita = sum(vendas.map(brutoDia))
  const totalTaxas = sum(vendas.map(v => v.taxas))
  const receitaLiquida = round2(totalReceita - totalTaxas)
  const totalFunc = sum(funcionarios.map(f => f.valor))
  const totalFixas = sum(contas.map(c => c.valor))
  const totalInsumos = sum(insumos.map(i => i.valor))
  const totalDespesa = round2(totalFunc + totalFixas + totalInsumos)
  const lucroLiquido = round2(receitaLiquida - totalDespesa)
  const cmvPct = totalReceita > 0 ? round2((totalInsumos / totalReceita) * 100) : 0
  const totalPizzas = vendas.reduce((a, v) => a + v.pizzas, 0)
  const pizzasComReceita = vendas.reduce((a, v) => brutoDia(v) > 0 ? a + v.pizzas : a, 0)

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const dadosMensais = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const ref = subMonths(hoje, 5 - i)
      const ini = startOfMonth(ref)
      const fim = endOfMonth(ref)
      return Promise.all([
        prisma.venda.findMany({ where: { date: { gte: ini, lte: fim } } }),
        prisma.funcionario.aggregate({ where: { date: { gte: ini, lte: fim } }, _sum: { valor: true } }),
        prisma.contaFixa.aggregate({ where: { date: { gte: ini, lte: fim } }, _sum: { valor: true } }),
        prisma.insumo.aggregate({ where: { date: { gte: ini, lte: fim } }, _sum: { valor: true } }),
      ]).then(([vs, fn, ct, in_]) => {
        const rec = sum(vs.map(v => v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros))
        const tax = sum(vs.map(v => v.taxas))
        const liq = round2(rec - tax)
        const desp = round2((fn._sum.valor ?? 0) + (ct._sum.valor ?? 0) + (in_._sum.valor ?? 0))
        return {
          mes: `${MONTHS[ref.getMonth()]}/${String(ref.getFullYear()).slice(2)}`,
          receita: liq,
          despesa: desp,
          lucro: round2(liq - desp),
        }
      })
    })
  )

  return {
    totalReceita, receitaLiquida, lucroLiquido, cmvPct,
    totalPizzas, pizzasComReceita,
    totalDespesa,
    dadosMensais, contasPendentes,
    mesAtual: format(hoje, 'MMMM yyyy', { locale: ptBR }),
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/caixa')

  const d = await getDashboardData()
  const hoje = new Date()
  const positive = d.lucroLiquido >= 0
  const margem = d.receitaLiquida > 0 ? (d.lucroLiquido / d.receitaLiquida) * 100 : 0
  const ticketMedio = d.pizzasComReceita > 0 ? round2(d.totalReceita / d.pizzasComReceita) : 0

  const card = 'bg-white dark:bg-zinc-900 rounded-xl border border-cream-200 dark:border-zinc-800/60 shadow-sm'

  return (
    <div className="space-y-4 min-w-0">

      {/* Header */}
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-lg font-display font-semibold text-gray-800 dark:text-white">Lançamentos</h1>
        <span className="text-sm text-gray-400 dark:text-zinc-500 capitalize shrink-0">{d.mesAtual}</span>
      </div>

      {/* Quick Entry — hero */}
      <QuickEntry />

      {/* Month summary */}
      <div className={`${card} grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-cream-200 dark:divide-zinc-800/60`}>
        <div className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-600">Receita líquida</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">R$ {fmt(d.receitaLiquida)}</p>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">
            {d.totalPizzas} pizza{d.totalPizzas !== 1 ? 's' : ''} · ticket R$ {ticketMedio > 0 ? fmt(ticketMedio) : '—'}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-600">Total despesas</p>
          <p className="mt-1 text-xl font-bold text-primary">R$ {fmt(d.totalDespesa)}</p>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">CMV {d.cmvPct.toFixed(1)}% · meta ≤ 30%</p>
        </div>
        <div className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-600">Resultado do mês</p>
          <p className={`mt-1 text-xl font-bold ${positive ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
            {positive ? '+' : '−'}R$ {fmt(Math.abs(d.lucroLiquido))}
          </p>
          <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">
            Margem {d.receitaLiquida > 0 ? `${margem.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Chart + Pending */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className={`lg:col-span-3 ${card} p-5`}>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-600 mb-4">Evolução · últimos 6 meses</p>
          <GraficoFechamento dados={d.dadosMensais} />
        </div>

        <div className={`lg:col-span-2 ${card} flex flex-col`}>
          <div className="px-5 py-4 border-b border-cream-200 dark:border-zinc-800/60 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Contas pendentes</p>
            {d.contasPendentes.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {d.contasPendentes.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[260px]">
            {d.contasPendentes.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-400 dark:text-zinc-600">Tudo em dia</p>
            ) : (
              <div className="divide-y divide-cream-200 dark:divide-zinc-800/50">
                {d.contasPendentes.map(c => {
                  const diaVenc = c.diaVencimento
                  const daysLeft = diaVenc ? diaVenc - hoje.getDate() : null
                  const vencida = daysLeft !== null && daysLeft < 0
                  const urgente = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3
                  return (
                    <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{c.despesa}</p>
                        <p className={`text-xs mt-0.5 ${vencida ? 'text-red-500' : urgente ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-zinc-600'}`}>
                          {diaVenc
                            ? vencida ? `Venceu dia ${diaVenc}` : urgente ? `Vence em ${daysLeft}d` : `Dia ${diaVenc}`
                            : format(new Date(c.date), 'dd/MM', { locale: ptBR })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-white shrink-0">R$ {fmt(c.valor)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  )
}
