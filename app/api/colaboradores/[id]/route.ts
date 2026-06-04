import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
  const id = parseInt(params.id)
  try {
    const body = await request.json()
    const data: { nome?: string; ativo?: boolean } = {}
    if (body.nome !== undefined) data.nome = body.nome.trim()
    if (body.ativo !== undefined) data.ativo = body.ativo
    const colaborador = await prisma.colaborador.update({ where: { id }, data })
    return NextResponse.json(colaborador)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar colaborador' }, { status: 500 })
  }
}
