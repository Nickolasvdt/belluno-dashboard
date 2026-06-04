import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const ativoParam = searchParams.get('ativo')
    const where = ativoParam !== null ? { ativo: ativoParam === 'true' } : {}
    const colaboradores = await prisma.colaborador.findMany({ where, orderBy: { nome: 'asc' } })
    return NextResponse.json(colaboradores)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar colaboradores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
  try {
    const { nome } = await request.json()
    if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 })
    const colaborador = await prisma.colaborador.create({ data: { nome: nome.trim() } })
    return NextResponse.json(colaborador, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar colaborador' }, { status: 500 })
  }
}
