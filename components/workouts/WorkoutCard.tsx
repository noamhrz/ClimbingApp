// components/workouts/WorkoutCard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Workout } from '@/types/workouts'
import { duplicateWorkout, deleteWorkout } from '@/lib/workout-api'
import { formatTimeMinutes } from '@/lib/workout-calculations'
import { useActiveUserEmail } from '@/context/AuthContext'

interface Props {
  workout: Workout
  onUpdate: () => void
}

export default function WorkoutCard({ workout, onUpdate }: Props) {
  const router = useRouter()
  const email = useActiveUserEmail()
  const [loading, setLoading] = useState(false)

  const handleDuplicate = async () => {
    if (!email) return
    if (!confirm(`שכפול אימון "${workout.Name}"?`)) return

    setLoading(true)
    try {
      const newId = await duplicateWorkout(workout.WorkoutID, email)
      router.push(`/workouts-editor/${newId}`)
    } catch (error) {
      console.error('Error duplicating workout:', error)
      alert('שגיאה בשכפול אימון')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const message = workout.IsActive
      ? `האם למחוק/להפוך ללא פעיל את "${workout.Name}"?`
      : `האם למחוק לצמיתות את "${workout.Name}"?`
    
    if (!confirm(message)) return

    setLoading(true)
    try {
      await deleteWorkout(workout.WorkoutID)
      onUpdate()
    } catch (error) {
      console.error('Error deleting workout:', error)
      alert('שגיאה במחיקת אימון')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = () => {
    if (workout.containExercise && workout.containClimbing) return '💪🏔️'
    if (workout.containExercise) return '💪'
    if (workout.containClimbing) return '🏔️'
    return '📋'
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${
        !workout.IsActive ? 'opacity-60 border-2 border-gray-300' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{getTypeIcon()}</span>
            <h3 className="text-lg font-bold">{workout.Name}</h3>
          </div>
          <p className="text-sm text-gray-600">{workout.Category}</p>
        </div>
        {!workout.IsActive && (
          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
            לא פעיל
          </span>
        )}
      </div>

      {/* Description */}
      {workout.Description && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">{workout.Description}</p>
      )}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-600 mb-3">
        {workout.containExercise && (
          <div>
            <span className="font-medium">⏱️ {formatTimeMinutes(workout.CalculatedExercisesTime * 60)}</span>
          </div>
        )}
        {workout.containClimbing && (
          <div>
            <span className="font-medium">🏔️ {workout.EstimatedClimbingTime} דק'</span>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex gap-3 text-xs text-gray-500 mb-4">
        {workout.VideoURL && (
          <a
            href={workout.VideoURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-600"
            onClick={(e) => e.stopPropagation()}
          >
            🎬 וידאו
          </a>
        )}
        {workout.WhenToPractice && (
          <span className="flex items-center gap-1">
            📅 {workout.WhenToPractice}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/workouts-editor/${workout.WorkoutID}`)}
          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          disabled={loading}
        >
          ✏️ עריכה
        </button>
        <button
          onClick={handleDuplicate}
          className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
          disabled={loading}
          title="שכפול"
        >
          📋
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 text-sm font-medium disabled:opacity-50"
          disabled={loading}
          title={workout.IsActive ? 'מחק/השבת' : 'מחק לצמיתות'}
        >
          {workout.IsActive ? '😴' : '🗑️'}
        </button>
      </div>
    </div>
  )
}