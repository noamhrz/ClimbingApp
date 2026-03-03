'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getRoleConfig } from '@/lib/permissions'
import { useState, useRef, useEffect, createContext, useContext } from 'react'

// ─── Dropdown primitives ────────────────────────────────────────────────────

const DropdownClose = createContext<() => void>(() => {})

function NavDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <DropdownClose.Provider value={close}>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-sm font-medium border border-white/20 hover:border-white/40 flex items-center gap-1"
        >
          {label}
          <span className={`text-[10px] inline-block transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {open && (
          <div className="absolute top-full mt-1 right-0 bg-white text-gray-800 rounded-lg shadow-xl z-[200] min-w-[150px] py-1 border border-gray-100">
            {children}
          </div>
        )}
      </div>
    </DropdownClose.Provider>
  )
}

function DropdownItem({ href, children }: { href: string; children: React.ReactNode }) {
  const close = useContext(DropdownClose)
  return (
    <Link
      href={href}
      onClick={close}
      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap text-right"
    >
      {children}
    </Link>
  )
}

// ─── Header ─────────────────────────────────────────────────────────────────

const btnBase = 'bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-sm font-medium border border-white/20 hover:border-white/40'

export default function UserHeader() {
  const { activeUser, currentUser, isImpersonating, switchToSelf, logout } = useAuth()
  const router = useRouter()

  const displayUser = activeUser || currentUser
  if (!displayUser) return null

  const activeConfig = getRoleConfig(displayUser.Role)
  const currentConfig = currentUser ? getRoleConfig(currentUser.Role) : null

  const getRoleImage = (role: string) => {
    if (role === 'admin') return '/admin.png'
    if (role === 'coach') return '/coach.png'
    return '/climber.png'
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const isCoachOrAdmin = currentUser?.Role === 'coach' || currentUser?.Role === 'admin'
  const isAdmin = currentUser?.Role === 'admin'
  const statsHref = `/athlete-stats/${encodeURIComponent((activeUser || currentUser)?.Email || '')}`
  const goalsHref = isCoachOrAdmin
    ? '/goals'
    : `/goals/${encodeURIComponent((activeUser || currentUser)?.Email || '')}`

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">

        {/* Top Row - User Info */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-full p-2 shadow-lg flex items-center justify-center">
              <img
                src={getRoleImage(displayUser.Role)}
                alt={displayUser.Role}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs text-blue-200">משתמש פעיל:</p>
              <Link
                href="/profile"
                className="font-bold text-lg hover:text-blue-100 transition-colors inline-flex items-center gap-1 group"
              >
                <span>{displayUser.Name}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm">👤</span>
              </Link>
              <p className="text-xs text-blue-200">{displayUser.Email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImpersonating && (
              <button
                onClick={switchToSelf}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2"
                title="חזור לעצמי"
              >
                <span>👤</span>
                <span className="hidden sm:inline">חזור ל-{currentUser?.Name}</span>
                <span className="sm:hidden">חזור</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2"
              title="התנתק"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">התנתק</span>
            </button>
          </div>
        </div>

        {/* Bottom Row - Navigation */}
        <nav className="flex gap-2 items-center flex-wrap">

          {/* Pinned */}
          <Link href="/dashboard" className={btnBase}>📊 Dashboard</Link>
          <Link href="/calendar"  className={btnBase}>📅 לוח</Link>
          <Link href="/workouts"  className={btnBase}>🏋️ אימונים</Link>

          {/* נתונים */}
          <NavDropdown label="📈 נתונים">
            <DropdownItem href="/climbing-log">📖 לוג</DropdownItem>
            <DropdownItem href={statsHref}>📊 סטטיסטיקות</DropdownItem>
            <DropdownItem href="/exercise-analytics">💪 ניתוח תרגילים</DropdownItem>
          </NavDropdown>

          {/* ניהול — coach / admin only */}
          {isCoachOrAdmin && (
            <NavDropdown label="⚙️ ניהול">
              <DropdownItem href="/coach/urgency">🚨 דחיפות</DropdownItem>
              <DropdownItem href="/admin/assign-workouts">📋 הקצאה</DropdownItem>
              <DropdownItem href="/exercises">💪 תרגילים</DropdownItem>
              <DropdownItem href="/workouts-editor">🏋️ עורך אימונים</DropdownItem>
            </NavDropdown>
          )}

          {/* תוכן */}
          <NavDropdown label="👤 תוכן">
            {isAdmin && <DropdownItem href="/admin/users">👥 משתמשים</DropdownItem>}
            <DropdownItem href="/profile">👤 פרופיל</DropdownItem>
            <DropdownItem href={goalsHref}>🎯 יעדים</DropdownItem>
          </NavDropdown>

        </nav>

        {/* Impersonation banner */}
        {isImpersonating && currentUser && (
          <div className="mt-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>🔍</span>
                <span>
                  אתה ({currentConfig?.icon} {currentUser.Name}) צופה כ-{' '}
                  <strong>{activeConfig.icon} {displayUser.Name}</strong>
                </span>
              </div>
              <button
                onClick={switchToSelf}
                className="text-yellow-200 hover:text-white underline font-medium"
              >
                חזור לעצמי
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  )
}
