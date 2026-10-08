'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getRoleConfig } from '@/lib/permissions'
import { useState, useRef, useEffect, createContext, useContext } from 'react'
import {
  LuUser, LuLogOut, LuLayoutDashboard, LuCalendarDays, LuDumbbell, LuChartLine, LuBookOpen,
  LuChartColumn, LuTrendingUp, LuMap, LuSettings, LuSiren, LuClipboardList, LuPuzzle, LuUsers,
  LuTarget, LuFolder, LuEye, LuChevronDown, LuCalendarCheck, LuNotebookPen,
} from 'react-icons/lu'

const ic = 'w-4 h-4 shrink-0'

// ─── Dropdown primitives ────────────────────────────────────────────────────

const DropdownClose = createContext<() => void>(() => {})

function NavDropdown({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
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
          className={`${btnBase} ${open ? 'border-fg-3 text-fg' : ''}`}
        >
          {label}
          <LuChevronDown aria-hidden className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full mt-2 start-0 bg-raised text-fg rounded-xl shadow-2xl shadow-black/50 z-[200] min-w-[190px] py-1.5 border border-line-strong">
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
      className="flex items-center gap-2 px-4 min-h-11 text-sm text-fg-2 hover:bg-accent/15 hover:text-accent transition-colors whitespace-nowrap text-start"
    >
      {children}
    </Link>
  )
}

// ─── Header ─────────────────────────────────────────────────────────────────

const btnBase = 'inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-full whitespace-nowrap text-sm font-semibold border border-line-strong bg-surface text-fg-2 hover:text-fg hover:border-fg-3 transition-colors'
const btnActive = 'inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-full whitespace-nowrap text-sm font-bold border border-accent bg-accent text-on-accent'

export default function UserHeader() {
  const { activeUser, currentUser, isImpersonating, switchToSelf, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const navCls = (href: string) => (pathname === href || pathname.startsWith(href + '/') ? btnActive : btnBase)
  const headerRef = useRef<HTMLElement>(null)

  // Exposes the header's real (possibly multi-line) height as a CSS var so
  // sticky elements further down the page (e.g. the workout exercise picker)
  // can offset below it instead of hiding under it.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    const setHeightVar = () => {
      document.documentElement.style.setProperty('--app-header-height', `${el.offsetHeight}px`)
    }

    setHeightVar()
    const observer = new ResizeObserver(setHeightVar)
    observer.observe(el)
    return () => observer.disconnect()
  })

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
    <header ref={headerRef} className="text-fg sticky top-0 z-50 bg-bg/95 backdrop-blur-md border-b border-line">
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-3">

        {/* Top Row - User Info */}
        <div className="flex justify-between items-center gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 bg-raised rounded-full p-1.5 border border-line-strong flex items-center justify-center">
              <img
                src={getRoleImage(displayUser.Role)}
                alt={displayUser.Role}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">משתמש פעיל:</p>
              <Link
                href="/profile"
                className="font-bold text-lg leading-tight text-fg hover:text-accent transition-colors inline-flex items-center gap-1 group"
              >
                <span>{displayUser.Name}</span>
                <LuUser aria-hidden className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <p className="text-xs text-muted truncate">{displayUser.Email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImpersonating && (
              <button
                onClick={switchToSelf}
                className="min-h-11 bg-warning/15 hover:bg-warning/25 text-warning border border-warning/30 font-semibold px-4 rounded-full transition-colors flex items-center gap-2"
                title="חזור לעצמי"
              >
                <LuUser aria-hidden className={ic} />
                <span className="hidden sm:inline">חזור ל-{currentUser?.Name}</span>
                <span className="sm:hidden">חזור</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="min-h-11 min-w-11 justify-center bg-surface hover:bg-danger/15 text-fg-2 hover:text-danger border border-line-strong hover:border-danger/40 font-semibold px-3.5 rounded-full transition-colors flex items-center gap-2"
              title="התנתק"
            >
              <LuLogOut aria-hidden className={ic} />
              <span className="hidden sm:inline">התנתק</span>
            </button>
          </div>
        </div>

        {/* Bottom Row - Navigation */}
        <nav className="flex gap-2 items-center flex-wrap">

          {/* Pinned */}
          <Link href="/dashboard" className={navCls('/dashboard')}><LuLayoutDashboard aria-hidden className={ic} />Dashboard</Link>
          <Link href="/calendar"  className={navCls('/calendar')}><LuCalendarDays aria-hidden className={ic} />לוח</Link>
          <Link href="/workouts"  className={navCls('/workouts')}><LuDumbbell aria-hidden className={ic} />אימונים</Link>

          {/* נתונים */}
          <NavDropdown label={<><LuChartLine aria-hidden className={ic} />נתונים</>}>
            <DropdownItem href="/climbing-log"><LuBookOpen aria-hidden className={ic} />לוג</DropdownItem>
            <DropdownItem href={statsHref}><LuChartColumn aria-hidden className={ic} />סטטיסטיקות</DropdownItem>
            <DropdownItem href="/exercise-analytics"><LuTrendingUp aria-hidden className={ic} />ניתוח תרגילים</DropdownItem>
            <DropdownItem href="/roadmap-progress"><LuMap aria-hidden className={ic} />התקדמות Roadmap</DropdownItem>
          </NavDropdown>

          {/* ניהול — coach / admin only */}
          {isCoachOrAdmin && (
            <NavDropdown label={<><LuSettings aria-hidden className={ic} />ניהול</>}>
              <DropdownItem href="/coach/urgency"><LuSiren aria-hidden className={ic} />דחיפות</DropdownItem>
              <DropdownItem href="/admin/assign-workouts"><LuClipboardList aria-hidden className={ic} />הקצאה</DropdownItem>
              <DropdownItem href="/exercises"><LuDumbbell aria-hidden className={ic} />תרגילים</DropdownItem>
              <DropdownItem href="/exercises/dynamic"><LuPuzzle aria-hidden className={ic} />תרגילים דינמיים</DropdownItem>
              <DropdownItem href="/workouts-editor"><LuNotebookPen aria-hidden className={ic} />עורך אימונים</DropdownItem>
              {isAdmin && <DropdownItem href="/admin/roadmap-builder"><LuMap aria-hidden className={ic} />בניית Roadmap</DropdownItem>}
              {isAdmin && <DropdownItem href="/admin/roadmap-progress"><LuChartColumn aria-hidden className={ic} />התקדמות Roadmap</DropdownItem>}
            </NavDropdown>
          )}

          {/* תוכן */}
          <NavDropdown label={<><LuUser aria-hidden className={ic} />תוכן</>}>
            {isAdmin && <DropdownItem href="/admin/users"><LuUsers aria-hidden className={ic} />משתמשים</DropdownItem>}
            <DropdownItem href="/profile"><LuUser aria-hidden className={ic} />פרופיל</DropdownItem>
            <DropdownItem href={goalsHref}><LuTarget aria-hidden className={ic} />יעדים</DropdownItem>
            <DropdownItem href="/monthly-sessions"><LuCalendarCheck aria-hidden className={ic} />פגישות חודשיות</DropdownItem>
            <DropdownItem href="/media"><LuFolder aria-hidden className={ic} />מדיה</DropdownItem>
          </NavDropdown>

        </nav>

        {/* Impersonation banner */}
        {isImpersonating && currentUser && (
          <div className="mt-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5 text-fg-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <LuEye aria-hidden className={`${ic} text-warning`} />
                <span>
                  אתה ({currentConfig?.icon} {currentUser.Name}) צופה כ-{' '}
                  <strong>{activeConfig.icon} {displayUser.Name}</strong>
                </span>
              </div>
              <button
                onClick={switchToSelf}
                className="text-warning hover:text-fg underline font-semibold min-h-11 px-1"
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
