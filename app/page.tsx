'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { LuLoaderCircle, LuLogIn, LuSmartphone } from 'react-icons/lu'

export default function LoginPage() {
  const router = useRouter()
  const { currentUser, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingStatusCheck, setPendingStatusCheck] = useState(false)
  // Presentational only: install hint on the login screen
  const [showInstall, setShowInstall] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean }
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true)
  }, [])

  // ✅ Redirect if already logged in
  useEffect(() => {
    if (!authLoading && currentUser && !pendingStatusCheck) {
      router.push('/dashboard')
    }
  }, [currentUser, authLoading, router, pendingStatusCheck])

  // ✅ FIXED: Simpler login - let AuthContext handle the Users table
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    setPendingStatusCheck(true)
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('❌ Auth error:', authError)
        throw authError
      }

      const { data: userData } = await supabase
        .from('Users')
        .select('Status')
        .eq('Email', email)
        .single()

      if (userData?.Status === 'Inactive') {
        await supabase.auth.signOut()
        setError('החשבון שלך אינו פעיל. לפרטים פנה למאמן.')
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('❌ Login error:', err)
      setError(err.message || 'שגיאה בהתחברות')
    } finally {
      setPendingStatusCheck(false)
      setLoading(false)
    }
  }

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-accent mx-auto mb-4"></div>
          <p className="text-fg-3 font-medium">בודק התחברות...</p>
        </div>
      </div>
    )
  }

  // If user is logged in, show nothing (will redirect)
  if (currentUser) {
    return null
  }

  // User is not logged in - show login form
  return (
    <div className="min-h-screen bg-bg md:flex md:items-center md:justify-center md:py-10">
      <div className="relative w-full md:max-w-md mx-auto md:rounded-3xl md:border md:border-line overflow-hidden bg-bg min-h-screen md:min-h-0 flex flex-col">
        {/* Photo */}
        <div className="relative h-[38vh] min-h-56 max-h-80 shrink-0">
          <Image
            src="/login-hero.jpg"
            alt="מטפס על קיר גרניט"
            fill
            sizes="(min-width: 768px) 448px, 100vw"
            className="object-cover object-[50%_30%]"
            priority
          />
          <div
            dir="ltr"
            className="absolute top-5 end-5 font-display font-bold text-5xl leading-none text-fg bg-bg/75 backdrop-blur-sm px-3 pt-1 rounded-xl"
          >
            MY <span className="text-accent">WAY</span>
          </div>
        </div>

        {/* Sheet */}
        <div className="relative -mt-7 flex-1 bg-bg rounded-t-[28px] px-6 pt-7 pb-6 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-6xl leading-[0.85] text-fg">ברוך שובך</h1>
              <p className="mt-2 text-fg-3">התכנית שלך. הקצב שלך. הדרך שלך.</p>
            </div>
            <Image
              src="/noam-herz-logo.png"
              alt="Noam Herz Climbing"
              width={64}
              height={64}
              className="rounded-xl shrink-0"
            />
          </div>

          {error && (
            <div className="p-4 bg-danger/15 text-danger rounded-xl border border-danger/40">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-fg-2 mb-1.5 text-start">
                אימייל
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                className="w-full min-h-[52px] px-4 bg-surface text-fg text-base placeholder:text-faint border border-line-strong rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-start"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-fg-2 mb-1.5 text-start">
                סיסמה
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full min-h-[52px] px-4 bg-surface text-fg text-base placeholder:text-faint border border-line-strong rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-start"
                required
                disabled={loading}
              />
            </div>

            <Link
              href="/forgot-password"
              className="self-start text-sm text-accent hover:text-accent-hover font-bold"
            >
              שכחתי סיסמה
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[54px] bg-accent text-on-accent rounded-full text-lg font-extrabold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {loading ? <><LuLoaderCircle aria-hidden className="w-5 h-5 animate-spin" />מתחבר...</> : <>התחבר<LuLogIn aria-hidden className="w-5 h-5" /></>}
            </button>
          </form>

          {/* Add to home screen (hidden when already installed) */}
          {!isStandalone && (
            <div className="border border-line-strong bg-surface rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  <LuSmartphone aria-hidden className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-fg">הוסף למסך הבית</div>
                  <div className="text-sm text-muted">פתיחה בלחיצה, כמו אפליקציה רגילה</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstall(v => !v)}
                  aria-expanded={showInstall}
                  className="min-h-11 px-2 text-accent font-bold text-sm"
                >
                  איך?
                </button>
              </div>
              {showInstall && (
                <ul className="mt-3 pt-3 border-t border-line text-sm text-fg-2 space-y-1.5">
                  <li><b className="text-fg">אייפון (Safari):</b> כפתור השיתוף ← &quot;הוסף למסך הבית&quot;</li>
                  <li><b className="text-fg">אנדרואיד (Chrome):</b> תפריט ⋮ ← &quot;התקן אפליקציה&quot;</li>
                </ul>
              )}
            </div>
          )}

          <p className="mt-auto text-center text-sm text-fg-3">
            אין לך חשבון?{' '}
            <a
              href="https://noam-herz-climbing.com/%D7%AA%D7%9B%D7%A0%D7%99%D7%95%D7%AA-%D7%90%D7%99%D7%9E%D7%95%D7%9F/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover font-bold"
            >
              להצטרפות לתכנית
            </a>
          </p>
          <p className="text-center text-xs text-faint">© {new Date().getFullYear()} Noam Herz Climbing</p>
        </div>
      </div>
    </div>
  )
}