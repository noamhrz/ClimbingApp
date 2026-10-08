// Builds the three coach report emails (shared by the cron and the "send test" button).

import { SupabaseClient } from '@supabase/supabase-js'
import { loadDailyData, Trainee } from './data'
import { dailyAlerts } from './daily-rules'
import { renderDailyEmail } from './daily-email'
import { weeklyReview } from './weekly-rules'
import { renderWeeklyEmail } from './weekly-email'
import { buildMonthlyReport, MonthlyReport } from './monthly-data'
import { renderMonthlyEmail } from './monthly-email'

export type ReportKind = 'daily' | 'weekly' | 'monthly'
export interface ReportEmail { subject: string; html: string; text: string; count: number }

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export function previousMonth(today: string): [number, number] {
  const [y, m] = today.split('-').map(Number)
  return m === 1 ? [y - 1, 12] : [y, m - 1]
}

export async function buildDaily(db: SupabaseClient, trainees: Trainee[], today: string, now: Date): Promise<ReportEmail> {
  const data = await loadDailyData(db, trainees, today)
  return renderDailyEmail(today, data.map(t => ({ email: t.email, name: t.name, alerts: dailyAlerts(t, today, now) })))
}

export async function buildWeekly(db: SupabaseClient, trainees: Trainee[], today: string): Promise<ReportEmail> {
  const data = await loadDailyData(db, trainees, today, 35)
  return renderWeeklyEmail(today, data.map(t => weeklyReview(t, today)))
}

export async function buildMonthly(db: SupabaseClient, trainees: Trainee[], year: number, month: number): Promise<ReportEmail> {
  const reports: MonthlyReport[] = []
  for (let i = 0; i < trainees.length; i += 5) {
    reports.push(...await Promise.all(trainees.slice(i, i + 5).map(t => buildMonthlyReport(db, t.email, year, month))))
  }
  const e = renderMonthlyEmail(reports, `${HE_MONTHS[month - 1]} ${year}`)
  return { ...e, count: reports.length }
}
