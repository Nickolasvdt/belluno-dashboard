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
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Usuarios</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ultimo Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.username}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
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
  )
}
