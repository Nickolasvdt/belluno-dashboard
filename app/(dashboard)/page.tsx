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

  const [vendas, funcionarios, contas, insumos, cashflows, contasPendentes] = await Promise.all([
    prisma.venda.findMany({ where: { date: { gte: inicioMes, lte: fimMes } }, orderBy: { date: 'desc' } }),
    prisma.funcionario.findMany({ where: { date: { gte: inicioMes, lte: fimMes } } }),
    prisma.contaFixa.findMany({ where: { date: { gte: inicioMes, lte: fimMes } } }),
    prisma.insumo.findMany({ where: { date: { gte: inicioMes, lte: fimMes } } }),
    prisma.cashFlow.findMany({ where: { date: { gte: inicioMes, lte: fimMes } }, orderBy: { date: 'desc' } }),
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
  const vendaComPizzasSemReceita = vendas.some(v => v.pizzas > 0 && brutoDia(v) === 0)
  const saldoAtual = cashflows[0]?.fechamento ?? 0

  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
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

  const [recentVendas, recentInsumos, recentFunc, recentContas, recentCaixa] = await Promise.all([
    prisma.venda.findMany({ orderBy: { date: 'desc' }, take: 4, select: { id: true, date: true, avista: true, debito: true, credito: true, pix: true, ifood: true, outros: true, pizzas: true } }),
    prisma.insumo.findMany({ orderBy: { date: 'desc' }, take: 3, select: { id: true, date: true, fornecedor: true, valor: true } }),
    prisma.funcionario.findMany({ orderBy: { date: 'desc' }, take: 3, select: { id: true, date: true, nome: true, valor: true, semana: true } }),
    prisma.contaFixa.findMany({ orderBy: { date: 'desc' }, take: 3, select: { id: true, date: true, despesa: true, valor: true, pago: true } }),
    prisma.cashFlow.findMany({ orderBy: { date: 'desc' }, take: 3, select: { id: true, date: true, entradas: true, saidas: true, fechamento: true } }),
  ])

  type ActivityItem = { key: string; date: Date; type: string; label: string; valor: number; isRevenue: boolean; sub?: string }
  const activity: ActivityItem[] = [
    ...recentVendas.map(v => ({
      key: `v-${v.id}`, date: new Date(v.date), type: 'Venda',
      label: `${v.pizzas} pizza${v.pizzas !== 1 ? 's' : ''}`,
      valor: round2(v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros),
      isRevenue: true,
    })),
    ...recentInsumos.map(i => ({
      key: `i-${i.id}`, date: new Date(i.date), type: 'Insumo',
      label: i.fornecedor, valor: i.valor, isRevenue: false,
    })),
    ...recentFunc.map(f => ({
      key: `f-${f.id}`, date: new Date(f.date), type: 'Funcionário',
      label: f.nome, valor: f.valor, isRevenue: false,
      sub: f.semana ?? undefined,
    })),
    ...recentContas.map(c => ({
      key: `c-${c.id}`, date: new Date(c.date), type: 'Conta Fixa',
      label: c.despesa, valor: c.valor, isRevenue: false,
      sub: c.pago ? 'Pago' : 'Pendente',
    })),
    ...recentCaixa.map(cf => ({
      key: `cf-${cf.id}`, date: new Date(cf.date), type: 'Caixa',
      label: `Fech. R$ ${fmt(cf.fechamento)}`,
      valor: cf.entradas, isRevenue: false,
      sub: `Saídas R$ ${fmt(cf.saidas)}`,
    })),
  ]
  activity.sort((a, b) => b.date.getTime() - a.date.getTime())

  return {
    totalReceita, receitaLiquida, lucroLiquido, cmvPct, totalPizzas, pizzasComReceita,
    totalFunc, totalFixas, totalInsumos, totalDespesa, totalTaxas,
    saldoAtual, vendaComPizzasSemReceita,
    dadosMensais, activity: activity.slice(0, 8),
    contasPendentes, mesAtual: format(hoje, 'MMMM yyyy', { locale: ptBR }),
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/caixa')

  const d = await getDashboardData()
  const hoje = new Date()
  const margem = d.receitaLiquida > 0 ? (d.lucroLiquido / d.receitaLiquida) * 100 : 0
  const ticketMedio = d.pizzasComReceita > 0 ? round2(d.totalReceita / d.pizzasComReceita) : 0
  const despesasPct = d.totalReceita > 0 ? round2((d.totalDespesa / d.totalReceita) * 100) : 0

  const cardCls = 'bg-wood-50 dark:bg-zinc-900 rounded-xl border border-wood-200 dark:border-zinc-800/60 shadow-sm shadow-wood-700/5'
  const labelCls = 'text-[11px] font-medium uppercase tracking-wide text-wood-500 dark:text-zinc-600'
  const positive = d.lucroLiquido >= 0

  const essentials = [
    { label: 'Receita líquida', value: `R$ ${fmt(d.receitaLiquida)}` },
    { label: 'Despesas', value: `R$ ${fmt(d.totalDespesa)}` },
    { label: 'Pizzas', value: String(d.totalPizzas) },
  ]

  const indicators = [
    {
      label: 'CMV',
      value: `${d.cmvPct.toFixed(1)}%`,
      hint: 'Meta até 30%',
      tone: d.cmvPct <= 30 ? 'text-emerald-600 dark:text-emerald-400' : d.cmvPct <= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Saldo no caixa',
      value: `R$ ${fmt(d.saldoAtual)}`,
      hint: 'Último fechamento',
      tone: d.saldoAtual >= 0 ? 'text-wood-700 dark:text-white' : 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Taxas',
      value: `R$ ${fmt(d.totalTaxas)}`,
      hint: 'Cartões e plataformas',
      tone: 'text-wood-700 dark:text-white',
    },
    {
      label: 'Ticket médio',
      value: d.pizzasComReceita > 0 ? `R$ ${fmt(ticketMedio)}` : 'R$ 0,00',
      hint: d.vendaComPizzasSemReceita ? 'Dados de venda incompletos' : 'Por pizza vendida',
      tone: 'text-wood-700 dark:text-white',
    },
  ]

  const breakdown = [
    { label: 'Funcionários', value: `R$ ${fmt(d.totalFunc)}` },
    { label: 'Contas fixas', value: `R$ ${fmt(d.totalFixas)}` },
    { label: 'Insumos', value: `R$ ${fmt(d.totalInsumos)}` },
    { label: 'Receita bruta', value: `R$ ${fmt(d.totalReceita)}` },
  ]

  return (
    <div className="space-y-4 min-w-0">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className={labelCls}>Belluno Pizzaria</p>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-wood-700 dark:text-white leading-tight">
            Visão geral
          </h1>
        </div>
        <p className="text-sm text-wood-500 dark:text-zinc-500 capitalize">{d.mesAtual}</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${cardCls} p-5 self-start`}>
          <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between gap-3">
            <div className="min-w-0">
              <p className={labelCls}>Resultado do mês</p>
              <p className={`mt-2 text-3xl sm:text-4xl font-bold tracking-tight leading-none break-words ${positive ? 'text-wood-700 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                {positive ? '' : '-'}R$ {fmt(Math.abs(d.lucroLiquido))}
              </p>
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${positive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
              {positive ? 'Positivo' : 'Negativo'}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 border-t border-wood-200 dark:border-zinc-800">
            {essentials.map((item, index) => (
              <div key={item.label} className={`pt-4 sm:pr-4 border-wood-200 dark:border-zinc-800 ${index > 0 ? 'sm:border-l sm:pl-4' : ''}`}>
                <p className={labelCls}>{item.label}</p>
                <p className="mt-1 text-base font-semibold text-wood-700 dark:text-white break-words">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <QuickEntry />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {indicators.map((item) => (
          <div key={item.label} className={`${cardCls} p-4 min-w-0`}>
            <p className={labelCls}>{item.label}</p>
            <p className={`mt-1 text-lg font-semibold break-words ${item.tone}`}>{item.value}</p>
            <p className="mt-0.5 text-xs text-wood-500 dark:text-zinc-600">{item.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className={`lg:col-span-3 ${cardCls} p-5`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
            <div>
              <p className={labelCls}>Evolução</p>
              <h2 className="text-base font-semibold text-wood-700 dark:text-white">Últimos 6 meses</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-wood-400 dark:text-zinc-600">
              <span>Receita</span>
              <span>Despesa</span>
              <span>Lucro</span>
            </div>
          </div>
          <GraficoFechamento dados={d.dadosMensais} />
        </div>

        <div className={`lg:col-span-2 ${cardCls} flex flex-col`}>
          <div className="px-5 py-4 border-b border-wood-200 dark:border-zinc-800/60 flex items-center justify-between">
            <div>
              <p className={labelCls}>A pagar</p>
              <h2 className="text-base font-semibold text-wood-700 dark:text-white">Pendências</h2>
            </div>
            {d.contasPendentes.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {d.contasPendentes.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[280px]">
            {d.contasPendentes.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-wood-400 dark:text-zinc-600">
                Tudo em dia
              </p>
            ) : (
              <div className="divide-y divide-wood-200 dark:divide-zinc-800/50">
                {d.contasPendentes.map(c => {
                  const diaVenc = c.diaVencimento
                  const daysLeft = diaVenc ? diaVenc - hoje.getDate() : null
                  const vencida = daysLeft !== null && daysLeft < 0
                  const urgente = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3
                  return (
                    <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-wood-700 dark:text-white truncate">{c.despesa}</p>
                        <p className={`text-xs mt-0.5 ${vencida ? 'text-red-500' : urgente ? 'text-amber-600 dark:text-amber-400' : 'text-wood-400 dark:text-zinc-600'}`}>
                          {diaVenc
                            ? vencida
                              ? `Venceu dia ${diaVenc}`
                              : urgente
                                ? `Vence em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
                                : `Vence dia ${diaVenc}`
                            : format(new Date(c.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-wood-700 dark:text-white shrink-0">
                        R$ {fmt(c.valor)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <details className={`${cardCls} group`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className={labelCls}>Completo, sem poluir a tela</p>
            <h2 className="text-base font-semibold text-wood-700 dark:text-white">Detalhes do mês</h2>
          </div>
          <span className="text-sm text-wood-400 transition-transform group-open:rotate-180">v</span>
        </summary>

        <div className="border-t border-wood-200 dark:border-zinc-800/60 p-5 space-y-6">
          <div>
            <p className={`${labelCls} mb-3`}>Custos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {breakdown.map((item) => (
                <div key={item.label} className="rounded-lg border border-wood-200 dark:border-zinc-800 p-3">
                  <p className="text-xs text-wood-500 dark:text-zinc-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-wood-700 dark:text-white break-words">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className={`${labelCls} mb-3`}>Indicadores</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'CMV', value: d.cmvPct, display: `${d.cmvPct.toFixed(1)}%` },
                { label: 'Margem', value: Math.max(margem, 0), display: d.receitaLiquida > 0 ? `${margem.toFixed(1)}%` : '0%' },
                { label: 'Despesas / receita', value: despesasPct, display: `${despesasPct.toFixed(1)}%` },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm text-wood-600 dark:text-zinc-400">{item.label}</span>
                    <span className="text-sm font-semibold text-wood-700 dark:text-white">{item.display}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-wood-200 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(item.value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className={`${labelCls} mb-3`}>Atividade recente</p>
            {d.activity.length === 0 ? (
              <p className="text-sm text-wood-400 dark:text-zinc-600">Nenhum registro ainda.</p>
            ) : (
              <div className="divide-y divide-wood-200 dark:divide-zinc-800/60">
                {d.activity.map(a => (
                  <div key={a.key} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-wood-700 dark:text-white truncate">{a.label}</p>
                      <p className="text-xs text-wood-400 dark:text-zinc-600">
                        {a.type} - {format(a.date, "dd 'de' MMM", { locale: ptBR })}
                        {a.sub ? ` - ${a.sub}` : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${a.isRevenue ? 'text-emerald-600 dark:text-emerald-400' : 'text-wood-700 dark:text-white'}`}>
                      {a.isRevenue ? '+' : '-'} R$ {fmt(a.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  )
}
