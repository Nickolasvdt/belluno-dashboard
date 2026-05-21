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
    const { date, despesa, valor, pago, diaVencimento } = body

    const conta = await prisma.contaFixa.update({
      where: { id },
      data: {
        date: new Date(date),
        despesa,
        valor: round2(parseFloat(valor) || 0),
        pago: Boolean(pago),
        diaVencimento: diaVencimento ? parseInt(diaVencimento) : null,
      },
    })

    return NextResponse.json(conta)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar conta fixa' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    await prisma.contaFixa.delete({ where: { id: parseInt(params.id) } })
    return NextResponse.json({ message: 'Conta fixa deletada' })
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar conta fixa' }, { status: 500 })
  }
}
