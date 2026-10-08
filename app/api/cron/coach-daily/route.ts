// Daily coach alert email (Issue #17).
//
// GET /api/cron/coach-daily                 → Vercel Cron: evaluate and email (only if there are alerts)
// GET /api/cron/coach-daily?preview=1       → return the email HTML, send nothing
// GET /api/cron/coach-daily?date=YYYY-MM-DD → evaluate as of another day (with preview)
// GET /api/cron/coach-daily?send=always     → send even when there are no alerts (test)
// Auth: Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, loadDailyData, loadTrainees } from '@/lib/reports/data'
import { dailyAlerts } from '@/lib/reports/daily-rules'
import { renderDailyEmail } from '@/lib/reports/daily-email'
import { mailerConfigured, sendReportEmail } from '@/lib/reports/mailer'
import { ilDate } from '@/lib/reports/dates'

export const dynamic = 'force-dynamic'

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

  try {
    const db = getSupabaseAdmin()
    const trainees = await loadTrainees(db)
    const data = await loadDailyData(db, trainees, today)
    const list = data.map(t => ({ email: t.email, name: t.name, alerts: dailyAlerts(t, today, now) }))
    const email = renderDailyEmail(today, list)

    if (params.get('preview') === '1' || dateParam) {
      return new NextResponse(email.html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    if (!email.count && params.get('send') !== 'always') {
      return NextResponse.json({ sent: false, reason: 'no alerts', trainees: trainees.length, date: today })
    }
    if (!mailerConfigured()) {
      return NextResponse.json({ sent: false, reason: 'SMTP_USER / SMTP_PASS not set', alerts: email.count }, { status: 500 })
    }
    await sendReportEmail(email.subject, email.html, email.text)
    return NextResponse.json({ sent: true, alerts: email.count, trainees: trainees.length, date: today })
  } catch (err) {
    console.error('coach-daily failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
