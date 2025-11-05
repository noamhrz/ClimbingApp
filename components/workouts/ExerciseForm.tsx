// components/workouts/ExerciseForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { WorkoutExercise, Exercise, DEFAULT_WORKOUT_EXERCISE } from '@/types/workouts'
import { calculateExerciseTime, formatTimeMinutes, formatRestTime } from '@/lib/workout-calculations'

interface Props {
  workoutExercise: WorkoutExercise
  exercise: Exercise
  onChange: (updates: Partial<WorkoutExercise>) => void
  onRemove: () => void
  dragHandleProps?: any
}

export default function ExerciseForm({
  workoutExercise,
  exercise,
  onChange,
  onRemove,
  dragHandleProps,
}: Props) {
  const [localData, setLocalData] = useState(workoutExercise)

  useEffect(() => {
    setLocalData(workoutExercise)
  }, [workoutExercise])

  const handleChange = (field: keyof WorkoutExercise, value: any) => {
    const updated = { ...localData, [field]: value }
    setLocalData(updated)
    onChange({ [field]: value })
  }

  const estimatedTime = calculateExerciseTime(localData, exercise)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow group">
      {/* Header with drag handle */}
      <div className="flex items-center gap-2 mb-3">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
        </div>

        {/* Exercise Name */}
        <div className="flex-1">
          <div className="font-medium text-sm">{exercise.Name}</div>
          <div className="text-xs text-gray-500">
            {exercise.Category}
            {exercise.IsSingleHand && (
              <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                Single Hand
              </span>
            )}
            {exercise.isDuration && (
              <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                Duration
              </span>
            )}
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 transition-opacity"
          title="הסר תרגיל"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-4 gap-2">
        {/* Sets */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">סטים</label>
          <input
            type="number"
            value={localData.Sets}
            onChange={(e) => handleChange('Sets', parseInt(e.target.value) || 0)}
            min="1"
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        {/* Reps or Duration */}
        {exercise.isDuration ? (
          <div>
            <label className="block text-xs text-gray-600 mb-1">זמן (שניות)</label>
            <input
              type="number"
              value={localData.Duration || DEFAULT_WORKOUT_EXERCISE.Duration}
              onChange={(e) => {
                handleChange('Duration', parseInt(e.target.value) || 0)
                handleChange('Reps', 1) // Auto set Reps to 1 for duration
              }}
              min="1"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-600 mb-1">חזרות</label>
            <input
              type="number"
              value={localData.Reps}
              onChange={(e) => handleChange('Reps', parseInt(e.target.value) || 0)}
              min="1"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        )}

        {/* Rest */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-600 mb-1">מנוחה</label>
          <div className="flex gap-1">
            <input
              type="number"
              value={localData.Rest}
              onChange={(e) => handleChange('Rest', parseInt(e.target.value) || 0)}
              min="0"
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
            <span className="text-xs text-gray-500 self-center whitespace-nowrap">
              {formatRestTime(localData.Rest)}
            </span>
          </div>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 flex items-center justify-between">
        <span>⏱️ זמן משוער:</span>
        <span className="font-medium">{formatTimeMinutes(estimatedTime)}</span>
      </div>
    </div>
  )
}