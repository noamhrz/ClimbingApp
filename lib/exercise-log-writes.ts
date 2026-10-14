import { supabase } from '@/lib/supabaseClient'

/*
 * Exercise logs: one row per calendar entry + exercise + hand side + appearance + set
 * (unique key unique_exercise_set_per_calendar, supabase/migrations/20261014_exercise_logs_occurrence.sql).
 *
 * In the forms, an exercise entry keeps set 1 in its own fields (RepsDone, WeightKG, ... and *Left),
 * sets 2+ in MoreSets, and its appearance number in Occurrence
 * (1st time this exercise appears in the workout, 2nd time, ... counted over the whole workout).
 */

export const SET_KEYS = ['RepsDone', 'DurationSec', 'WeightKG', 'RPE', 'RepsDoneLeft', 'DurationSecLeft', 'WeightKGLeft', 'RPELeft'] as const
export type SetKey = typeof SET_KEYS[number]
export type SetVals = Partial<Record<SetKey, number | null>>

/* eslint-disable @typescript-eslint/no-explicit-any */
type Form = Record<string, any>
type Side = 'Right' | 'Left' | 'Both'

const filled = (v: unknown) => v !== null && v !== undefined && v !== ''

/** Adds Occurrence to each entry: how many times its exercise appeared up to and including it. */
export function withOccurrence<T extends Form>(forms: T[]): (T & { Occurrence: number })[] {
  const seen = new Map<number, number>()
  return forms.map(f => {
    const o = (seen.get(f.ExerciseID) ?? 0) + 1
    seen.set(f.ExerciseID, o)
    return { ...f, Occurrence: o }
  })
}

/** All sets of an entry: set 1 from its own fields, then MoreSets. */
export function allSets(ex: Form): SetVals[] {
  const first: SetVals = {}
  for (const k of SET_KEYS) first[k] = ex[k] ?? null
  return [first, ...((ex.MoreSets as SetVals[] | undefined) ?? [])]
}

export function setHasValues(s: SetVals | undefined, side?: 'R' | 'L'): boolean {
  if (!s) return false
  const keys = side === 'L' ? SET_KEYS.slice(4) : side === 'R' ? SET_KEYS.slice(0, 4) : SET_KEYS
  return keys.some(k => filled(s[k]))
}

/** Values of a log row as the fields of one side of a set. */
function rowToSet(row: Form, left: boolean): SetVals {
  const s = left ? 'Left' : ''
  return { ['RepsDone' + s]: row.RepsDone ?? null, ['DurationSec' + s]: row.DurationSec ?? null, ['WeightKG' + s]: row.WeightKG ?? null, ['RPE' + s]: row.RPE ?? null } as SetVals
}

/**
 * Fills entries (which must have Occurrence) from a calendar entry's saved logs:
 * set 1 into the entry's own fields (and Notes), sets 2+ into MoreSets.
 * Logs saved before appearances/sets existed are appearance 1, set 1.
 */
export function fillFromLogs<T extends Form>(forms: T[], logs: Form[]): T[] {
  return forms.map(ex => {
    const occ = ex.Occurrence ?? 1
    const mine = logs.filter(l => l.ExerciseID === ex.ExerciseID && (l.Occurrence ?? 1) === occ)
    if (!mine.length) return ex
    const sides: Side[] = ex.IsSingleHand ? ['Right', 'Left'] : ['Both']
    const maxSet = Math.max(...mine.map(l => l.SetNumber ?? 1))
    const sets: SetVals[] = Array.from({ length: maxSet }, () => ({}))
    const next: Form = { ...ex }
    for (const l of mine) {
      if (!sides.includes(l.HandSide)) continue
      const left = l.HandSide === 'Left'
      const i = (l.SetNumber ?? 1) - 1
      Object.assign(sets[i], rowToSet(l, left))
      if (i === 0) {
        if (left) { next.NotesLeft = l.Notes ?? ''; next.CompletedLeft = l.Completed ?? false }
        else { next.Notes = l.Notes ?? ''; next.Completed = l.Completed ?? false }
      }
    }
    for (const k of SET_KEYS) next[k] = sets[0][k] ?? null
    next.MoreSets = sets.slice(1)
    return next as T
  })
}

const keyOf = (r: Form) => `${r.ExerciseID}:${r.HandSide}:${r.Occurrence}:${r.SetNumber}`
const CONFLICT = 'CalendarID,ExerciseID,HandSide,Occurrence,SetNumber'

/**
 * Saves the exercise logs of one calendar entry.
 * A row is written for every side of every set that has a value (notes count, on set 1).
 * Existing rows are updated in place (CreatedAt kept), new ones inserted; both by upsert on the
 * unique key, so a repeated save never makes duplicates. Rows of sets 2+ that are no longer in
 * the form (a removed or emptied set) are deleted. Set 1 rows are never deleted, as before.
 * Returns the number of entries that have at least one saved row.
 */
export async function saveExerciseLogs(opts: {
  calendarId: number
  hasExisting: boolean          // false for a calendar row created in this save (no logs yet)
  email: string
  workoutId: number | null | undefined
  forms: Form[]
  now: string
}): Promise<number> {
  const { calendarId, hasExisting, email, workoutId, now } = opts
  const forms = opts.forms.some(f => f.Occurrence == null) ? withOccurrence(opts.forms) : opts.forms

  const rows: Form[] = []
  let saved = 0
  for (const ex of forms) {
    const sides: [Side, boolean][] = ex.IsSingleHand ? [['Right', false], ['Left', true]] : [['Both', false]]
    let any = false
    allSets(ex).forEach((set, i) => {
      for (const [side, left] of sides) {
        const s = left ? 'Left' : ''
        const reps = set[('RepsDone' + s) as SetKey], dur = set[('DurationSec' + s) as SetKey]
        const kg = set[('WeightKG' + s) as SetKey], rpe = set[('RPE' + s) as SetKey]
        const notes = i === 0 ? String((left ? ex.NotesLeft : ex.Notes) ?? '').trim() : ''
        if (!(filled(reps) || filled(dur) || filled(kg) || filled(rpe) || notes)) continue
        any = true
        rows.push({
          Email: email,
          WorkoutID: workoutId ?? null,
          CalendarID: calendarId,
          ExerciseID: ex.ExerciseID,
          HandSide: side,
          Occurrence: ex.Occurrence,
          SetNumber: i + 1,
          RepsDone: ex.isDuration ? null : (Number(reps) || null),
          DurationSec: ex.isDuration ? (Number(dur) || null) : null,
          WeightKG: Number(kg) || null,
          RPE: Number(rpe) || null,
          Notes: notes || null,
          Completed: true,
          UpdatedAt: now,
        })
      }
    })
    if (any) saved++
  }

  let existing: Form[] = []
  if (hasExisting) {
    const { data, error } = await supabase
      .from('ExerciseLogs')
      .select('ExerciseLogID, ExerciseID, HandSide, Occurrence, SetNumber')
      .eq('CalendarID', calendarId)
    if (error) throw error
    existing = data ?? []
  }
  const existingKeys = new Set(existing.map(keyOf))
  const writtenKeys = new Set(rows.map(keyOf))
  const updates = rows.filter(r => existingKeys.has(keyOf(r)))
  const inserts = rows.filter(r => !existingKeys.has(keyOf(r))).map(r => ({ ...r, CreatedAt: now }))

  // sets 2+ of an appearance that is in the form, but no longer has that set
  const inForm = new Set(forms.map(f => `${f.ExerciseID}:${f.Occurrence}`))
  const stale = existing
    .filter(e => (e.SetNumber ?? 1) > 1 && inForm.has(`${e.ExerciseID}:${e.Occurrence ?? 1}`) && !writtenKeys.has(keyOf(e)))
    .map(e => e.ExerciseLogID as number)

  const ops: PromiseLike<{ error: unknown }>[] = []
  if (updates.length) {
    ops.push(supabase.from('ExerciseLogs').upsert(updates, { onConflict: CONFLICT }).select('ExerciseLogID')
      .then(r => ({ error: r.error ?? ((r.data?.length ?? 0) < updates.length ? new Error('עדכון תרגיל נחסם (פחות שורות עודכנו ממה שנשלח)') : null) })))
  }
  if (inserts.length) {
    ops.push(supabase.from('ExerciseLogs').upsert(inserts, { onConflict: CONFLICT }).select('ExerciseLogID')
      .then(r => ({ error: r.error ?? ((r.data?.length ?? 0) < inserts.length ? new Error('הוספת תרגיל נחסמה (פחות שורות נשמרו ממה שנשלח)') : null) })))
  }
  if (stale.length) ops.push(supabase.from('ExerciseLogs').delete().in('ExerciseLogID', stale))
  const failed = (await Promise.all(ops)).find(r => r.error)
  if (failed) throw failed.error
  return saved
}
