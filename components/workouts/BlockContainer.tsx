// components/workouts/BlockContainer.tsx
'use client'

import { WorkoutExerciseWithDetails } from '@/types/workouts'
import ExerciseForm from './ExerciseForm'

interface Props {
  blockNumber: number
  exercises: WorkoutExerciseWithDetails[]
  onUpdateExercise: (exerciseId: number, updates: any) => void
  onRemoveExercise: (exerciseId: number) => void
  onDeleteBlock: () => void
  onAddExercise: () => void
}

export default function BlockContainer({
  blockNumber,
  exercises,
  onUpdateExercise,
  onRemoveExercise,
  onDeleteBlock,
  onAddExercise,
}: Props) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      {/* Block Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">📌 בלוק {blockNumber}</h3>
        <button
          onClick={onDeleteBlock}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
          title="מחק בלוק"
        >
          🗑️ מחק בלוק
        </button>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {exercises.map((ex, index) => (
          <div key={ex.WorkoutExerciseID} className="relative">
            {/* Order Badge */}
            <div className="absolute -right-2 -top-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
              {index + 1}
            </div>
            
            <ExerciseForm
              workoutExercise={ex}
              exercise={ex.Exercise}
              onChange={(updates) => onUpdateExercise(ex.WorkoutExerciseID, updates)}
              onRemove={() => onRemoveExercise(ex.WorkoutExerciseID)}
            />
          </div>
        ))}

        {/* Add Exercise Button */}
        <button
          onClick={onAddExercise}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          + הוסף תרגיל
        </button>
      </div>
    </div>
  )
}