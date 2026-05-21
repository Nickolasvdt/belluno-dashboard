import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const fechamento = saldoInicial + entradas - saidas
    const diferenca = fechamento - (saldoInicial + entradas - saidas)

    const registro = await prisma.cashFlow.update({
      where: { id },
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
