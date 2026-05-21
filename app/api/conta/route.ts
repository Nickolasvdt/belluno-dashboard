import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const { senhaAtual, novaSenha } = await request.json()

  if (!senhaAtual || !novaSenha) {
    return NextResponse.json({ error: 'Campos obrigatorios ausentes' }, { status: 400 })
  }

  if (novaSenha.length < 6) {
    return NextResponse.json({ error: 'A nova senha deve ter ao menos 6 caracteres' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
  }

  const match = await bcrypt.compare(senhaAtual, user.password)
  if (!match) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
  }

  const newHash = await bcrypt.hash(novaSenha, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: newHash },
  })

  return NextResponse.json({ message: 'Senha alterada com sucesso' })
}
