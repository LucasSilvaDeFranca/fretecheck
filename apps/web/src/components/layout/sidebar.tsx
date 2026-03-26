'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { useAuthStore } from '@/lib/auth-store'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const MOTORISTA_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/motorista',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Novo Check-in',
    href: '/motorista/checkin/novo',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    label: 'Histórico',
    href: '/motorista/historico',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-800">
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold text-white">Frete</span>
          <span className="text-xl font-bold text-accent">Check</span>
        </div>
        <p className="text-xs text-brand-400 mt-0.5">Certificação de Espera</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {MOTORISTA_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer',
              'transition-colors duration-150 min-h-[44px]',
              pathname === item.href
                ? 'bg-brand-700 text-white'
                : 'text-brand-200 hover:bg-brand-800 hover:text-white',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-brand-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name ?? 'Usuário'}</p>
            <p className="text-xs text-brand-400 truncate">{user?.role ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-sm text-brand-400 hover:text-white transition-colors duration-150 cursor-pointer py-2 min-h-[44px]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-900 border-b border-brand-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-white">Frete</span>
          <span className="text-lg font-bold text-accent">Check</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-2 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={clsx(
          'lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-brand-900 flex flex-col',
          'transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-brand-900 text-white min-h-screen flex-shrink-0">
        {navContent}
      </aside>
    </>
  )
}
