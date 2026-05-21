import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const mes = parseInt(searchParams.get('mes') ?? '0')
    const ano = parseInt(searchParams.get('ano') ?? '0')

    const where = mes && ano ? {
      date: {
        gte: new Date(ano, mes - 1, 1),
        lte: new Date(ano, mes, 0, 23, 59, 59),
      },
    } : {}

    const vendas = await prisma.venda.findMany({ where, orderBy: { date: 'asc' } })
    return NextResponse.json(vendas)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { date, avista, debito, credito, pix, ifood, pizzas, observacao } = body

    const venda = await prisma.venda.create({
      data: {
        date: new Date(date),
        avista: round2(parseFloat(avista) || 0),
        debito: round2(parseFloat(debito) || 0),
        credito: round2(parseFloat(credito) || 0),
        pix: round2(parseFloat(pix) || 0),
        ifood: round2(parseFloat(ifood) || 0),
        pizzas: parseInt(pizzas) || 0,
        observacao: observacao || null,
      },
    })

    return NextResponse.json(venda, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar venda' }, { status: 500 })
  }
}
