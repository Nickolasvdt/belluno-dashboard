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
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let whereClause = {}

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

      whereClause = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      }
    }

    const registros = await prisma.cashFlow.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(registros)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar registros' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { date, saldoInicial, entradas, saidas, observacao, diferenca } = body

    const si = round2(parseFloat(saldoInicial) || 0)
    const en = round2(parseFloat(entradas) || 0)
    const sa = round2(parseFloat(saidas) || 0)
    const fechamento = round2(si + en - sa)

    const registro = await prisma.cashFlow.create({
      data: {
        date: new Date(date),
        saldoInicial: si,
        entradas: en,
        saidas: sa,
        fechamento,
        diferenca: diferenca != null && diferenca !== '' ? round2(parseFloat(diferenca)) : null,
        observacao: observacao || null,
      },
    })

    return NextResponse.json(registro, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar registro' },
      { status: 500 }
    )
  }
}
