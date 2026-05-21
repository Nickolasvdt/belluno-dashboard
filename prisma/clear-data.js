const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function clear() {
  const d1 = await prisma.cashFlow.deleteMany({})
  const d2 = await prisma.venda.deleteMany({})
  const d3 = await prisma.funcionario.deleteMany({})
  const d4 = await prisma.contaFixa.deleteMany({})
  console.log('Deleted:', d1.count, 'caixa,', d2.count, 'vendas,', d3.count, 'func,', d4.count, 'contas')
  await prisma.$disconnect()
}
clear().catch(console.error)
