'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet / Modal container */}
      <div className="absolute inset-0 flex flex-col justify-end md:items-center md:justify-center md:p-6">
        <div
          className={`
            relative
            bg-white dark:bg-[#171411]
            rounded-t-[22px] md:rounded-2xl
            max-h-[92dvh] md:max-h-[86dvh]
            w-full md:w-full md:max-w-[480px]
            flex flex-col
            shadow-2xl dark:shadow-black/50
            transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
            ${open
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-full md:translate-y-0 md:opacity-0 md:scale-95'
            }
          `}
        >
          {/* Drag handle — mobile only */}
          <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-zinc-700/80" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-cream-200/70 dark:border-white/[0.06] shrink-0">
            <h3 className="font-semibold text-[15px] text-gray-800 dark:text-gray-100 tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div
            className="overflow-y-auto flex-1 p-5"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
