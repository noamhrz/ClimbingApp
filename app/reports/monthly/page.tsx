'use client'

// Monthly report per trainee (coach/admin) — the same card as the monthly email.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { LuCalendarRange, LuChevronLeft, LuChevronRight, LuFileChartColumn } from 'react-icons/lu'

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

function previousMonth() {
  const d = new Date()
  const m = d.getMonth() // 0-based → previous month in 1-based
  return m === 0 ? { year: d.getFullYear() - 1, month: 12 } : { year: d.getFullYear(), month: m }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export default function MonthlyReportPage() {
  const { currentUser, activeUser, loading: authLoading } = useAuth()
  const allowed = currentUser?.Role === 'admin' || currentUser?.Role === 'coach'

  const [trainees, setTrainees] = useState<{ email: string; name: string }[]>([])
  const [email, setEmail] = useState('')
  const [{ year, month }, setYm] = useState(previousMonth)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)

  // active trainees
  useEffect(() => {
    if (!allowed) return
    ;(async () => {
      const res = await fetch('/api/reports/monthly', { headers: await authHeader() })
      if (!res.ok) { setError('טעינת המתאמנים נכשלה'); return }
      const list: { email: string; name: string }[] = (await res.json()).trainees ?? []
      setTrainees(list)
      setEmail(prev => prev || (list.some(t => t.email === activeUser?.Email) ? activeUser!.Email : list[0]?.email || ''))
    })()
  }, [allowed, activeUser])

  // the report
  useEffect(() => {
    if (!email) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      const res = await fetch(`/api/reports/monthly?email=${encodeURIComponent(email)}&year=${year}&month=${month}`, { headers: await authHeader() })
      if (cancelled) return
      if (res.ok) setHtml(await res.text())
      else { setHtml(''); setError('טעינת הדו״ח נכשלה') }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [email, year, month])

  const fit = useCallback(() => {
    const doc = frame.current?.contentDocument
    if (doc?.body && frame.current) frame.current.style.height = `${doc.documentElement.scrollHeight}px`
  }, [])

  const shift = (delta: number) => setYm(({ year: y, month: m }) => {
    const i = y * 12 + (m - 1) + delta
    return { year: Math.floor(i / 12), month: (i % 12) + 1 }
  })
  const now = new Date()
  const atCurrent = year === now.getFullYear() && month === now.getMonth() + 1

  if (authLoading) return null
  if (!allowed) {
    return <div dir="rtl" className="min-h-screen bg-surface flex items-center justify-center text-fg-3">העמוד זמין למאמנים בלבד</div>
  }

  return (
    <div dir="rtl" className="min-h-screen bg-surface pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <LuFileChartColumn aria-hidden className="w-[1.1em] h-[1.1em]" />דו״ח חודשי
        </h1>
        <p className="text-fg-3 text-sm mt-1">אותו כרטיס שנשלח במייל בתחילת כל חודש</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 min-w-[12rem] bg-raised border border-line-strong rounded-lg px-3 py-2 text-fg"
            aria-label="מתאמן"
          >
            {trainees.map(t => <option key={t.email} value={t.email}>{t.name}</option>)}
          </select>

          <div className="flex items-center gap-1 bg-raised border border-line-strong rounded-lg">
            <button onClick={() => shift(-1)} className="p-2 text-fg-2 hover:text-fg" aria-label="חודש קודם">
              <LuChevronRight aria-hidden />
            </button>
            <span className="px-2 min-w-[8.5rem] text-center text-fg font-semibold flex items-center justify-center gap-1.5">
              <LuCalendarRange aria-hidden className="text-fg-3" />{HE_MONTHS[month - 1]} {year}
            </span>
            <button onClick={() => shift(1)} disabled={atCurrent} className="p-2 text-fg-2 hover:text-fg disabled:opacity-30" aria-label="חודש הבא">
              <LuChevronLeft aria-hidden />
            </button>
          </div>
        </div>

        {error && <p className="mt-6 text-danger">{error}</p>}
        {!trainees.length && !error && <p className="mt-6 text-fg-3">טוען מתאמנים…</p>}

        <div className={`mt-5 transition-opacity ${loading ? 'opacity-40' : ''}`}>
          {html && (
            <iframe
              ref={frame}
              srcDoc={html}
              onLoad={() => { fit(); setTimeout(fit, 400) }}
              title="דו״ח חודשי"
              className="w-full border-0 rounded-xl block"
              style={{ height: 1200 }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
