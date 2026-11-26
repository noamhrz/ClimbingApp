// Deadline reminders for monthly-session tasks (CoachTodos / AthleteTodos), run once a day
// from the WhatsApp reminders cron. For an open task with a DueDate:
//   3–2 days before → "בעוד N ימים"   (ReminderStage → 1)
//   1 day before / the day itself → "מחר" / "היום" (→ 2)
//   after the deadline → once, "עבר ב-…" (→ 3)
// A trainee's task goes to the trainee, the coach's task to the session's coach
// (with the trainee's name in front). Changing the deadline resets ReminderStage to 0.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Twilio } from 'twilio'
import { normalizePhone } from '@/lib/phone'
import { isActiveUser } from '@/lib/active-users'
import { TWILIO_FROM, WA_TEMPLATES, waVar } from '@/lib/whatsapp-templates'

interface Todo { TodoID: number; SessionID: number; Task: string; Completed: boolean; DueDate: string | null; ReminderStage: number | null }
type Table = 'CoachTodos' | 'AthleteTodos'

const dm = (d: string) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000)

/** which reminder (if any) is due today, and its "מועד:" text */
export function reminderFor(due: string, today: string, stage: number): { stage: number; when: string } | null {
  const days = daysBetween(today, due)
  if (days < 0) return stage < 3 ? { stage: 3, when: `עבר ב-${dm(due)}. מה המצב?` } : null
  if (days <= 1) return stage < 2 ? { stage: 2, when: days === 0 ? `היום (${dm(due)})` : `מחר (${dm(due)})` } : null
  if (days <= 3) return stage < 1 ? { stage: 1, when: `בעוד ${days} ימים (${dm(due)})` } : null
  return null
}

export async function runTaskReminders(db: SupabaseClient, tw: Twilio, today: string) {
  const out = { due: 0, sent: 0, skipped: 0, errors: 0, template: !!WA_TEMPLATES.task_reminder }
  const horizon = new Date(Date.parse(today) + 3 * 86400000).toISOString().slice(0, 10)

  const load = async (table: Table) => {
    const { data, error } = await db.from(table)
      .select('TodoID, SessionID, Task, Completed, DueDate, ReminderStage')
      .eq('Completed', false).not('DueDate', 'is', null).lte('DueDate', horizon).lt('ReminderStage', 3)
    if (error) { console.error(`task reminders: ${table}`, error.message); return [] as { table: Table; t: Todo }[] }
    return (data as Todo[]).map(t => ({ table, t }))
  }
  const items = [...await load('AthleteTodos'), ...await load('CoachTodos')]
    .map(x => ({ ...x, r: reminderFor(x.t.DueDate!, today, x.t.ReminderStage ?? 0) }))
    .filter(x => x.r)
  out.due = items.length
  if (!items.length) return out

  const { data: sessions } = await db.from('MonthlySessions').select('SessionID, Email, CoachEmail')
    .in('SessionID', [...new Set(items.map(x => x.t.SessionID))])
  const sessionById = new Map((sessions ?? []).map(s => [s.SessionID, s as { SessionID: number; Email: string; CoachEmail: string }]))
  const emails = [...new Set((sessions ?? []).flatMap(s => [s.Email, s.CoachEmail]).filter(Boolean))]
  const [{ data: users }, { data: profiles }] = await Promise.all([
    db.from('Users').select('Email, Name, Status, IsActive').in('Email', emails),
    db.from('Profiles').select('Email, Phone').in('Email', emails),
  ])
  const userBy = new Map((users ?? []).map(u => [u.Email, u]))
  const phoneBy = new Map((profiles ?? []).map(p => [p.Email, normalizePhone(p.Phone)]))

  for (const { table, t, r } of items) {
    const s = sessionById.get(t.SessionID)
    const trainee = s ? userBy.get(s.Email) : null
    // a session of an inactive trainee: no reminders for anyone
    if (!s || !isActiveUser(trainee)) { out.skipped++; continue }
    const to = table === 'AthleteTodos' ? s.Email : s.CoachEmail
    const phone = phoneBy.get(to)
    const advance = () => db.from(table).update({ ReminderStage: r!.stage }).eq('TodoID', t.TodoID)
    if (!phone) { out.skipped++; await advance(); continue } // nobody to tell: don't keep retrying
    if (!WA_TEMPLATES.task_reminder) { out.skipped++; continue } // template not approved yet: try again tomorrow
    const firstName = (userBy.get(to)?.Name ?? '').split(' ')[0]
    const task = table === 'CoachTodos' ? `${trainee?.Name ?? s.Email}: ${t.Task}` : t.Task
    try {
      const msg = await tw.messages.create({
        from: TWILIO_FROM,
        to: `whatsapp:${phone}`,
        contentSid: WA_TEMPLATES.task_reminder,
        contentVariables: JSON.stringify({ '1': waVar(firstName, 'שלום'), '2': waVar(task), '3': waVar(r!.when) }),
      })
      await advance()
      await db.from('WhatsAppLog').insert({
        Email: to, CalendarID: null, MessageSid: msg.sid, TemplateName: 'task_reminder', Status: 'sent', SentAt: new Date().toISOString(),
      })
      out.sent++
      await new Promise(res => setTimeout(res, 1000))
    } catch (e) {
      console.error(`task reminder ${table} #${t.TodoID}:`, e)
      out.errors++
    }
  }
  return out
}
