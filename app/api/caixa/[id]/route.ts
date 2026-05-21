import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { date, saldoInicial, entradas, saidas, observacao } = body

    const si = round2(parseFloat(saldoInicial) || 0)
    const en = round2(parseFloat(entradas) || 0)
    const sa = round2(parseFloat(saidas) || 0)
    const fechamento = round2(si + en - sa)

    const registro = await prisma.cashFlow.update({
      where: { id },
      data: {
        date: new Date(date),
        saldoInicial: si,
        entradas: en,
        saidas: sa,
        fechamento,
        diferenca: null,
        observacao: observacao || null,
      },
    })

    return NextResponse.json(registro)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar registro' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const id = parseInt(params.id)
    await prisma.cashFlow.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Registro deletado com sucesso' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao deletar registro' },
      { status: 500 }
    )
  }
}
