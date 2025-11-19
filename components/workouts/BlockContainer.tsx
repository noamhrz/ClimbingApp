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
  onMoveBlockUp?: () => void      // NEW
  onMoveBlockDown?: () => void    // NEW
  onMoveExerciseUp?: (exerciseId: number) => void    // NEW
  onMoveExerciseDown?: (exerciseId: number) => void  // NEW
  isFirstBlock?: boolean          // NEW
  isLastBlock?: boolean           // NEW
}

export default function BlockContainer({
  blockNumber,
  exercises,
  onUpdateExercise,
  onRemoveExercise,
  onDeleteBlock,
  onAddExercise,
  onMoveBlockUp,       // NEW
  onMoveBlockDown,     // NEW
  onMoveExerciseUp,    // NEW
  onMoveExerciseDown,  // NEW
  isFirstBlock,        // NEW
  isLastBlock,         // NEW
}: Props) {
  // Sort exercises by Order
  const sortedExercises = [...exercises].sort((a, b) => a.Order - b.Order)

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      {/* Block Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold">📌 בלוק {blockNumber}</h3>
          
          {/* NEW: Block Move Buttons */}
          {(onMoveBlockUp || onMoveBlockDown) && (
            <div className="flex gap-1">
              <button
                onClick={onMoveBlockUp}
                disabled={isFirstBlock}
                className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="הזז בלוק למעלה"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={onMoveBlockDown}
                disabled={isLastBlock}
                className="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="הזז בלוק למטה"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
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
        {sortedExercises.map((ex, index) => (
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
              onMoveUp={onMoveExerciseUp ? () => onMoveExerciseUp(ex.WorkoutExerciseID) : undefined}
              onMoveDown={onMoveExerciseDown ? () => onMoveExerciseDown(ex.WorkoutExerciseID) : undefined}
              isFirst={index === 0}
              isLast={index === sortedExercises.length - 1}
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