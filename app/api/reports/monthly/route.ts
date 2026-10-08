// Monthly report for the coach page (/reports/monthly).
//
// GET /api/reports/monthly                           → { trainees: [{email, name}] } (active, role 'user')
// GET /api/reports/monthly?email=&year=&month=       → the trainee's monthly card as an HTML page
// Auth: Supabase access token of an admin or coach (Authorization: Bearer <token>).
// A coach only sees their own trainees (CoachTraineesActiveView).

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, loadTrainees } from '@/lib/reports/data'
import { buildMonthlyReport } from '@/lib/reports/monthly-data'
import { renderMonthlyPage } from '@/lib/reports/monthly-email'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getSupabaseAdmin()
    const { data: { user }, error } = await db.auth.getUser(token)
    if (error || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await db.from('Users').select('Role').eq('Email', user.email).single()
    const role = me?.Role as string | undefined
    if (role !== 'admin' && role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let trainees = await loadTrainees(db)
    if (role === 'coach') {
      const { data: links } = await db.from('CoachTraineesActiveView').select('TraineeEmail').eq('CoachEmail', user.email)
      const mine = new Set((links ?? []).map(l => l.TraineeEmail as string))
      trainees = trainees.filter(t => mine.has(t.email))
    }

    const params = request.nextUrl.searchParams
    const email = params.get('email')
    if (!email) return NextResponse.json({ trainees })

    if (!trainees.some(t => t.email === email)) {
      return NextResponse.json({ error: 'Trainee not found' }, { status: 404 })
    }
    const year = Number(params.get('year'))
    const month = Number(params.get('month'))
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 2020) {
      return NextResponse.json({ error: 'Bad year/month' }, { status: 400 })
    }

    const report = await buildMonthlyReport(db, email, year, month)
    return new NextResponse(renderMonthlyPage(report), { headers: { 'content-type': 'text/html; charset=utf-8' } })
  } catch (err) {
    console.error('reports/monthly failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
