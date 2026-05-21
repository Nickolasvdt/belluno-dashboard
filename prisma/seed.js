const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Populando banco de dados com dados iniciais...')

  // Dados de exemplo baseados no Excel (Maio 2026)
  const registros = [
    { date: new Date('2026-05-20'), saldoInicial: 211.4, entradas: 0, saidas: 0 },
    { date: new Date('2026-05-19'), saldoInicial: 171.4, entradas: 40, saidas: 0 },
    { date: new Date('2026-05-18'), saldoInicial: 171.4, entradas: 0, saidas: 0 },
    { date: new Date('2026-05-17'), saldoInicial: 171.4, entradas: 80, saidas: 403, observacao: 'Grande saída' },
    { date: new Date('2026-05-16'), saldoInicial: 346.4, entradas: 100, saidas: 15 },
    { date: new Date('2026-05-15'), saldoInicial: 291.4, entradas: 55, saidas: 0 },
  ]

  for (const registro of registros) {
    const fechamento = registro.saldoInicial + registro.entradas - registro.saidas
    
    await prisma.cashFlow.create({
      data: {
        date: registro.date,
        saldoInicial: registro.saldoInicial,
        entradas: registro.entradas,
        saidas: registro.saidas,
        fechamento: fechamento,
        diferenca: null,
        observacao: registro.observacao || null,
      },
    })
  }

  console.log('✅ Banco de dados populado com sucesso!')
  console.log(`📊 ${registros.length} registros criados`)
}

main()
  .catch((e) => {
    console.error('❌ Erro ao popular banco:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
