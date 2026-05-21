const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('nickolas2026', 12)
  const caixaHash = await bcrypt.hash('alan2026', 12)

  await prisma.user.upsert({
    where: { username: 'nickolasvidoto' },
    update: {},
    create: { username: 'nickolasvidoto', password: adminHash, role: 'CAIXA' },
  })

  await prisma.user.upsert({
    where: { username: 'alan' },
    update: {},
    create: { username: 'alan', password: caixaHash, role: 'ADMIN' },
  })

  console.log('✅ Usuários criados com sucesso')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
