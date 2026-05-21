'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

type NavItem = {
  href: string
  label: string
  icon: string
  roles: ('ADMIN' | 'CAIXA')[]
}

const navItems: NavItem[] = [
  { href: '/',           label: 'Dashboard',         icon: '📊', roles: ['ADMIN'] },
  { href: '/fechamento', label: 'Fechamento',         icon: '📋', roles: ['ADMIN'] },
  { href: '/gastos',     label: 'Gastos Rápidos',    icon: '⚡', roles: ['ADMIN'] },
  { href: '/caixa',      label: 'Controle de Caixa', icon: '💰', roles: ['ADMIN', 'CAIXA'] },
  { href: '/usuarios',   label: 'Usuários',           icon: '👥', roles: ['ADMIN'] },
  { href: '/conta',      label: 'Minha Conta',        icon: '👤', roles: ['ADMIN', 'CAIXA'] },
]

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role as 'ADMIN' | 'CAIXA' | undefined
  const { theme, toggle } = useTheme()

  const visibleItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  )

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <Image src="/belluno_logo.png" alt="Belluno" width={40} height={40} className="rounded-full" unoptimized />
        <span className="text-xl font-bold text-primary">Belluno</span>
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
                  ? 'bg-red-50 dark:bg-primary/20 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{session?.user?.username}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{role?.toLowerCase()}</p>
          </div>
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="text-lg hover:scale-110 transition-transform"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
