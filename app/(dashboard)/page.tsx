import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, subDays, startOfMonth, subMonths, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import GraficoSaldoDiario from '@/components/GraficoSaldoDiario'
import GraficoMensal from '@/components/GraficoMensal'

async function getDashboardData() {
  const hoje = new Date()
  const inicioMes = startOfMonth(hoje)
  const fimMes = endOfMonth(hoje)

  const registrosMes = await prisma.cashFlow.findMany({
    where: { date: { gte: inicioMes, lte: fimMes } },
    orderBy: { date: 'desc' },
  })

  const totalEntradas = registrosMes.reduce((acc, r) => acc + r.entradas, 0)
  const totalSaidas = registrosMes.reduce((acc, r) => acc + r.saidas, 0)
  const saldoAtual = registrosMes[0]?.fechamento ?? 0

  const ultimosRegistros = await prisma.cashFlow.findMany({
    take: 5,
    orderBy: { date: 'desc' },
  })

  const trintaDiasAtras = subDays(hoje, 29)
  const registros30Dias = await prisma.cashFlow.findMany({
    where: { date: { gte: trintaDiasAtras, lte: hoje } },
    orderBy: { date: 'asc' },
    select: { date: true, fechamento: true, entradas: true, saidas: true },
  })

  const dadosDiarios = registros30Dias.map((r) => ({
    data: format(new Date(r.date), 'dd/MM', { locale: ptBR }),
    fechamento: r.fechamento,
    entradas: r.entradas,
    saidas: r.saidas,
  }))

  const mesesLabels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const dadosMensais = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const refDate = subMonths(hoje, 5 - i)
      const inicio = startOfMonth(refDate)
      const fim = endOfMonth(refDate)
      return prisma.cashFlow
        .aggregate({
          where: { date: { gte: inicio, lte: fim } },
          _sum: { entradas: true, saidas: true },
        })
        .then((agg) => ({
          mes: `${mesesLabels[refDate.getMonth()]}/${String(refDate.getFullYear()).slice(2)}`,
          entradas: agg._sum.entradas ?? 0,
          saidas: agg._sum.saidas ?? 0,
        }))
    })
  )

  return { totalEntradas, totalSaidas, saldoAtual, ultimosRegistros, dadosDiarios, dadosMensais }
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== 'ADMIN') {
    redirect('/caixa')
  }

  const data = await getDashboardData()

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h2>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Atual</span>
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">💰</div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">R$ {formatBRL(data.saldoAtual)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Último fechamento</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Entradas do Mês</span>
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">📈</div>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">R$ {formatBRL(data.totalEntradas)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Mês atual</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Saídas do Mês</span>
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">📉</div>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {formatBRL(data.totalSaidas)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Mês atual</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Evolução do Saldo — Últimos 30 dias</h3>
          <GraficoSaldoDiario dados={data.dadosDiarios} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Entradas × Saídas — Últimos 6 meses</h3>
          <GraficoMensal dados={data.dadosMensais} />
        </div>
      </div>

      {/* Últimos registros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Últimos Registros</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Data</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entradas</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Saídas</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fechamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.ultimosRegistros.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {format(new Date(r.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-5 py-3 text-sm text-green-600 dark:text-green-400">R$ {formatBRL(r.entradas)}</td>
                  <td className="px-5 py-3 text-sm text-red-600 dark:text-red-400">R$ {formatBRL(r.saidas)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">R$ {formatBRL(r.fechamento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
