'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getRoleConfig } from '@/lib/permissions'
import { useState, useRef, useEffect, createContext, useContext } from 'react'
import {
  LuUser, LuLogOut, LuLayoutDashboard, LuCalendarDays, LuDumbbell, LuChartLine, LuBookOpen,
  LuChartColumn, LuTrendingUp, LuMap, LuSettings, LuFileChartColumn, LuClipboardList, LuPuzzle, LuUsers,
  LuTarget, LuFolder, LuEye, LuChevronDown, LuCalendarCheck, LuNotebookPen, LuMenu,
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
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const navCls = (href: string) => (isActive(href) ? btnActive : btnBase)
  const headerRef = useRef<HTMLElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)

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
    <>
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
        <nav className="hidden md:flex gap-2 items-center flex-wrap">

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
            {isCoachOrAdmin && <DropdownItem href="/reports/monthly"><LuFileChartColumn aria-hidden className={ic} />דו״ח חודשי</DropdownItem>}
          </NavDropdown>

          {/* ניהול — coach / admin only */}
          {isCoachOrAdmin && (
            <NavDropdown label={<><LuSettings aria-hidden className={ic} />ניהול</>}>
              <DropdownItem href="/reports/monthly"><LuFileChartColumn aria-hidden className={ic} />דו״ח חודשי</DropdownItem>
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

    {/* ── Mobile bottom navigation (same links and conditions as the desktop menu) ── */}
    <nav
      aria-label="ניווט ראשי"
      className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-bg/95 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        <TabLink href="/dashboard" active={isActive('/dashboard')} icon={<LuLayoutDashboard className="w-5 h-5" />} label="ראשי" />
        <TabLink href="/calendar" active={isActive('/calendar')} icon={<LuCalendarDays className="w-5 h-5" />} label="לוח" />
        <TabLink href="/workouts" active={isActive('/workouts')} icon={<LuDumbbell className="w-5 h-5" />} label="אימונים" />
        <TabLink href="/climbing-log" active={isActive('/climbing-log')} icon={<LuBookOpen className="w-5 h-5" />} label="לוג" />
        <button
          onClick={() => setMoreOpen(v => !v)}
          aria-expanded={moreOpen}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-14 text-[11px] font-semibold transition-colors ${moreOpen ? 'text-accent' : 'text-muted'}`}
        >
          <LuMenu aria-hidden className="w-5 h-5" />
          עוד
        </button>
      </div>
    </nav>

    {moreOpen && (
      <div className="md:hidden fixed inset-0 z-[55]" dir="rtl">
        <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 bg-raised border-t border-line-strong rounded-t-2xl pb-[calc(4.5rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
          <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
          <SheetGroup title="נתונים">
            <SheetLink href="/climbing-log" onClick={() => setMoreOpen(false)} icon={<LuBookOpen />}>לוג</SheetLink>
            <SheetLink href={statsHref} onClick={() => setMoreOpen(false)} icon={<LuChartColumn />}>סטטיסטיקות</SheetLink>
            <SheetLink href="/exercise-analytics" onClick={() => setMoreOpen(false)} icon={<LuTrendingUp />}>ניתוח תרגילים</SheetLink>
            <SheetLink href="/roadmap-progress" onClick={() => setMoreOpen(false)} icon={<LuMap />}>התקדמות Roadmap</SheetLink>
            {isCoachOrAdmin && <SheetLink href="/reports/monthly" onClick={() => setMoreOpen(false)} icon={<LuFileChartColumn />}>דו״ח חודשי</SheetLink>}
          </SheetGroup>
          {isCoachOrAdmin && (
            <SheetGroup title="ניהול">
              <SheetLink href="/reports/monthly" onClick={() => setMoreOpen(false)} icon={<LuFileChartColumn />}>דו״ח חודשי</SheetLink>
              <SheetLink href="/admin/assign-workouts" onClick={() => setMoreOpen(false)} icon={<LuClipboardList />}>הקצאה</SheetLink>
              <SheetLink href="/exercises" onClick={() => setMoreOpen(false)} icon={<LuDumbbell />}>תרגילים</SheetLink>
              <SheetLink href="/exercises/dynamic" onClick={() => setMoreOpen(false)} icon={<LuPuzzle />}>תרגילים דינמיים</SheetLink>
              <SheetLink href="/workouts-editor" onClick={() => setMoreOpen(false)} icon={<LuNotebookPen />}>עורך אימונים</SheetLink>
              {isAdmin && <SheetLink href="/admin/roadmap-builder" onClick={() => setMoreOpen(false)} icon={<LuMap />}>בניית Roadmap</SheetLink>}
              {isAdmin && <SheetLink href="/admin/roadmap-progress" onClick={() => setMoreOpen(false)} icon={<LuChartColumn />}>התקדמות Roadmap</SheetLink>}
            </SheetGroup>
          )}
          <SheetGroup title="תוכן">
            {isAdmin && <SheetLink href="/admin/users" onClick={() => setMoreOpen(false)} icon={<LuUsers />}>משתמשים</SheetLink>}
            <SheetLink href="/profile" onClick={() => setMoreOpen(false)} icon={<LuUser />}>פרופיל</SheetLink>
            <SheetLink href={goalsHref} onClick={() => setMoreOpen(false)} icon={<LuTarget />}>יעדים</SheetLink>
            <SheetLink href="/monthly-sessions" onClick={() => setMoreOpen(false)} icon={<LuCalendarCheck />}>פגישות חודשיות</SheetLink>
            <SheetLink href="/media" onClick={() => setMoreOpen(false)} icon={<LuFolder />}>מדיה</SheetLink>
          </SheetGroup>
        </div>
      </div>
    )}
    </>
  )
}

// ─── Mobile nav primitives ──────────────────────────────────────────────────

function TabLink({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 min-h-14 text-[11px] font-semibold transition-colors ${active ? 'text-accent' : 'text-muted hover:text-fg'}`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </Link>
  )
}

function SheetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-3">
      <p className="text-xs font-semibold text-faint mb-1">{title}</p>
      <div className="grid grid-cols-2 gap-1">{children}</div>
    </div>
  )
}

function SheetLink({ href, onClick, icon, children }: { href: string; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 min-h-12 px-3 rounded-xl text-sm text-fg-2 hover:bg-accent/15 hover:text-accent transition-colors"
    >
      <span aria-hidden className="w-4 h-4 shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      {children}
    </Link>
  )
}
