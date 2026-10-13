import { supabase } from '@/lib/supabaseClient'

type Row = Record<string, unknown>
const keyOf = (r: Row) => `${r.ExerciseID}:${r.HandSide}`

/**
 * Inserts new ExerciseLogs rows in one request.
 *
 * Each entry of a workout gets its own log, so an exercise that appears twice gets two rows.
 * If the database still has the old unique constraint on (CalendarID, ExerciseID, HandSide)
 * (`unique_exercise_per_calendar`, removed by supabase/migrations/20261013_exercise_logs_allow_repeats.sql),
 * that insert fails with 23505. Then the save falls back to one log per exercise and side,
 * as before: the last entry wins, and a key this save already writes by update is skipped,
 * so the workout is always saved.
 */
export async function insertExerciseLogs(inserts: Row[], updatedKeys: Set<string>): Promise<{ error: unknown }> {
  if (!inserts.length) return { error: null }
  const first = await supabase.from('ExerciseLogs').insert(inserts)
  if (!first.error || first.error.code !== '23505') return { error: first.error }

  const byKey = new Map<string, Row>()
  for (const r of inserts) if (!updatedKeys.has(keyOf(r))) byKey.set(keyOf(r), r)
  if (!byKey.size) return { error: null }
  console.warn('ExerciseLogs: unique constraint still in the DB — saved one log per exercise and side')
  const retry = await supabase.from('ExerciseLogs').insert([...byKey.values()])
  return { error: retry.error }
}

