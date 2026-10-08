// Server-only data loading for coach reports (service-role Supabase client).

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { addDays, ilDateOfTimestamp, parseDbTimestamp } from './dates'
import type { TraineeData } from './daily-rules'

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export interface Trainee {
  email: string
  name: string
}

/** All active users with role 'user' (inactive excluded). */
export async function loadTrainees(db: SupabaseClient): Promise<Trainee[]> {
  const { data, error } = await db
    .from('Users')
    .select('Email, Name, Role, Status, IsActive')
    .eq('Role', 'user')
  if (error) throw error
  return (data ?? [])
    .filter(u => u.IsActive !== false && String(u.Status ?? '').toLowerCase() !== 'inactive')
    .map(u => ({ email: u.Email as string, name: (u.Name as string) || (u.Email as string) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

/**
 * Wellness and calendar rows around `today` for the given trainees.
 * Window: 21 days back (rules look back ≤ 14 days + yesterday) and ~3 weeks ahead.
 * Older calendar history is only checked for existence (for the "new trainee" rule).
 */
export async function loadDailyData(db: SupabaseClient, trainees: Trainee[], today: string): Promise<TraineeData[]> {
  const emails = trainees.map(t => t.email)
  if (!emails.length) return []
  const from = addDays(today, -21)
  const to = addDays(today, 22)

  const historyBefore = addDays(today, -8)
  const [wellnessRes, calendarRes, ...historyCounts] = await Promise.all([
    db.from('WellnessLog')
      .select('Email, Date, SleepHours, VitalityLevel, PainLevel, PainArea, CreatedAt')
      .in('Email', emails)
      .gte('Date', from),
    db.from('Calendar')
      .select('Email, StartTime, Completed, Deloading')
      .in('Email', emails)
      .gte('StartTime', `${addDays(from, -1)}T00:00:00`)
      .lt('StartTime', `${to}T00:00:00`),
    // per trainee: any calendar entry older than the "new trainee" window?
    ...emails.map(e =>
      db.from('Calendar')
        .select('CalendarID', { count: 'exact', head: true })
        .eq('Email', e)
        .lt('StartTime', `${historyBefore}T00:00:00`)
    ),
  ])
  if (wellnessRes.error) throw wellnessRes.error
  if (calendarRes.error) throw calendarRes.error
  const hasHistory = new Set(emails.filter((_, i) => (historyCounts[i].count ?? 0) > 0))

  return trainees.map(t => {
    const calendar = (calendarRes.data ?? [])
      .filter(c => c.Email === t.email)
      .map(c => ({ date: ilDateOfTimestamp(c.StartTime), completed: !!c.Completed, deloading: !!c.Deloading }))
    // older history exists: add a marker so the "new trainee" rule never fires
    if (hasHistory.has(t.email)) calendar.push({ date: addDays(from, -2), completed: true, deloading: false })
    return {
      email: t.email,
      name: t.name,
      wellness: (wellnessRes.data ?? [])
        .filter(w => w.Email === t.email)
        .map(w => ({
          date: String(w.Date).slice(0, 10),
          sleep: w.SleepHours == null ? null : Number(w.SleepHours),
          vitality: w.VitalityLevel == null ? null : Number(w.VitalityLevel),
          pain: w.PainLevel == null ? null : Number(w.PainLevel),
          painArea: w.PainArea ?? null,
          createdAt: w.CreatedAt ? parseDbTimestamp(w.CreatedAt) : null,
        })),
      calendar,
    }
  })
}
