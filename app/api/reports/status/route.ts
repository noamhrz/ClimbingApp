// GET /api/reports/status — why report emails are (not) going out. Admin or coach only.
// Returns which settings exist (never their values), whether the Gmail login works,
// and the last report runs (from "ReportRuns", if the table exists).

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/reports/data'
import { verifyMailer } from '@/lib/reports/mailer'
import { lastReportRuns } from '@/lib/reports/runlog'

export const dynamic = 'force-dynamic'

const has = (k: string) => !!process.env[k]?.trim()

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await db.from('Users').select('Role').eq('Email', user.email).single()
  if (me?.Role !== 'admin' && me?.Role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const env = {
    SMTP_USER: has('SMTP_USER'),
    SMTP_PASS: has('SMTP_PASS'),
    CRON_SECRET: has('CRON_SECRET'),
    SUPABASE_SERVICE_ROLE_KEY: has('SUPABASE_SERVICE_ROLE_KEY'),
  }
  const smtpError = env.SMTP_USER && env.SMTP_PASS ? await verifyMailer() : null
  const runs = await lastReportRuns(db)

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV ?? null,
    env,
    smtp: env.SMTP_USER && env.SMTP_PASS ? (smtpError ? { ok: false, error: smtpError } : { ok: true }) : null,
    to: process.env.REPORT_TO || process.env.SMTP_USER || null,
    runs,                       // null = ReportRuns table missing
  })
}
