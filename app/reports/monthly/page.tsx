'use client'

// Monthly report per trainee (coach/admin) — the same card as the monthly email.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { LuCalendarRange, LuChevronLeft, LuChevronRight, LuCircleCheck, LuCircleX, LuFileChartColumn, LuFileDown, LuMail, LuRefreshCw } from 'react-icons/lu'

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

// ── Email status: which settings exist, whether the Gmail login works, last runs ──

interface MailStatus {
  vercelEnv: string | null
  env: Record<'SMTP_USER' | 'SMTP_PASS' | 'CRON_SECRET' | 'SUPABASE_SERVICE_ROLE_KEY', boolean>
  smtp: { ok: boolean; error?: string } | null
  to: string | null
  runs: { RunAt: string; Source: string; Ok: boolean; Results: Record<string, unknown> }[] | null
}

const KIND_HE: Record<string, string> = { daily: 'יומי', weekly: 'שבועי', monthly: 'חודשי' }

function runSummary(r: Record<string, unknown>): string {
  if (typeof r.error === 'string') return r.error
  return Object.entries(r)
    .filter(([k]) => k in KIND_HE)
    .map(([k, v]) => {
      const x = (typeof v === 'string' ? { status: v } : v) as { sent?: boolean; status?: string; reason?: string; error?: string }
      const ok = x.sent || x.status === 'sent'
      return `${KIND_HE[k]}: ${ok ? 'נשלח' : x.reason === 'nothing to report' ? 'אין מה לדווח' : (x.error ?? x.status ?? 'לא נשלח')}`
    })
    .join(' · ')
}

function smtpHint(err: string): string {
  if (/535|Invalid login|Username and Password not accepted|BadCredentials/i.test(err))
    return 'Gmail דחה את הסיסמה. צריך App Password (16 תווים) מחשבון Google עם אימות דו-שלבי, לעדכן את SMTP_PASS ב-Vercel ולעשות Redeploy.'
  if (/ETIMEDOUT|ECONNECTION|ENOTFOUND/i.test(err)) return 'אין חיבור לשרת המייל. לרוב זמני, כדאי לנסות שוב.'
  return 'כדאי לבדוק את SMTP_USER ו-SMTP_PASS ב-Vercel.'
}

function MailStatusPanel() {
  const [st, setSt] = useState<MailStatus | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/reports/status', { headers: await authHeader() })
      if (!res.ok) throw new Error(`שגיאה ${res.status}`)
      setSt(await res.json())
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    setBusy(false)
  }, [])
  useEffect(() => { load() }, [load])

  const Row = ({ ok, title, fix }: { ok: boolean; title: string; fix?: string }) => (
    <li className="flex items-start gap-2">
      {ok ? <LuCircleCheck aria-hidden className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <LuCircleX aria-hidden className="w-5 h-5 text-danger shrink-0 mt-0.5" />}
      <span className="flex-1">
        <span className="font-bold">{title}</span>
        {!ok && fix && <span className="block text-sm text-fg-3">{fix}</span>}
      </span>
    </li>
  )
  const envFix = 'Vercel → Settings → Environment Variables → להוסיף עם סימון Production → Deployments → Redeploy.'

  return (
    <section className="mt-4 rounded-xl border border-line bg-raised p-4" aria-label="מצב שליחת מיילים">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-extrabold">מצב שליחת מיילים</h2>
        <button type="button" onClick={load} disabled={busy} className="inline-flex items-center gap-1.5 text-sm text-accent font-bold disabled:opacity-50">
          <LuRefreshCw aria-hidden className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />בדוק שוב
        </button>
      </div>
      {err && <p className="text-danger text-sm">{err}</p>}
      {!st && !err && <p className="text-sm text-muted">בודק…</p>}
      {st && (
        <>
          <ul className="flex flex-col gap-2">
            <Row ok={st.env.SMTP_USER && st.env.SMTP_PASS} title={`כתובת וסיסמת מייל (SMTP_USER, SMTP_PASS)${st.vercelEnv ? ` · ${st.vercelEnv}` : ''}`} fix={`חסר: ${[!st.env.SMTP_USER && 'SMTP_USER', !st.env.SMTP_PASS && 'SMTP_PASS'].filter(Boolean).join(', ')}. ${envFix}`} />
            {st.smtp && <Row ok={st.smtp.ok} title={st.smtp.ok ? `כניסה ל-Gmail עובדת · נשלח אל ${st.to ?? ''}` : `כניסה ל-Gmail נכשלה: ${st.smtp.error}`} fix={st.smtp.error ? smtpHint(st.smtp.error) : undefined} />}
            <Row ok={st.env.CRON_SECRET} title="הפעלה אוטומטית כל בוקר (CRON_SECRET)" fix={`בלי המשתנה הזה Vercel לא יכול להפעיל את הדוח האוטומטי. להוסיף CRON_SECRET עם ערך אקראי ארוך כלשהו. ${envFix}`} />
            <Row ok={st.env.SUPABASE_SERVICE_ROLE_KEY} title="גישת שרת לנתונים (SUPABASE_SERVICE_ROLE_KEY)" fix={`המפתח נמצא ב-Supabase → Project Settings → API → service_role. ${envFix}`} />
          </ul>

          <h3 className="font-bold mt-4 mb-1.5 text-fg-2">הרצות אחרונות</h3>
          {st.runs === null && (
            <p className="text-sm text-fg-3">יומן ההרצות עוד לא הופעל: צריך להריץ ב-Supabase את supabase/migrations/20261011_report_runs.sql.</p>
          )}
          {st.runs && st.runs.length === 0 && <p className="text-sm text-fg-3">עוד אין הרצות מאז שהיומן הופעל. הדוח האוטומטי רץ כל בוקר ב-07:30.</p>}
          {st.runs && st.runs.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {st.runs.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  {r.Ok ? <LuCircleCheck aria-hidden className="w-4 h-4 text-success shrink-0 mt-0.5" /> : <LuCircleX aria-hidden className="w-4 h-4 text-danger shrink-0 mt-0.5" />}
                  <span className="text-muted shrink-0 tabular-nums">{new Date(r.RunAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="shrink-0 font-bold">{r.Source === 'cron' ? 'אוטומטי' : 'בדיקה'}</span>
                  <span className="text-fg-3">{runSummary(r.Results ?? {})}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted mt-3">יומי: כל בוקר ב-07:30, רק כשיש התראות · שבועי: ביום ראשון · חודשי: ב-1 לחודש.</p>
        </>
      )}
    </section>
  )
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
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [testMsg, setTestMsg] = useState('')

  // opens the report in a new window and the print dialog → "Save as PDF"
  const exportPdf = () => {
    const w = window.open('', '_blank')
    if (!w) { setError('הדפדפן חסם את החלון. אפשר חלונות קופצים לאתר ונסה שוב.'); return }
    w.document.open(); w.document.write(html); w.document.close()
    const go = () => { w.focus(); w.print() }
    const fonts = w.document.fonts
    if (fonts?.ready) fonts.ready.then(() => setTimeout(go, 300))
    else setTimeout(go, 800)
  }

  const sendTest = async () => {
    setTestState('sending'); setTestMsg('')
    try {
      const res = await fetch('/api/reports/send-test', { method: 'POST', headers: await authHeader() })
      const body = await res.json().catch(() => ({}))
      if (res.ok) { setTestState('sent'); setTestMsg(`נשלחו 3 מיילים ל-${body.to ?? 'כתובת הדיווח'}`) }
      else {
        setTestState('failed')
        setTestMsg(body.results ? Object.entries(body.results).filter(([, v]) => v !== 'sent').map(([k, v]) => `${k}: ${v}`).join(' · ') : body.error ?? `שגיאה ${res.status}`)
      }
    } catch (e) {
      setTestState('failed'); setTestMsg(e instanceof Error ? e.message : String(e))
    }
  }

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

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={sendTest}
            disabled={testState === 'sending'}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line-strong bg-raised text-fg-2 hover:text-fg text-sm disabled:opacity-50"
          >
            <LuMail aria-hidden />{testState === 'sending' ? 'שולח…' : 'שלח לי מייל בדיקה (יומי, שבועי, חודשי)'}
          </button>
          {testMsg && <span className={`text-sm ${testState === 'sent' ? 'text-success' : 'text-danger'}`}>{testMsg}</span>}
        </div>

        <MailStatusPanel />

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

          <button
            onClick={exportPdf}
            disabled={!html || loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line-strong bg-raised text-fg-2 hover:text-fg disabled:opacity-40"
          >
            <LuFileDown aria-hidden />ייצוא PDF
          </button>
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
