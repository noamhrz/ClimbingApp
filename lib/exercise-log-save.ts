// Saving and loading ExerciseLogs for one calendar entry.
//
// A workout can contain the same exercise more than once (two blocks, a duplicated block).
// Each occurrence gets its own log per hand side. Occurrence n (1-based, in workout order) is
// stored in SetNumber when the exercise appears more than once; older logs without it are
// matched to occurrences oldest-first. Logs left over after matching are duplicates and removed.

import { supabase } from '@/lib/supabaseClient'

export type Side = 'Right' | 'Left' | 'Both'

export interface LogRow {
  ExerciseLogID: number
  ExerciseID: number
  HandSide: string | null
  SetNumber?: number | null
  [k: string]: unknown
}

interface FormLike {
  ExerciseID: number
  IsSingleHand?: boolean
  isDuration?: boolean
  RepsDone?: number | null
  DurationSec?: number | null
  WeightKG?: number | null
  RPE?: number | null
  Notes?: string | null
  RepsDoneLeft?: number | null
  DurationSecLeft?: number | null
  WeightKGLeft?: number | null
  RPELeft?: number | null
  NotesLeft?: string | null
}

/** 1-based occurrence of each form's exercise, and how many times each exercise appears */
export function occurrences(forms: { ExerciseID: number }[]) {
  const count = new Map<number, number>()
  const occ = forms.map(f => {
    const n = (count.get(f.ExerciseID) ?? 0) + 1
    count.set(f.ExerciseID, n)
    return n
  })
  return { occ, count }
}

/**
 * Match existing logs to occurrences. Returns `${ExerciseID}:${side}:${occ}` → log, plus the ids
 * of logs that matched nothing (duplicates).
 */
export function matchLogs(forms: { ExerciseID: number }[], logs: LogRow[]) {
  const { count } = occurrences(forms)
  const groups = new Map<string, LogRow[]>()
  for (const l of [...logs].sort((a, b) => a.ExerciseLogID - b.ExerciseLogID)) {
    const k = `${l.ExerciseID}:${l.HandSide ?? 'Both'}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(l)
  }
  const byOcc = new Map<string, LogRow>()
  const duplicates: number[] = []
  for (const [k, rows] of groups) {
    const exId = Number(k.split(':')[0])
    const m = count.get(exId) ?? 0
    const slots: (LogRow | null)[] = Array(m).fill(null)
    const rest: LogRow[] = []
    // logs that say which occurrence they belong to
    for (const r of rows) {
      const s = r.SetNumber
      if (m > 1 && s != null && s >= 1 && s <= m && !slots[s - 1]) slots[s - 1] = r
      else rest.push(r)
    }
    // older logs fill the remaining occurrences in order
    for (const r of rest) {
      const free = slots.indexOf(null)
      if (free === -1) duplicates.push(r.ExerciseLogID)
      else slots[free] = r
    }
    slots.forEach((r, i) => { if (r) byOcc.set(`${k}:${i + 1}`, r) })
  }
  return { byOcc, duplicates }
}

/**
 * Write the logs for one calendar entry: update matched logs, insert new ones, delete duplicates.
 * Throws on any error, including an update that changed 0 rows (blocked by row-level security).
 * Returns the number of exercises (not hand sides) that were saved.
 */
export async function saveExerciseLogs(opts: {
  calendarId: number
  forms: FormLike[]
  base: Record<string, unknown>          // Email, WorkoutID, CalendarID…
  now: string
  isNewCalendar?: boolean                 // a calendar row created just now has no logs to read
}): Promise<number> {
  const { calendarId, forms, base, now, isNewCalendar } = opts
  const { occ, count } = occurrences(forms)
  const filled = (v: unknown) => v !== null && v !== undefined
  const payloads = new Map<string, Record<string, unknown>>()

  forms.forEach((ex, i) => {
    const put = (side: Side, left: boolean) => {
      const reps = left ? ex.RepsDoneLeft : ex.RepsDone
      const dur = left ? ex.DurationSecLeft : ex.DurationSec
      const kg = left ? ex.WeightKGLeft : ex.WeightKG
      const rpe = left ? ex.RPELeft : ex.RPE
      const notes = (left ? ex.NotesLeft : ex.Notes) ?? undefined
      if (!(filled(reps) || filled(dur) || filled(kg) || filled(rpe) || (notes && notes.trim() !== ''))) return
      payloads.set(`${ex.ExerciseID}:${side}:${occ[i]}`, {
        ...base,
        ExerciseID: ex.ExerciseID,
        HandSide: side,
        RepsDone: ex.isDuration ? null : (reps ?? null),
        DurationSec: ex.isDuration ? (dur ?? null) : null,
        WeightKG: kg ?? null,
        RPE: rpe || null,
        Notes: notes?.trim() || null,
        Completed: true,
        UpdatedAt: now,
        // only exercises that repeat need to say which occurrence they are
        ...((count.get(ex.ExerciseID) ?? 1) > 1 ? { SetNumber: occ[i] } : {}),
      })
    }
    if (ex.IsSingleHand) { put('Right', false); put('Left', true) }
    else put('Both', false)
  })

  if (payloads.size === 0) return 0

  let byOcc = new Map<string, LogRow>()
  let duplicates: number[] = []
  if (!isNewCalendar) {
    const { data: rows, error } = await supabase
      .from('ExerciseLogs')
      .select('ExerciseLogID, ExerciseID, HandSide, SetNumber')
      .eq('CalendarID', calendarId)
      .order('ExerciseLogID')
    if (error) throw error
    ;({ byOcc, duplicates } = matchLogs(forms, (rows ?? []) as LogRow[]))
  }

  const inserts: Record<string, unknown>[] = []
  const writes: PromiseLike<{ error: unknown }>[] = []
  for (const [key, payload] of payloads) {
    const log = byOcc.get(key)
    if (log) {
      writes.push(
        supabase.from('ExerciseLogs').update(payload).eq('ExerciseLogID', log.ExerciseLogID).select('ExerciseLogID')
          .then(r => ({ error: r.error ?? (r.data?.length ? null : new Error('עדכון תרגיל נחסם (0 שורות עודכנו)')) }))
      )
    } else inserts.push({ ...payload, CreatedAt: now })
  }
  if (inserts.length) writes.push(supabase.from('ExerciseLogs').insert(inserts))
  if (duplicates.length) writes.push(supabase.from('ExerciseLogs').delete().in('ExerciseLogID', duplicates))
  const failed = (await Promise.all(writes)).find(r => r.error)
  if (failed) throw failed.error

  return [...payloads.keys()].filter(k => !k.includes(':Left:')).length
}

/** Merge a saved draft into freshly loaded forms, matching by exercise and occurrence */
export function mergeDraftForms<T extends { ExerciseID: number }>(loaded: T[], draft: T[], fields: readonly string[]): T[] {
  const d = occurrences(draft).occ
  const draftByOcc = new Map(draft.map((x, i) => [`${x.ExerciseID}:${d[i]}`, x]))
  const l = occurrences(loaded).occ
  return loaded.map((ex, i) => {
    const saved = draftByOcc.get(`${ex.ExerciseID}:${l[i]}`) as Record<string, unknown> | undefined
    if (!saved) return ex
    const out: Record<string, unknown> = { ...ex }
    for (const f of fields) out[f] = saved[f]
    return out as T
  })
}

export const DRAFT_FIELDS = [
  'RepsDone', 'DurationSec', 'WeightKG', 'RPE', 'Notes', 'Completed',
  'RepsDoneLeft', 'DurationSecLeft', 'WeightKGLeft', 'RPELeft', 'NotesLeft', 'CompletedLeft',
] as const
