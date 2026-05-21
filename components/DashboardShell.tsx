'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import BottomNav from './BottomNav'

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

type NavItem = { href: string; label: string; roles: string[]; icon: (a: boolean) => React.ReactNode }

const navItems: NavItem[] = [
  {
    href: '/', label: 'Hoje', roles: ['ADMIN'],
    icon: (a) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={a ? 'currentColor' : 'none'} /><polyline points="9,22 9,12 15,12 15,22" stroke={a ? 'white' : 'currentColor'} /></svg>,
  },
  {
    href: '/gastos', label: 'Registros', roles: ['ADMIN'],
    icon: (a) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" fill={a ? 'currentColor' : 'none'} /><line x1="12" y1="9" x2="12" y2="15" stroke={a ? 'white' : 'currentColor'} /><line x1="9" y1="12" x2="15" y2="12" stroke={a ? 'white' : 'currentColor'} /></svg>,
  },
  {
    href: '/caixa', label: 'Caixa', roles: ['ADMIN', 'CAIXA'],
    icon: (a) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2" fill={a ? 'currentColor' : 'none'} /><line x1="2" y1="11" x2="22" y2="11" stroke={a ? 'white' : 'currentColor'} /></svg>,
  },
  {
    href: '/fechamento', label: 'Mês', roles: ['ADMIN'],
    icon: (a) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" fill={a ? 'currentColor' : 'none'} /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" stroke={a ? 'white' : 'currentColor'} /></svg>,
  },
  {
    href: '/usuarios', label: 'Usuários', roles: ['ADMIN'],
    icon: (a) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4" fill={a ? 'currentColor' : 'none'} /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M19 10v6m-3-3h6" /></svg>,
  },
  {
    href: '/conta', label: 'Conta', roles: ['ADMIN', 'CAIXA'],
    icon: (a) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" fill={a ? 'currentColor' : 'none'} /><path d="M4 20c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5" /></svg>,
  },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role as string | undefined
  const { theme, toggle } = useTheme()

  const visible = navItems.filter(i => role && i.roles.includes(role))
  const initial = session?.user?.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex h-dvh bg-[#faf9f6] dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 bg-white dark:bg-[#0a0a0a] border-r border-cream-200 dark:border-zinc-800/60 flex-col">
        <div className="px-5 h-14 flex items-center gap-3 border-b border-cream-200 dark:border-zinc-800/60 shrink-0">
          <Image src="/belluno_logo.png" alt="Belluno" width={30} height={30} className="rounded-full" unoptimized />
          <div>
            <p className="font-display font-bold text-base text-primary leading-none">Belluno</p>
            <p className="text-[10px] text-gray-400 dark:text-zinc-600 font-display italic">Pizzaria</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visible.map(({ href, label, icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-gray-500 dark:text-zinc-500 hover:bg-cream-100 dark:hover:bg-zinc-900 hover:text-gray-700 dark:hover:text-zinc-200 font-medium'
                }`}
              >
                {icon(isActive)}
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-cream-200 dark:border-zinc-800/60 shrink-0 space-y-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 truncate">{session?.user?.username}</p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-600 capitalize">{role?.toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gray-400 hover:text-primary font-medium transition-colors">
              Sair
            </button>
            <button onClick={toggle} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800">
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-12 bg-white dark:bg-zinc-900 border-b border-cream-200 dark:border-zinc-800/60 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Image src="/belluno_logo.png" alt="Belluno" width={24} height={24} className="rounded-full" unoptimized />
            <span className="font-display font-bold text-sm text-primary">Belluno</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link href="/conta" className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {initial}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-md mx-auto px-4 pt-5 pb-28 md:pb-10 md:px-8 md:pt-8">
            {children}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
