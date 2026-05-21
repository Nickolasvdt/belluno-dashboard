import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, role: true, lastLogin: true },
  })

  return (
    <div className="min-w-0">
      <h2 className="text-xl font-display font-semibold text-gray-800 dark:text-gray-100 mb-5">Usuários</h2>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-cream-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[480px] divide-y divide-cream-200 dark:divide-zinc-800">
            <thead className="bg-cream-100 dark:bg-zinc-800">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Usuário</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Perfil</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Último login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/60">
                  <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">{user.username}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                    {user.lastLogin
                      ? format(new Date(user.lastLogin), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
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
