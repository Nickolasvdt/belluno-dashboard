'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

function IconHoje({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={active ? 'currentColor' : 'none'} />
      <polyline points="9,22 9,12 15,12 15,22" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function IconCaixa({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="13" rx="2" fill={active ? 'currentColor' : 'none'} />
      <line x1="2" y1="11" x2="22" y2="11" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function IconMes({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill={active ? 'currentColor' : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function IconGastos({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" fill={active ? 'currentColor' : 'none'} />
      <line x1="12" y1="9" x2="12" y2="15" stroke={active ? 'white' : 'currentColor'} />
      <line x1="9" y1="12" x2="15" y2="12" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function IconConta({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" fill={active ? 'currentColor' : 'none'} />
      <path d="M4 20c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5" />
    </svg>
  )
}

const adminTabs = [
  { href: '/',           label: 'Hoje',   Icon: IconHoje },
  { href: '/caixa',      label: 'Caixa',  Icon: IconCaixa },
  { href: '/fechamento', label: 'Mês',    Icon: IconMes },
  { href: '/gastos',     label: 'Gastos', Icon: IconGastos },
]

const caixaTabs = [
  { href: '/caixa', label: 'Caixa', Icon: IconCaixa },
  { href: '/conta', label: 'Conta', Icon: IconConta },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const tabs = session?.user?.role === 'CAIXA' ? caixaTabs : adminTabs

  return (
    <nav
      className="fixed bottom-0 inset-x-0 md:hidden z-40 bg-white/95 dark:bg-[#120f0c]/95 backdrop-blur-md border-t border-cream-200 dark:border-white/[0.05]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative ${
                isActive ? 'text-accent' : 'text-mute dark:text-zinc-600'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-accent rounded-full" />
              )}
              <Icon active={isActive} />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
