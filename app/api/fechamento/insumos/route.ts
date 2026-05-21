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

    const insumos = await prisma.insumo.findMany({ where, orderBy: { fornecedor: 'asc' } })
    return NextResponse.json(insumos)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar insumos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { date, fornecedor, valor } = body

    const insumo = await prisma.insumo.create({
      data: {
        date: new Date(date),
        fornecedor,
        valor: round2(parseFloat(valor) || 0),
      },
    })

    return NextResponse.json(insumo, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar insumo' }, { status: 500 })
  }
}
