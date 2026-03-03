// app/workouts-editor/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { WorkoutFormData } from '@/types/workouts'
import { createWorkout } from '@/lib/workout-api'
import WorkoutForm from '@/components/workouts/WorkoutForm'

export default function NewWorkoutPage() {
  const router = useRouter()
  const { activeUser, loading: authLoading } = useAuth()
  const email = useActiveUserEmail()
  const [userRole, setUserRole] = useState<'admin' | 'coach' | null>(null)
  const [formData, setFormData] = useState<WorkoutFormData>({
    Name: '',
    Category: '',
    Description: '',
    WhenToPractice: '',
    WorkoutNotes: '',
    VideoURL: '',
    containClimbing: false,
    containExercise: false,
    EstimatedClimbingTime: 0,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && !activeUser) {
        router.push('/dashboard')
        return
      }
      if (!email) return

      const { data: user } = await supabase
        .from('Users')
        .select('Role')
        .eq('Email', email)
        .single()

      if (!user || (user.Role !== 'admin' && user.Role !== 'coach')) {
        router.push('/dashboard')
        return
      }

      setUserRole(user.Role)
    }
    checkAuth()
  }, [authLoading, activeUser, email, router])

  const handleSave = async () => {
    if (!email) {
      alert('אין משתמש מחובר')
      return
    }

    // Validation
    if (!formData.Name.trim()) {
      alert('שם האימון חובה')
      return
    }

    if (!formData.containExercise && !formData.containClimbing) {
      if (!confirm('האימון לא כולל תרגילים ולא טיפוס. להמשיך?')) {
        return
      }
    }

    setSaving(true)
    try {
      const newWorkoutId = await createWorkout(formData, email)
      alert('האימון נוצר בהצלחה!')
      
      // If contains exercises, go to edit page to add them
      if (formData.containExercise) {
        router.push(`/workouts-editor/${newWorkoutId}`)
      } else {
        router.push('/workouts-editor')
      }
    } catch (error) {
      console.error('Error creating workout:', error)
      alert('שגיאה ביצירת אימון')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (confirm('האם לבטל את יצירת האימון?')) {
      router.push('/workouts-editor')
    }
  }

  if (!userRole) return null

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">✨ אימון חדש</h1>
        <p className="text-gray-600">צור אימון חדש עבור המתאמנים</p>
      </div>

      {/* Form */}
      <div className="mb-6">
        <WorkoutForm initialData={formData} onChange={setFormData} />
      </div>

      {/* Info Box */}
      {formData.containExercise && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>טיפ:</strong> אחרי יצירת האימון תוכל להוסיף תרגילים ולארגן אותם בבלוקים
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end sticky bottom-6 bg-white p-4 border-t border-gray-200 shadow-lg rounded-lg">
        <button
          onClick={handleCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          disabled={saving}
        >
          ❌ ביטול
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          disabled={saving}
        >
          {saving ? '💾 יוצר...' : '💾 צור אימון'}
        </button>
      </div>
    </div>
  )
}