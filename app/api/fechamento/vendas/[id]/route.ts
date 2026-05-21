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
    const { date, avista, debito, credito, pix, ifood, outros, taxas, pizzas, observacao } = body

    const venda = await prisma.venda.update({
      where: { id },
      data: {
        date: new Date(date),
        avista: round2(parseFloat(avista) || 0),
        debito: round2(parseFloat(debito) || 0),
        credito: round2(parseFloat(credito) || 0),
        pix: round2(parseFloat(pix) || 0),
        ifood: round2(parseFloat(ifood) || 0),
        outros: round2(parseFloat(outros) || 0),
        taxas: round2(parseFloat(taxas) || 0),
        pizzas: parseInt(pizzas) || 0,
        observacao: observacao || null,
      },
    })

    return NextResponse.json(venda)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar venda' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    await prisma.venda.delete({ where: { id: parseInt(params.id) } })
    return NextResponse.json({ message: 'Venda deletada' })
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar venda' }, { status: 500 })
  }
}
