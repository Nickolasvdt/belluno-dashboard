'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

type NavItem = {
  href: string
  label: string
  roles: ('ADMIN' | 'CAIXA')[]
}

const navItems: NavItem[] = [
  { href: '/',           label: 'Dashboard',         roles: ['ADMIN'] },
  { href: '/fechamento', label: 'Fechamento',        roles: ['ADMIN'] },
  { href: '/gastos',     label: 'Gastos Rápidos',    roles: ['ADMIN'] },
  { href: '/caixa',      label: 'Controle de Caixa', roles: ['ADMIN', 'CAIXA'] },
  { href: '/usuarios',   label: 'Usuários',          roles: ['ADMIN'] },
  { href: '/conta',      label: 'Minha Conta',       roles: ['ADMIN', 'CAIXA'] },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role as 'ADMIN' | 'CAIXA' | undefined
  const { theme, toggle } = useTheme()

  const visibleItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  )

  return (
    <aside className="w-[min(18rem,88vw)] md:w-56 h-full min-h-screen min-h-dvh bg-white dark:bg-[#0a0a0a] border-r border-cream-200 dark:border-zinc-800/60 flex flex-col overflow-y-auto">
      <div className="px-5 py-5 border-b border-cream-200 dark:border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/belluno_logo.png"
            alt="Belluno"
            width={34}
            height={34}
            className="rounded-full"
            unoptimized
          />
          <div>
            <p className="font-display font-bold text-lg text-primary leading-none tracking-tight">
              Belluno
            </p>
            <p className="text-[10px] text-gray-400 dark:text-zinc-600 font-display italic mt-0.5 tracking-wide">
              Pizzaria
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-zinc-600 hover:bg-cream-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Fechar menu"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-gray-500 dark:text-zinc-500 hover:bg-cream-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-100 font-medium'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? 'bg-primary' : 'bg-transparent'}`} />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-cream-200 dark:border-zinc-800/60">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 truncate">
              {session?.user?.username}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-zinc-600 font-display italic mt-0.5 capitalize">
              {role?.toLowerCase()}
            </p>
          </div>
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="h-8 px-2 rounded-lg flex items-center justify-center text-[11px] font-medium text-gray-400 dark:text-zinc-600 hover:bg-cream-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
          >
            {theme === 'dark' ? 'Claro' : 'Escuro'}
          </button>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-xs text-gray-400 dark:text-zinc-600 hover:text-primary dark:hover:text-primary font-medium transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </aside>
  )
}
