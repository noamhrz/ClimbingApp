// app/workouts-editor/[id]/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useActiveUserEmail } from '@/context/AuthContext'
import { WorkoutFormData, WorkoutWithExercises } from '@/types/workouts'
import { fetchWorkoutWithExercises, updateWorkout } from '@/lib/workout-api'
import WorkoutForm from '@/components/workouts/WorkoutForm'
import WorkoutExercises from '@/components/workouts/WorkoutExercises'

export default function EditWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const email = useActiveUserEmail()
  const workoutId = Number(params?.id)

  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null)
  const [formData, setFormData] = useState<WorkoutFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (workoutId) {
      loadWorkout()
    }
  }, [workoutId])

  const loadWorkout = async () => {
    setLoading(true)
    try {
      const data = await fetchWorkoutWithExercises(workoutId)
      if (!data) {
        alert('אימון לא נמצא')
        router.push('/workouts-editor')
        return
      }
      setWorkout(data)
      setFormData({
        Name: data.Name,
        Category: data.Category,
        Description: data.Description || '',
        WhenToPractice: data.WhenToPractice || '',
        WorkoutNotes: data.WorkoutNotes || '',
        VideoURL: data.VideoURL || '',
        containClimbing: data.containClimbing,
        containExercise: data.containExercise,
        EstimatedClimbingTime: data.EstimatedClimbingTime,
      })
    } catch (error) {
      console.error('Error loading workout:', error)
      alert('שגיאה בטעינת אימון')
      router.push('/workouts-editor')
    } finally {
      setLoading(false)
    }
  }

  // Auto-save when formData changes
  useEffect(() => {
    if (!formData || !workout) return

    // Clear existing timeout
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current)
    }

    // Set new timeout for auto-save (2 seconds after last change)
    autoSaveTimeout.current = setTimeout(() => {
      autoSaveWorkout()
    }, 2000)

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current)
      }
    }
  }, [formData])

  const autoSaveWorkout = async () => {
    if (!formData) return

    setAutoSaving(true)
    try {
      await updateWorkout(workoutId, formData)
      console.log('✅ Auto-saved workout details')
    } catch (error) {
      console.error('Error auto-saving:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSave = async () => {
    if (!formData) return

    // Validation
    if (!formData.Name.trim()) {
      alert('שם האימון חובה')
      return
    }

    setSaving(true)
    try {
      await updateWorkout(workoutId, formData)
      alert('האימון נשמר בהצלחה!')
      router.push('/workouts-editor')
    } catch (error) {
      console.error('Error saving workout:', error)
      alert('שגיאה בשמירת אימון')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (confirm('האם לבטל את השינויים?')) {
      router.push('/workouts-editor')
    }
  }

  // Reload only exercises, not the whole form
  const handleExercisesUpdate = useCallback(async () => {
    try {
      const data = await fetchWorkoutWithExercises(workoutId)
      if (data) {
        setWorkout(data)
        // Don't update formData - keep user's unsaved changes!
      }
    } catch (error) {
      console.error('Error reloading exercises:', error)
    }
  }, [workoutId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">טוען אימון...</p>
        </div>
      </div>
    )
  }

  if (!workout || !formData) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">✏️ עריכת אימון</h1>
          <p className="text-gray-600">עורך את: {workout.Name}</p>
        </div>
        {autoSaving && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            <span>שומר אוטומטית...</span>
          </div>
        )}
      </div>

      {/* Basic Info Form */}
      <div className="mb-6">
        <WorkoutForm initialData={formData} onChange={setFormData} />
      </div>

      {/* Exercises Section */}
      {formData.containExercise && (
        <div className="mb-6">
          <WorkoutExercises
            workoutId={workoutId}
            exercises={workout.exercises}
            onUpdate={handleExercisesUpdate}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end sticky bottom-6 bg-white p-4 border-t border-gray-200 shadow-lg rounded-lg">
        <button
          onClick={handleCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          disabled={saving}
        >
          ❌ סגור
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          disabled={saving}
        >
          {saving ? '💾 שומר...' : '💾 שמור וסגור'}
        </button>
      </div>
    </div>
  )
}