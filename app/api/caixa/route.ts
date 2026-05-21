import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar todos os registros
export async function GET(request: NextRequest) {
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

// POST - Criar novo registro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, saldoInicial, entradas, saidas, observacao } = body

    const fechamento = saldoInicial + entradas - saidas
    const diferenca = fechamento - (saldoInicial + entradas - saidas)

    const registro = await prisma.cashFlow.create({
      data: {
        date: new Date(date),
        saldoInicial: parseFloat(saldoInicial) || 0,
        entradas: parseFloat(entradas) || 0,
        saidas: parseFloat(saidas) || 0,
        fechamento,
        diferenca: diferenca !== 0 ? diferenca : null,
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
