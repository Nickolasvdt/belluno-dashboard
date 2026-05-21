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
    totalReceita, receitaLiquida, lucroLiquido, cmvPct, totalPizzas,
    totalFunc, totalFixas, totalInsumos, totalDespesa, totalTaxas,
    saldoAtual,
    dadosMensais, activity: activity.slice(0, 12),
    contasPendentes, mesAtual: format(hoje, 'MMMM yyyy', { locale: ptBR }),
  }
}

const dotColor: Record<string, string> = {
  'Venda':      'bg-emerald-500',
  'Insumo':     'bg-sky-500',
  'Funcionário':'bg-violet-500',
  'Conta Fixa': 'bg-amber-500',
  'Caixa':      'bg-zinc-400',
}
const typeColor: Record<string, string> = {
  'Venda':      'text-emerald-600 dark:text-emerald-400',
  'Insumo':     'text-sky-600 dark:text-sky-400',
  'Funcionário':'text-violet-600 dark:text-violet-400',
  'Conta Fixa': 'text-amber-600 dark:text-amber-400',
  'Caixa':      'text-gray-400 dark:text-zinc-600',
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/caixa')

  const d = await getDashboardData()
  const hoje = new Date()
  const margem = d.receitaLiquida > 0 ? (d.lucroLiquido / d.receitaLiquida) * 100 : 0
  const ticketMedio = d.totalPizzas > 0 ? round2(d.totalReceita / d.totalPizzas) : 0

  const cardCls = 'bg-white dark:bg-zinc-900 rounded-2xl border border-cream-200 dark:border-zinc-800/50 shadow-sm'

  return (
    <div className="space-y-5 min-w-0">

      {/* ── Header ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary/60 mb-1.5">
          Belluno Pizzaria
        </p>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-white leading-tight">
          Visão Geral{' '}
          <span className="block sm:inline font-display italic font-normal text-gray-400 dark:text-zinc-600 text-lg sm:text-xl">
            — {d.mesAtual}
          </span>
        </h1>
      </div>

      {/* ── Hero + Quick Entry ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Hero Result Card */}
        <div
          className="lg:col-span-2 relative overflow-hidden rounded-3xl shadow-xl shadow-primary/20"
          style={{ background: 'linear-gradient(135deg, #8B2020 0%, #4e0f0f 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/[0.04] pointer-events-none" />
          <div className="absolute right-10 -bottom-24 w-60 h-60 rounded-full bg-white/[0.04] pointer-events-none" />
          <div className="absolute -left-10 bottom-6 w-36 h-36 rounded-full bg-white/[0.03] pointer-events-none" />

          <div className="relative p-5 md:p-7">
            <p className="font-display italic text-white/40 text-xs md:text-sm mb-4 md:mb-5 tracking-wide">
              Risultati · {d.mesAtual}
            </p>

            <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between mb-5 md:mb-7 gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-white/40 uppercase tracking-[0.18em] font-medium mb-2">
                  Lucro Líquido
                </p>
                <p className={`text-3xl min-[420px]:text-4xl md:text-5xl font-bold tracking-tight leading-none break-words ${d.lucroLiquido >= 0 ? 'text-white' : 'text-red-200'}`}>
                  {d.lucroLiquido < 0 && <span className="text-2xl md:text-3xl mr-1 text-red-300">−</span>}
                  R$ {fmt(Math.abs(d.lucroLiquido))}
                </p>
              </div>
              <span className={`mt-1 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 ${
                d.lucroLiquido >= 0
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-red-950/60 border-red-500/30 text-red-300'
              }`}>
                {d.lucroLiquido >= 0 ? '✦ Positivo' : '↓ Negativo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 md:pt-5 border-t border-white/10">
              <div>
                <p className="text-[10px] text-white/35 mb-1 md:mb-1.5 uppercase tracking-widest">Receita</p>
                <p className="text-sm md:text-lg font-bold text-white">R$ {fmt(d.totalReceita)}</p>
                <p className="text-[10px] text-white/30 mt-0.5 hidden sm:block">Bruta</p>
              </div>
              <div>
                <p className="text-[10px] text-white/35 mb-1 md:mb-1.5 uppercase tracking-widest">Despesas</p>
                <p className="text-sm md:text-lg font-bold text-white/70">R$ {fmt(d.totalDespesa)}</p>
                <p className="text-[10px] text-white/30 mt-0.5 hidden sm:block">Total</p>
              </div>
              <div>
                <p className="text-[10px] text-white/35 mb-1 md:mb-1.5 uppercase tracking-widest">Margem</p>
                <p className="text-sm md:text-lg font-bold text-white/90">
                  {d.receitaLiquida > 0 ? `${margem.toFixed(0)}%` : '—'}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5 hidden sm:block">Líquida</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Entry */}
        <QuickEntry />
      </div>

      {/* ── Supporting KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            icon: '🍅',
            label: 'CMV',
            value: `${d.cmvPct.toFixed(1)}%`,
            sub: 'Custo de mercadoria',
            dot: d.cmvPct <= 30 ? 'bg-emerald-400' : d.cmvPct <= 40 ? 'bg-amber-400' : 'bg-red-500',
          },
          {
            icon: '💵',
            label: 'Receita Líquida',
            value: `R$ ${fmt(d.receitaLiquida)}`,
            sub: 'Após taxas de cartão',
            dot: 'bg-emerald-400',
          },
          {
            icon: '🏦',
            label: 'Saldo no Caixa',
            value: `R$ ${fmt(d.saldoAtual)}`,
            sub: 'Último fechamento',
            dot: d.saldoAtual >= 0 ? 'bg-emerald-400' : 'bg-red-500',
          },
          {
            icon: '🍕',
            label: 'Pizzas vendidas',
            value: String(d.totalPizzas),
            sub: d.totalPizzas > 0 ? `Ticket R$ ${fmt(ticketMedio)}` : 'Sem vendas',
            dot: 'bg-amber-400',
          },
        ].map(c => (
          <div key={c.label} className={`${cardCls} p-4 min-w-0`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{c.icon}</span>
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight break-words">{c.value}</p>
            <p className="text-xs font-display italic text-gray-400 dark:text-zinc-500 mt-1">{c.label}</p>
            <p className="text-[11px] text-gray-300 dark:text-zinc-700 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Performance Indicators ── */}
      <div className={`${cardCls} p-5`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-zinc-600 mb-5">
          Indicadores de Desempenho
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:pr-5 sm:border-r border-cream-200 dark:border-zinc-800/50">
            <div className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between min-[420px]:items-baseline gap-1 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Custo de Mercadoria</span>
              <span className={`text-sm font-bold ${d.cmvPct <= 30 ? 'text-emerald-600 dark:text-emerald-400' : d.cmvPct <= 40 ? 'text-amber-500' : 'text-red-600'}`}>
                {d.cmvPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-cream-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${d.cmvPct <= 30 ? 'bg-emerald-500' : d.cmvPct <= 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${Math.min(d.cmvPct, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">
              {d.cmvPct <= 30 ? '✦ Excelente — meta ≤ 30%' : d.cmvPct <= 40 ? '⚡ Atenção — 30–40%' : '⚠ Crítico — acima de 40%'}
            </p>
          </div>

          <div className="sm:px-5 sm:border-r border-cream-200 dark:border-zinc-800/50">
            <div className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between min-[420px]:items-baseline gap-1 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Margem de Lucro</span>
              <span className={`text-sm font-bold ${d.lucroLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                {d.receitaLiquida > 0 ? `${margem.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="h-1.5 bg-cream-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full ${d.lucroLiquido >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.max(margem, 0), 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">
              Lucro R$ {fmt(d.lucroLiquido)} / Receita R$ {fmt(d.receitaLiquida)}
            </p>
          </div>

          <div className="sm:pl-5">
            <div className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between min-[420px]:items-baseline gap-1 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Peso das Despesas</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {d.totalReceita > 0 ? `${((d.totalDespesa / d.totalReceita) * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="h-1.5 bg-cream-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${Math.min(d.totalReceita > 0 ? (d.totalDespesa / d.totalReceita) * 100 : 0, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">
              R$ {fmt(d.totalDespesa)} de R$ {fmt(d.totalReceita)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Chart + Contas Pendentes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        <div className={`lg:col-span-3 ${cardCls} p-5`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-zinc-600 mb-0.5">
                Evolução
              </p>
              <h3 className="font-display italic text-lg text-gray-800 dark:text-gray-200">
                Últimos 6 meses
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 dark:text-zinc-600 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Receita
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Despesa
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-[2px] bg-amber-500 inline-block rounded-full" />Lucro
              </span>
            </div>
          </div>
          <GraficoFechamento dados={d.dadosMensais} />
        </div>

        <div className={`lg:col-span-2 ${cardCls} flex flex-col`}>
          <div className="px-5 py-4 border-b border-cream-200 dark:border-zinc-800/50 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-zinc-600 mb-0.5">
                A Pagar
              </p>
              <h3 className="font-display italic text-gray-800 dark:text-gray-200">Pendências</h3>
            </div>
            {d.contasPendentes.length > 0 && (
              <span className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                {d.contasPendentes.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[260px]">
            {d.contasPendentes.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm font-display italic text-gray-400 dark:text-zinc-600">
                Tudo em dia ✓
              </p>
            ) : (
              <div className="divide-y divide-cream-100 dark:divide-zinc-800/40">
                {d.contasPendentes.map(c => {
                  const diaVenc = c.diaVencimento
                  const daysLeft = diaVenc ? diaVenc - hoje.getDate() : null
                  const vencida = daysLeft !== null && daysLeft < 0
                  const urgente = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3
                  return (
                    <div key={c.id} className="px-4 py-3 flex items-center gap-3 hover:bg-cream-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <div className={`w-1 h-10 rounded-full shrink-0 ${
                        vencida ? 'bg-red-500' : urgente ? 'bg-amber-400' : 'bg-cream-300 dark:bg-zinc-700'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.despesa}</p>
                        <p className={`text-[11px] mt-0.5 ${vencida ? 'text-red-500' : urgente ? 'text-amber-500' : 'text-gray-400 dark:text-zinc-600'}`}>
                          {diaVenc
                            ? vencida
                              ? `Venceu dia ${diaVenc}`
                              : urgente
                                ? `Vence em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
                                : `Vence dia ${diaVenc}`
                            : format(new Date(c.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">
                        R$ {fmt(c.valor)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {d.contasPendentes.length > 0 && (
            <div className="px-5 py-3 border-t border-cream-200 dark:border-zinc-800/50 bg-cream-50/60 dark:bg-zinc-800/20 rounded-b-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-display italic text-gray-500 dark:text-zinc-500">Total em aberto</span>
                <span className="text-sm font-bold text-primary">
                  R$ {fmt(d.contasPendentes.reduce((a, c) => round2(a + c.valor), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Breakdown Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: '👷', label: 'Funcionários',  value: `R$ ${fmt(d.totalFunc)}`,    bg: 'bg-violet-50 dark:bg-violet-900/10',  color: 'text-violet-700 dark:text-violet-400' },
          { icon: '🏢', label: 'Contas Fixas',  value: `R$ ${fmt(d.totalFixas)}`,   bg: 'bg-amber-50 dark:bg-amber-900/10',    color: 'text-amber-700 dark:text-amber-400' },
          { icon: '🛒', label: 'Insumos',       value: `R$ ${fmt(d.totalInsumos)}`, bg: 'bg-sky-50 dark:bg-sky-900/10',        color: 'text-sky-700 dark:text-sky-400' },
          { icon: '💳', label: 'Taxas Cartão',  value: `R$ ${fmt(d.totalTaxas)}`,   bg: 'bg-orange-50 dark:bg-orange-900/10',  color: 'text-orange-700 dark:text-orange-400' },
        ].map(c => (
          <div key={c.label} className={`${cardCls} p-4 flex items-center gap-3 min-w-0`}>
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-lg shrink-0`}>
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 dark:text-zinc-600 uppercase tracking-widest font-medium truncate">
                {c.label}
              </p>
              <p className={`text-sm font-bold mt-0.5 break-words ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Activity Timeline ── */}
      <div className={`${cardCls}`}>
        <div className="px-5 py-4 border-b border-cream-200 dark:border-zinc-800/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-zinc-600 mb-0.5">
            Histórico
          </p>
          <h3 className="font-display italic text-gray-800 dark:text-gray-200">Atividade Recente</h3>
        </div>

        <div className="px-5 py-5">
          {d.activity.length === 0 ? (
            <p className="text-center text-sm font-display italic text-gray-400 dark:text-zinc-600 py-4">
              Nenhum registro ainda.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-[6px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-cream-300 dark:via-zinc-800 to-transparent" />
              <div className="space-y-0">
                {d.activity.map(a => (
                  <div key={a.key} className="flex gap-4 items-start group">
                    <div className={`mt-[15px] w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 shrink-0 z-10 ${dotColor[a.type] ?? 'bg-zinc-400'}`} />
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-cream-100 dark:border-zinc-800/40 group-last:border-0 min-w-0 gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${typeColor[a.type] ?? 'text-gray-400'}`}>
                            {a.type}
                          </span>
                          <span className="text-gray-200 dark:text-zinc-800 select-none">·</span>
                          <span className="text-[11px] text-gray-400 dark:text-zinc-600">
                            {format(a.date, "dd 'de' MMM", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{a.label}</p>
                        {a.sub && (
                          <p className="text-[11px] text-gray-400 dark:text-zinc-600 mt-0.5">{a.sub}</p>
                        )}
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${a.isRevenue ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                        {a.isRevenue ? '+' : '−'} R$ {fmt(a.valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
