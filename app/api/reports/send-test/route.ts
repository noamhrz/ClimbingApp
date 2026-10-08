// POST /api/reports/send-test — sends the daily, weekly and monthly coach emails now,
// even when empty, to the report address. For an admin or coach (Supabase access token).

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, loadTrainees } from '@/lib/reports/data'
import { buildDaily, buildMonthly, buildWeekly, previousMonth, ReportKind } from '@/lib/reports/build'
import { mailerConfigured, sendReportEmail } from '@/lib/reports/mailer'
import { ilDate } from '@/lib/reports/dates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await db.from('Users').select('Role').eq('Email', user.email).single()
  if (me?.Role !== 'admin' && me?.Role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!mailerConfigured()) return NextResponse.json({ error: 'SMTP_USER / SMTP_PASS not set' }, { status: 500 })

  const today = ilDate()
  const [year, month] = previousMonth(today)
  const trainees = await loadTrainees(db)
  const results: Partial<Record<ReportKind, string>> = {}
  for (const k of ['daily', 'weekly', 'monthly'] as ReportKind[]) {
    try {
      const e = k === 'daily' ? await buildDaily(db, trainees, today, new Date())
        : k === 'weekly' ? await buildWeekly(db, trainees, today)
        : await buildMonthly(db, trainees, year, month)
      await sendReportEmail(`[בדיקה] ${e.subject}`, e.html, e.text)
      results[k] = 'sent'
    } catch (err) {
      console.error(`send-test ${k} failed:`, err)
      results[k] = err instanceof Error ? err.message : String(err)
    }
  }
  const ok = Object.values(results).every(v => v === 'sent')
  return NextResponse.json({ ok, results, to: process.env.REPORT_TO || process.env.SMTP_USER }, { status: ok ? 200 : 500 })
}
