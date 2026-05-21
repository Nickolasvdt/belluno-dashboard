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
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">Usuarios</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[560px] divide-y divide-gray-100 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Perfil</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ultimo Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-sky-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
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
