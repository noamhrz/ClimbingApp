// app/workouts-editor/[id]/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { WorkoutFormData, WorkoutWithExercises } from '@/types/workouts'
import { fetchWorkoutWithExercises, updateWorkout } from '@/lib/workout-api'
import AssignToSheet from '@/components/coach/AssignToSheet'
import WorkoutForm from '@/components/workouts/WorkoutForm'
import WorkoutExercises, { WorkoutExercisesHandle } from '@/components/workouts/WorkoutExercises'
import { LuCircleX, LuPencil, LuSave, LuUserPlus } from 'react-icons/lu'

export default function EditWorkoutPage() {
  const [showAssign, setShowAssign] = useState(false)
  const [tab, setTab] = useState<'ex' | 'info' | null>(null)   // phone only; null = default for this workout
  const params = useParams()
  const router = useRouter()
  const { loading: authLoading, currentUser } = useAuth()
  const signedInEmail = currentUser?.Email
  const workoutId = Number(params?.id)

  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null)
  const [formData, setFormData] = useState<WorkoutFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'coach' | null>(null)
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null)
  const exercisesRef = useRef<WorkoutExercisesHandle>(null)

  useEffect(() => {
    // permissions follow the signed-in coach, not the trainee being viewed
    const checkAuth = async () => {
      if (!authLoading && !currentUser) {
        router.push('/dashboard')
        return
      }
      if (!signedInEmail) return

      const { data: user } = await supabase
        .from('Users')
        .select('Role')
        .eq('Email', signedInEmail)
        .single()

      if (!user || (user.Role !== 'admin' && user.Role !== 'coach')) {
        router.push('/dashboard')
        return
      }

      setUserRole(user.Role)
    }
    checkAuth()
  }, [authLoading, currentUser, signedInEmail, router])

  useEffect(() => {
    if (workoutId && userRole) {
      loadWorkout()
    }
  }, [workoutId, userRole])

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
        EstimatedTotalTime: data.EstimatedTotalTime,
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
    } catch (error) {
      console.error('Error auto-saving:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSave = async () => {
    if (!formData) return

    if (!formData.Name.trim()) {
      alert('שם האימון חובה')
      return
    }

    setSaving(true)
    try {
      await updateWorkout(workoutId, formData)

      if (formData.containExercise && exercisesRef.current) {
        const ok = await exercisesRef.current.saveExercises()
        if (!ok) {
          alert('שגיאה בשמירת תרגילים')
          return
        }
      }

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

  if (!userRole) return null

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-fg-3">טוען אימון...</p>
        </div>
      </div>
    )
  }

  if (!workout || !formData) {
    return null
  }

  const phoneTab = tab ?? (formData.containExercise ? 'ex' : 'info')

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="hidden md:block text-3xl font-bold mb-2"><LuPencil aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />עריכת אימון</h1>
          <p className="hidden md:block text-fg-3">עורך את: {workout.Name}</p>
          <p className="md:hidden text-xs text-muted">עריכת אימון</p>
          <h1 className="md:hidden text-xl font-extrabold truncate">{formData.Name || workout.Name}</h1>
        </div>
        {autoSaving && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-line-strong"></div>
            <span>שומר אוטומטית...</span>
          </div>
        )}
      </div>

      {/* Phone: tabs between the exercises and the workout details */}
      <div role="tablist" aria-label="חלקי העורך" className="md:hidden grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 mb-4">
        {([['ex', 'תרגילים'], ['info', 'פרטי האימון']] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={phoneTab === k} onClick={() => setTab(k)}
            className={`h-10 rounded-[9px] text-[15px] font-extrabold ${phoneTab === k ? 'bg-accent text-on-accent' : 'text-fg-2'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Basic Info Form */}
      <div className={`mb-6 ${phoneTab === 'info' ? '' : 'hidden md:block'}`}>
        <WorkoutForm initialData={formData} onChange={setFormData} />
      </div>

      {phoneTab === 'ex' && !formData.containExercise && (
        <div className="md:hidden mb-6 rounded-2xl border-2 border-dashed border-line p-6 text-center text-fg-3">
          האימון לא כולל תרגילים. אפשר להפעיל את זה בלשונית ״פרטי האימון״.
        </div>
      )}

      {/* Exercises Section */}
      {formData.containExercise && (
        <div className={`mb-6 ${phoneTab === 'ex' ? '' : 'hidden md:block'}`}>
          <WorkoutExercises
            ref={exercisesRef}
            workoutId={workoutId}
            exercises={workout.exercises}
            onUpdate={handleExercisesUpdate}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 sm:gap-3 justify-end sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-6 z-10 bg-surface p-2.5 sm:p-4 border-t border-line rounded-lg">
        <button
          onClick={() => setShowAssign(true)}
          className="me-auto px-3 sm:px-5 py-3 border border-accent text-accent rounded-lg hover:bg-accent/10 font-bold inline-flex items-center gap-1.5 whitespace-nowrap text-sm sm:text-base"
        >
          <LuUserPlus aria-hidden className="w-[1.1em] h-[1.1em]" />הקצה<span className="hidden sm:inline"> למתאמנים</span>
        </button>
        <button
          onClick={handleCancel}
          className="px-3 sm:px-6 py-3 border border-line rounded-lg hover:bg-surface font-medium whitespace-nowrap text-sm sm:text-base"
          disabled={saving}
        >
          <LuCircleX aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />סגור
        </button>
        <button
          onClick={handleSave}
          className="px-3 sm:px-6 py-3 bg-accent text-on-accent rounded-lg hover:bg-accent-hover font-bold disabled:opacity-50 whitespace-nowrap text-sm sm:text-base"
          disabled={saving}
        >
          {saving ? <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שומר...</> : <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שמור וסגור</>}
        </button>
      </div>
      <AssignToSheet isOpen={showAssign} onClose={() => setShowAssign(false)} workoutId={workoutId} workoutName={formData.Name || workout.Name} />
    </div>
  )
}