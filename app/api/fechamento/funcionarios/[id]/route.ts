import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { date, nome, semana, valor } = body

    const func = await prisma.funcionario.update({
      where: { id },
      data: {
        date: new Date(date),
        nome,
        semana: semana || null,
        valor: round2(parseFloat(valor) || 0),
      },
    })

    return NextResponse.json(func)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar funcionário' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    await prisma.funcionario.delete({ where: { id: parseInt(params.id) } })
    return NextResponse.json({ message: 'Funcionário deletado' })
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar funcionário' }, { status: 500 })
  }
}
