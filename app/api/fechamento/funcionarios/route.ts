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

    const funcionarios = await prisma.funcionario.findMany({ where, orderBy: { nome: 'asc' } })
    return NextResponse.json(funcionarios)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar funcionários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const body = await request.json()
    const { date, nome, semana, valor } = body

    const func = await prisma.funcionario.create({
      data: {
        date: new Date(date),
        nome,
        semana: semana || null,
        valor: round2(parseFloat(valor) || 0),
      },
    })

    return NextResponse.json(func, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 })
  }
}
