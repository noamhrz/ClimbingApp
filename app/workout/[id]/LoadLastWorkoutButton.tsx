'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface LoadLastWorkoutButtonProps {
  email: string | null
  workoutId: number
  exerciseForms: any[]
  setExerciseForms: React.Dispatch<React.SetStateAction<any[]>>
  showToast: (text: string, color: string) => void
  formatDate: (dateStr: string) => string
}

export default function LoadLastWorkoutButton({
  email,
  workoutId,
  exerciseForms,
  setExerciseForms,
  showToast,
  formatDate,
}: LoadLastWorkoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleLoadFromLastWorkout = async () => {
    if (!email || !workoutId) {
      showToast('⚠️ חסרים נתונים', 'red')
      return
    }

    setLoading(true)
    try {
      // Step 1: Find last completed Calendar entry with this WorkoutID
      const { data: lastCalendar, error: calError } = await supabase
        .from('Calendar')
        .select('CalendarID, StartTime')
        .eq('Email', email)
        .eq('WorkoutID', workoutId)
        .eq('Completed', true) // Only completed workouts
        .order('StartTime', { ascending: false })
        .limit(1)
        .single()

      if (calError || !lastCalendar) {
        showToast('ℹ️ לא נמצא אימון קודם', 'blue')
        return
      }

      // Step 2: Load ExerciseLogs from that Calendar entry
      const { data: logs, error: logsError } = await supabase
        .from('ExerciseLogs')
        .select('*')
        .eq('CalendarID', lastCalendar.CalendarID)

      if (logsError || !logs || logs.length === 0) {
        showToast('ℹ️ אין נתוני תרגילים באימון הקודם', 'blue')
        return
      }

      // Step 3: Update exerciseForms with data from logs
      setExerciseForms((prev) =>
        prev.map((ex) => {
          const log = logs.find((l) => l.ExerciseID === ex.ExerciseID)
          if (!log) return ex // No data for this exercise

          // Copy data from log to form
          return {
            ...ex,
            RepsDone: log.RepsDone || ex.RepsDone,
            DurationSec: log.DurationSec || ex.DurationSec,
            WeightKG: log.WeightKG || ex.WeightKG,
            RPE: log.RPE || ex.RPE,
            Notes: log.Notes || ex.Notes,
            // For single-hand exercises
            RepsDoneLeft: log.HandSide === 'Left' ? log.RepsDone : ex.RepsDoneLeft,
            DurationSecLeft: log.HandSide === 'Left' ? log.DurationSec : ex.DurationSecLeft,
            WeightKGLeft: log.HandSide === 'Left' ? log.WeightKG : ex.WeightKGLeft,
            RPELeft: log.HandSide === 'Left' ? log.RPE : ex.RPELeft,
            NotesLeft: log.HandSide === 'Left' ? log.Notes : ex.NotesLeft,
          }
        })
      )

      showToast(`✅ נטענו נתונים מ-${formatDate(lastCalendar.StartTime)}`, 'green')
    } catch (err) {
      console.error('❌ שגיאה בטעינת נתונים:', err)
      showToast('❌ שגיאה בטעינה', 'red')
    } finally {
      setLoading(false)
    }
  }

  // Don't show button if no exercises
  if (!exerciseForms || exerciseForms.length === 0) {
    return null
  }

  return (
    <div className="text-center mt-6">
      <button
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
        onClick={handleLoadFromLastWorkout}
        disabled={loading}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>טוען...</span>
          </>
        ) : (
          <>🔄 טען נתונים מאימון אחרון</>
        )}
      </button>
      <p className="text-gray-500 text-sm mt-2">
        ימלא את הטופס בנתונים מהאימון הקודם שלך
      </p>
    </div>
  )
}