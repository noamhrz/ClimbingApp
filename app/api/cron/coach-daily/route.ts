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
import { getSupabaseAdmin, loadTrainees } from '@/lib/reports/data'
import { buildDaily, buildMonthly, buildWeekly, previousMonth, ReportKind } from '@/lib/reports/build'
import { mailerConfigured, sendReportEmail } from '@/lib/reports/mailer'
import { ilDate } from '@/lib/reports/dates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Kind = ReportKind

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
  const force = params.get('send') === 'always'

  // which reports run now
  const weekday = new Date(today + 'T12:00:00Z').getUTCDay()
  const kinds: Kind[] = requested ? [requested]
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
