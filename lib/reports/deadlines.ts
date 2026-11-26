// Monthly-session task deadlines for the weekly report:
//   met / missed — tasks due in the past 7 days (met = marked done by the deadline)
//   upcoming     — open tasks due in the coming 7 days
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, ilDateOfTimestamp } from './dates'

export interface DeadlineRow {
  name: string          // trainee
  email: string
  owner: 'coach' | 'athlete'
  task: string
  due: string
  doneOn: string | null // Israel date it was marked done
}
export interface Deadlines { met: DeadlineRow[]; missed: DeadlineRow[]; upcoming: DeadlineRow[] }

export async function loadDeadlines(db: SupabaseClient, trainees: { email: string; name: string }[], today: string): Promise<Deadlines> {
  const from = addDays(today, -7), to = addDays(today, 6)
  const out: Deadlines = { met: [], missed: [], upcoming: [] }
  if (!trainees.length) return out
  const nameBy = new Map(trainees.map(t => [t.email, t.name]))
  const { data: sessions } = await db.from('MonthlySessions').select('SessionID, Email').in('Email', trainees.map(t => t.email))
  if (!sessions?.length) return out
  const emailBySession = new Map(sessions.map(s => [s.SessionID as number, s.Email as string]))

  for (const [table, owner] of [['AthleteTodos', 'athlete'], ['CoachTodos', 'coach']] as const) {
    const { data, error } = await db.from(table)
      .select('SessionID, Task, Completed, CompletedAt, DueDate')
      .in('SessionID', [...emailBySession.keys()])
      .gte('DueDate', from).lte('DueDate', to)
    if (error) { console.error(`deadlines ${table}:`, error.message); continue }
    for (const t of data ?? []) {
      const email = emailBySession.get(t.SessionID)!
      const row: DeadlineRow = {
        name: nameBy.get(email) ?? email, email, owner, task: t.Task, due: t.DueDate,
        doneOn: t.Completed && t.CompletedAt ? ilDateOfTimestamp(t.CompletedAt) : t.Completed ? t.DueDate : null,
      }
      if (row.due < today) (row.doneOn && row.doneOn <= row.due ? out.met : out.missed).push(row)
      else if (!t.Completed) out.upcoming.push(row)
    }
  }
  const byDue = (a: DeadlineRow, b: DeadlineRow) => a.due.localeCompare(b.due) || a.name.localeCompare(b.name, 'he')
  out.met.sort(byDue); out.missed.sort(byDue); out.upcoming.sort(byDue)
  return out
}
