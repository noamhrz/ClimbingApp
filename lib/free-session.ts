// Free session ("סשן חופשי"): the trainee picks exercises from the full list and logs them.
// All free sessions are logged under one shared Workouts row (migration 20261025_free_session_workout).
import { supabase } from '@/lib/supabaseClient'

export const FREE_SESSION_CATEGORY = 'סשן חופשי'
/** Calendar / UI color of a free session (purple: distinct from planned, done and deload). */
export const FREE_SESSION_COLOR = '#9B7FE6'

let cached: Promise<number | null> | null = null

/** WorkoutID of the shared free-session workout, or null when the row doesn't exist yet. */
export function getFreeSessionWorkoutId(): Promise<number | null> {
  cached ??= (async () => {
    const { data } = await supabase
      .from('Workouts')
      .select('WorkoutID')
      .eq('Category', FREE_SESSION_CATEGORY)
      .order('WorkoutID')
      .limit(1)
    return data?.[0]?.WorkoutID ?? null
  })().then(id => { if (id == null) cached = null; return id })
  return cached
}

/** URL that opens the workout flow for a free session with these exercises (in this order). */
export const freeSessionHref = (workoutId: number, exerciseIds: number[]) =>
  `/workout/${workoutId}?free=1&ex=${exerciseIds.join(',')}`
