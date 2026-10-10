'use client'

// Exercise section of the workout editor: holds the unsaved list and saves it to WorkoutsExercises.
// The UI (phone + desktop) lives in ExerciseEditor.

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { WorkoutExerciseWithDetails } from '@/types/workouts'
import { supabase } from '@/lib/supabaseClient'
import ExerciseEditor from './ExerciseEditor'
import { LuSave } from 'react-icons/lu'

export interface WorkoutExercisesHandle {
  saveExercises: () => Promise<boolean>
}

interface Props {
  workoutId: number
  exercises: WorkoutExerciseWithDetails[]
  onUpdate: () => void
}

const WorkoutExercises = forwardRef<WorkoutExercisesHandle, Props>(function WorkoutExercises(
  { workoutId, exercises, onUpdate },
  ref
) {
  const [localExercises, setLocalExercises] = useState<WorkoutExerciseWithDetails[]>(exercises)
  const [emptyBlocks, setEmptyBlocks] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [seen, setSeen] = useState(exercises)

  // Sync from parent only on initial load / after explicit DB reload
  if (exercises !== seen) {
    setSeen(exercises)
    setLocalExercises(exercises)
    setEmptyBlocks([])
  }

  // Always-current ref — avoids stale closure inside saveExercises
  const localExercisesRef = useRef<WorkoutExerciseWithDetails[]>(localExercises)
  useEffect(() => {
    localExercisesRef.current = localExercises
  }, [localExercises])

  const blocks = [...new Set([...localExercises.map(e => e.Block), ...emptyBlocks])].sort((a, b) => a - b)

  const saveExercises = useCallback(async (): Promise<boolean> => {
    const exs = localExercisesRef.current
    setSaving(true)
    try {
      const { error: deleteError } = await supabase
        .from('WorkoutsExercises')
        .delete()
        .eq('WorkoutID', workoutId)

      if (deleteError) throw deleteError

      if (exs.length > 0) {
        const { error: insertError } = await supabase
          .from('WorkoutsExercises')
          .insert(
            exs.map(e => ({
              WorkoutID: workoutId,
              ExerciseID: e.ExerciseID,
              Sets: e.Sets,
              Reps: e.Reps,
              Rest: e.Rest,
              Order: e.Order,
              Block: e.Block,
              Duration: e.Duration,
            }))
          )

        if (insertError) throw insertError
      }

      return true
    } catch (error) {
      console.error('Error saving exercises:', error)
      return false
    } finally {
      setSaving(false)
    }
  }, [workoutId])

  useImperativeHandle(ref, () => ({ saveExercises }), [saveExercises])

  // Save without leaving the editor, then reload IDs from the DB
  const handleSaveClick = async () => {
    const ok = await saveExercises()
    if (ok) onUpdate()
    else alert('שגיאה בשמירת תרגילים')
  }

  return (
    <div>
      <div className="hidden md:flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">תרגילים באימון</h2>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={saving}
          className="px-4 py-2 border border-success text-success rounded-lg hover:bg-success/10 font-bold disabled:opacity-50 text-sm inline-flex items-center gap-1.5"
        >
          <LuSave aria-hidden className="w-[1.1em] h-[1.1em]" />{saving ? 'שומר...' : 'שמור תרגילים (בלי לצאת)'}
        </button>
      </div>
      <ExerciseEditor
        exercises={localExercises}
        blocks={blocks}
        onChange={(exs, empty) => { setLocalExercises(exs); setEmptyBlocks(empty) }}
      />
    </div>
  )
})

export default WorkoutExercises
