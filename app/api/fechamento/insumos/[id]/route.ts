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
    const { date, fornecedor, valor } = body

    const insumo = await prisma.insumo.update({
      where: { id },
      data: {
        date: new Date(date),
        fornecedor,
        valor: round2(parseFloat(valor) || 0),
      },
    })

    return NextResponse.json(insumo)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar insumo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    await prisma.insumo.delete({ where: { id: parseInt(params.id) } })
    return NextResponse.json({ message: 'Insumo deletado' })
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar insumo' }, { status: 500 })
  }
}
