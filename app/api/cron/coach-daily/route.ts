// Coach report emails (Issue #17). One Vercel Cron, every morning 07:30 Israel (04:30 UTC):
//   daily   — every day, sent only when there are alerts
//   weekly  — on Sunday, exceptions of the past week
//   monthly — on the 1st, one card per trainee for the previous month
//
// GET /api/cron/coach-daily                          → cron run (all reports due today)
// GET /api/cron/coach-daily?report=weekly&preview=1  → return that report's HTML, send nothing
// GET /api/cron/coach-daily?report=monthly&month=2026-09&preview=1
// GET /api/cron/coach-daily?date=YYYY-MM-DD          → evaluate as of another day (preview)
// GET /api/cron/coach-daily?report=daily&send=always → send now even if empty (test)
// Auth: Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin, loadDailyData, loadTrainees, Trainee } from '@/lib/reports/data'
import { dailyAlerts } from '@/lib/reports/daily-rules'
import { renderDailyEmail } from '@/lib/reports/daily-email'
import { weeklyReview } from '@/lib/reports/weekly-rules'
import { renderWeeklyEmail } from '@/lib/reports/weekly-email'
import { buildMonthlyReport, MonthlyReport } from '@/lib/reports/monthly-data'
import { renderMonthlyEmail } from '@/lib/reports/monthly-email'
import { mailerConfigured, sendReportEmail } from '@/lib/reports/mailer'
import { ilDate } from '@/lib/reports/dates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * One-off: on this Israel date the cron sends all three reports even if empty,
 * so the coach gets a sample of each. Safe to remove after that day.
 */
const SAMPLE_ALL_ON = '2026-10-09'

type Kind = 'daily' | 'weekly' | 'monthly'
interface Email { subject: string; html: string; text: string; count: number }

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

function previousMonth(today: string): [number, number] {
  const [y, m] = today.split('-').map(Number)
  return m === 1 ? [y - 1, 12] : [y, m - 1]
}

async function buildDaily(db: SupabaseClient, trainees: Trainee[], today: string, now: Date): Promise<Email> {
  const data = await loadDailyData(db, trainees, today)
  return renderDailyEmail(today, data.map(t => ({ email: t.email, name: t.name, alerts: dailyAlerts(t, today, now) })))
}

async function buildWeekly(db: SupabaseClient, trainees: Trainee[], today: string): Promise<Email> {
  const data = await loadDailyData(db, trainees, today, 35)
  return renderWeeklyEmail(today, data.map(t => weeklyReview(t, today)))
}

async function buildMonthly(db: SupabaseClient, trainees: Trainee[], year: number, month: number): Promise<Email> {
  const reports: MonthlyReport[] = []
  for (let i = 0; i < trainees.length; i += 5) {
    reports.push(...await Promise.all(trainees.slice(i, i + 5).map(t => buildMonthlyReport(db, t.email, year, month))))
  }
  const e = renderMonthlyEmail(reports, `${HE_MONTHS[month - 1]} ${year}`)
  return { ...e, count: reports.length }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const secret = request.headers.get('authorization')?.replace('Bearer ', '') || params.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dateParam = params.get('date')
  const today = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : ilDate()
  // for a past date, the pain-3 window ends at 07:30 that morning
  const now = dateParam ? new Date(`${today}T04:30:00Z`) : new Date()
  const monthParam = params.get('month')
  const [year, month] = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam.split('-').map(Number) as [number, number]
    : previousMonth(today)

  const requested = params.get('report') as Kind | null
  const preview = params.get('preview') === '1' || !!dateParam
  const sample = !requested && today === SAMPLE_ALL_ON
  const force = params.get('send') === 'always' || sample

  // which reports run now
  const weekday = new Date(today + 'T12:00:00Z').getUTCDay()
  const kinds: Kind[] = requested ? [requested]
    : sample ? ['daily', 'weekly', 'monthly']
    : ['daily', ...(weekday === 0 ? ['weekly' as const] : []), ...(today.endsWith('-01') ? ['monthly' as const] : [])]

  try {
    const db = getSupabaseAdmin()
    const trainees = await loadTrainees(db)

    const build = (k: Kind) =>
      k === 'daily' ? buildDaily(db, trainees, today, now)
      : k === 'weekly' ? buildWeekly(db, trainees, today)
      : buildMonthly(db, trainees, year, month)

    if (preview) {
      const e = await build(kinds[0])
      return new NextResponse(e.html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    if (!mailerConfigured()) {
      return NextResponse.json({ sent: false, reason: 'SMTP_USER / SMTP_PASS not set' }, { status: 500 })
    }

    const results: Record<string, unknown> = {}
    let failed = false
    for (const k of kinds) {
      // each report on its own: a failure in one doesn't block the others
      try {
        const e = await build(k)
        // daily: only when there are alerts; weekly: only when there is something to act on
        if (!force && k !== 'monthly' && !e.count) { results[k] = { sent: false, reason: 'nothing to report' }; continue }
        await sendReportEmail(e.subject, e.html, e.text)
        results[k] = { sent: true, count: e.count }
      } catch (err) {
        failed = true
        console.error(`coach report ${k} failed:`, err)
        results[k] = { sent: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
    return NextResponse.json({ date: today, trainees: trainees.length, results }, { status: failed ? 500 : 200 })
  } catch (err) {
    console.error('coach reports failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
