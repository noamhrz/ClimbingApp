// utils/copyPreviousWorkout.ts
import { supabase } from '@/lib/supabaseClient'

export interface CopyPreviousWorkoutResult {
  success: boolean
  message: string
}

/**
 * Marks a Calendar entry as completed by copying ExerciseLogs from the most
 * recent previous completed session of the same workout.
 *
 * Steps:
 * 1. Fetch the WorkoutID for the target CalendarID
 * 2. Find last completed Calendar entry with same WorkoutID (excluding current)
 * 3. Copy ExerciseLogs from that session to the target CalendarID
 * 4. Mark the target Calendar entry as Completed = true
 */
export async function copyPreviousWorkout(
  calendarId: number,
  email: string
): Promise<CopyPreviousWorkoutResult> {
  // Step 1: Get the WorkoutID for this calendar entry
  const { data: currentEntry, error: entryError } = await supabase
    .from('Calendar')
    .select('WorkoutID')
    .eq('CalendarID', calendarId)
    .single()

  if (entryError || !currentEntry) {
    return { success: false, message: 'לא נמצא אימון ביומן' }
  }

  // Step 2: Find the last completed session with the same WorkoutID
  const { data: lastCalendar, error: calError } = await supabase
    .from('Calendar')
    .select('CalendarID, StartTime')
    .eq('Email', email)
    .eq('WorkoutID', currentEntry.WorkoutID)
    .eq('Completed', true)
    .neq('CalendarID', calendarId)
    .order('StartTime', { ascending: false })
    .limit(1)
    .single()

  if (calError || !lastCalendar) {
    return { success: false, message: 'לא נמצא אימון קודם שהושלם' }
  }

  // Step 3: Load ExerciseLogs from that session
  const { data: logs, error: logsError } = await supabase
    .from('ExerciseLogs')
    .select('ExerciseID, RepsDone, DurationSec, WeightKG, RPE, Notes, HandSide')
    .eq('CalendarID', lastCalendar.CalendarID)

  if (logsError) {
    return { success: false, message: 'שגיאה בטעינת נתוני תרגילים' }
  }

  // Step 4: Insert copied logs for the target CalendarID (if any exist)
  if (logs && logs.length > 0) {
    const newLogs = logs.map((log) => ({
      CalendarID: calendarId,
      Email: email,
      ExerciseID: log.ExerciseID,
      RepsDone: log.RepsDone,
      DurationSec: log.DurationSec,
      WeightKG: log.WeightKG,
      RPE: log.RPE,
      Notes: log.Notes,
      HandSide: log.HandSide,
    }))

    const { error: insertError } = await supabase
      .from('ExerciseLogs')
      .insert(newLogs)

    if (insertError) {
      return { success: false, message: 'שגיאה בשמירת נתוני תרגילים' }
    }
  }

  // Step 5: Mark the target Calendar entry as Completed
  const { error: updateError } = await supabase
    .from('Calendar')
    .update({ Completed: true })
    .eq('CalendarID', calendarId)

  if (updateError) {
    return { success: false, message: 'שגיאה בסימון האימון כבוצע' }
  }

  return { success: true, message: 'האימון סומן כבוצע עם נתוני האימון הקודם' }
}
