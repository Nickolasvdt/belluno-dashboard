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
      <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[480px] divide-y divide-cream-200 dark:divide-white/[0.04]">
            <thead className="bg-cream-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Usuário</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Perfil</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Último login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 dark:divide-white/[0.04]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-cream-50/60 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">{user.username}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      user.role === 'ADMIN'
                        ? 'bg-primary/10 dark:bg-primary/15 text-primary'
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
