'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { useTheme } from '@/context/ThemeContext'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen min-h-dvh bg-[#faf9f6] dark:bg-zinc-950">

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar — drawer on mobile, static on md+ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 max-w-[88vw] transition-transform duration-300 ease-in-out md:relative md:max-w-none md:translate-x-0 md:z-auto shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#0a0a0a] border-b border-cream-200 dark:border-zinc-800/60 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <rect width="18" height="2" rx="1" fill="currentColor" />
                <rect y="6" width="18" height="2" rx="1" fill="currentColor" />
                <rect y="12" width="18" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>
            <span className="font-display font-bold text-lg text-primary leading-none truncate">Belluno</span>
          </div>
          <button
            onClick={toggle}
            className="h-9 rounded-lg border border-cream-200 bg-white px-3 text-xs font-medium text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {theme === 'dark' ? 'Claro' : 'Escuro'}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-5 lg:p-6 overflow-x-hidden overflow-y-auto text-gray-900 dark:text-gray-100">
          {children}
        </main>
      </div>
    </div>
  )
}
