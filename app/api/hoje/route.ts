import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function round2(n: number) { return Math.round(n * 100) / 100 }
function weekOf(date: Date) { return Math.min(Math.ceil(new Date(date).getDate() / 7), 4) }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
    const mes = parseInt(searchParams.get('mes') ?? String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') ?? String(new Date().getFullYear()))

    const d = new Date(dateStr + 'T00:00:00')
    const todayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const todayEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    const monthStart = new Date(ano, mes - 1, 1)
    const monthEnd   = new Date(ano, mes, 0, 23, 59, 59)

    const [vendas, fechamentos, insumos, funcionarios, contas, fechamentoDia, caixaHoje] =
      await Promise.all([
        prisma.venda.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.fechamentoDia.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.insumo.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.funcionario.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.contaFixa.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.fechamentoDia.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
        prisma.cashFlow.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
      ])

    const receitaVendas = round2(vendas.reduce((s, v) =>
      round2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros - v.taxas), 0))
    const receitaFechs  = round2(fechamentos.reduce((s, f) =>
      round2(s + f.avista + f.ifood + f.noventa9 + f.keeta + f.extra), 0))
    const receita  = round2(receitaVendas + receitaFechs)
    const despesas = round2(
      insumos.reduce((s, i) => round2(s + i.valor), 0) +
      funcionarios.reduce((s, f) => round2(s + f.valor), 0) +
      contas.reduce((s, c) => round2(s + c.valor), 0)
    )
    const resultado = round2(receita - despesas)
    const pizzas = vendas.reduce((s, v) => s + v.pizzas, 0) +
                   fechamentos.reduce((s, f) => s + f.pizzas, 0)

    const pendentes = contas
      .filter(c => !c.pago)
      .sort((a, b) => (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99))
      .slice(0, 5)

    const weeklyData = [1, 2, 3, 4].map(w => {
      const wV  = vendas.filter(v => weekOf(v.date) === w)
      const wF  = fechamentos.filter(f => weekOf(f.date) === w)
      const wI  = insumos.filter(i => weekOf(i.date) === w)
      const wFu = funcionarios.filter(f => weekOf(f.date) === w)
      const wC  = contas.filter(c => weekOf(c.date) === w)
      const rec = round2(
        wV.reduce((s, v) => round2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros - v.taxas), 0) +
        wF.reduce((s, f) => round2(s + f.avista + f.ifood + f.noventa9 + f.keeta + f.extra), 0)
      )
      const desp = round2(
        wI.reduce((s, i) => round2(s + i.valor), 0) +
        wFu.reduce((s, f) => round2(s + f.valor), 0) +
        wC.reduce((s, c) => round2(s + c.valor), 0)
      )
      return { label: `S${w}`, receita: rec, despesas: desp }
    })

    return NextResponse.json({
      resultado: { receita, despesas, resultado, pizzas },
      fechamentoDia: fechamentoDia ?? null,
      caixaHoje: caixaHoje ?? null,
      pendentes,
      weeklyData,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
