import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const mes = parseInt(searchParams.get('mes') ?? '0')
    const ano = parseInt(searchParams.get('ano') ?? '0')

    if (date) {
      const d = new Date(date + 'T00:00:00')
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      const item = await prisma.fechamentoDia.findFirst({ where: { date: { gte: start, lte: end } } })
      return NextResponse.json(item ?? null)
    }

    if (mes && ano) {
      const items = await prisma.fechamentoDia.findMany({
        where: { date: { gte: new Date(ano, mes - 1, 1), lte: new Date(ano, mes, 0, 23, 59, 59) } },
        orderBy: { date: 'asc' },
      })
      return NextResponse.json(items)
    }

    return NextResponse.json([])
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar fechamento' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { date, avista, ifood, noventa9, keeta, extra, pizzas } = await request.json()
    const item = await prisma.fechamentoDia.create({
      data: {
        date: new Date(date + 'T00:00:00'),
        avista: round2(parseFloat(avista) || 0),
        ifood: round2(parseFloat(ifood) || 0),
        noventa9: round2(parseFloat(noventa9) || 0),
        keeta: round2(parseFloat(keeta) || 0),
        extra: round2(parseFloat(extra) || 0),
        pizzas: parseInt(pizzas) || 0,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar fechamento' }, { status: 500 })
  }
}
