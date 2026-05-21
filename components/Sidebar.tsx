'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  icon: string
  roles: ('ADMIN' | 'CAIXA')[]
}

const navItems: NavItem[] = [
  { href: '/',         label: 'Dashboard',         icon: '📊', roles: ['ADMIN'] },
  { href: '/caixa',    label: 'Controle de Caixa', icon: '💰', roles: ['ADMIN', 'CAIXA'] },
  { href: '/usuarios', label: 'Usuários',           icon: '👥', roles: ['ADMIN'] },
  { href: '/conta',    label: 'Minha Conta',        icon: '👤', roles: ['ADMIN', 'CAIXA'] },
]

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role as 'ADMIN' | 'CAIXA' | undefined

  const visibleItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  )

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-xl font-bold text-primary">🍕 Belluno</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-700 truncate">{session?.user?.username}</p>
        <p className="text-xs text-gray-400 mb-3 capitalize">{role?.toLowerCase()}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
