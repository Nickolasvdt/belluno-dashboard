import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function r2(n: number) { return Math.round(n * 100) / 100 }

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { date, avista, ifood, noventa9, keeta, extra, pizzas } = await request.json()
    const item = await prisma.fechamentoDia.update({
      where: { id: parseInt(params.id) },
      data: {
        date:     new Date(date + 'T00:00:00'),
        avista:   r2(parseFloat(avista)   || 0),
        ifood:    r2(parseFloat(ifood)    || 0),
        noventa9: r2(parseFloat(noventa9) || 0),
        keeta:    r2(parseFloat(keeta)    || 0),
        extra:    r2(parseFloat(extra)    || 0),
        pizzas:   parseInt(pizzas)        || 0,
      },
    })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar fechamento' }, { status: 500 })
  }
}
