import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== 'ADMIN') {
    redirect('/')
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, role: true, lastLogin: true },
  })

  return (
    <div className="min-w-0">
      <h2 className="text-xl sm:text-2xl font-bold text-wood-700 dark:text-gray-100 mb-4 sm:mb-6">Usuarios</h2>
      <div className="bg-wood-50 dark:bg-zinc-900 rounded-xl shadow-sm border border-wood-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[560px] divide-y divide-wood-200 dark:divide-zinc-800">
            <thead className="bg-wood-100 dark:bg-zinc-800">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Usuario</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Perfil</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-wood-500 dark:text-zinc-400 uppercase">Ultimo Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wood-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-wood-100 dark:hover:bg-zinc-800/60">
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-wood-700 dark:text-gray-100">{user.username}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-sky-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-wood-500 dark:text-zinc-400 whitespace-nowrap">
                    {user.lastLogin
                      ? format(new Date(user.lastLogin), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
                      : 'Nunca'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
