const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.user.update({ where: { username: 'nickolasvidoto' }, data: { role: 'CAIXA' } })
  await prisma.user.update({ where: { username: 'alan' }, data: { role: 'ADMIN' } })
  console.log('✅ Roles corrigidas: nickolasvidoto=CAIXA, alan=ADMIN')
}

main().catch(console.error).finally(() => prisma.$disconnect())
