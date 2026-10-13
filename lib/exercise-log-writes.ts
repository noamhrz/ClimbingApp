import { supabase } from '@/lib/supabaseClient'

type Row = Record<string, unknown>
const keyOf = (r: Row) => `${r.ExerciseID}:${r.HandSide}`

/**
 * Inserts new ExerciseLogs rows.
 *
 * Temporary rule (until the "same exercise twice" design is settled): one log per
 * calendar entry + exercise + hand side, as the DB constraint unique_exercise_per_calendar
 * requires. If an exercise appears twice, the last entry wins, and a key this save already
 * writes by update is not inserted again.
 * If the batch still hits a duplicate (23505), rows are inserted one by one and duplicates
 * are skipped, so the workout is always saved.
 */
export async function insertExerciseLogs(inserts: Row[], updatedKeys: Set<string>): Promise<{ error: unknown }> {
  const byKey = new Map<string, Row>()
  for (const r of inserts) if (!updatedKeys.has(keyOf(r))) byKey.set(keyOf(r), r)
  const rows = [...byKey.values()]
  if (!rows.length) return { error: null }

  const batch = await supabase.from('ExerciseLogs').insert(rows)
  if (!batch.error || batch.error.code !== '23505') return { error: batch.error }

  for (const r of rows) {
    const one = await supabase.from('ExerciseLogs').insert(r)
    if (one.error && one.error.code !== '23505') return { error: one.error }
    if (one.error) console.warn('ExerciseLogs: skipped a duplicate log', keyOf(r))
  }
  return { error: null }
}
