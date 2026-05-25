'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { WorkoutExerciseWithDetails } from '@/types/workouts'
import SortableExerciseItem from './SortableExerciseItem'

interface Props {
  blockNumber: number
  exercises: WorkoutExerciseWithDetails[]
  onUpdateExercise: (exerciseId: number, updates: any) => void
  onRemoveExercise: (exerciseId: number) => void
  onDeleteBlock: () => void
  onAddExercise: () => void
  isSelectedForAdd?: boolean
}

export default function BlockContainer({
  blockNumber,
  exercises,
  onUpdateExercise,
  onRemoveExercise,
  onDeleteBlock,
  onAddExercise,
  isSelectedForAdd,
}: Props) {
  const sortedExercises = [...exercises].sort((a, b) => a.Order - b.Order)

  const { setNodeRef, isOver } = useDroppable({ id: `block-${blockNumber}` })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-4 border-2 transition-colors ${
        isOver || isSelectedForAdd
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">📌 בלוק {blockNumber}</h3>
        <button
          onClick={onDeleteBlock}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          🗑️ מחק בלוק
        </button>
      </div>

      {/* Exercises */}
      <SortableContext
        items={sortedExercises.map(e => e.WorkoutExerciseID)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {sortedExercises.length === 0 && (
            <div className="py-6 text-center text-gray-400 text-sm border border-dashed border-gray-300 rounded-lg">
              גרור תרגיל לכאן
            </div>
          )}

          {sortedExercises.map((ex, index) => (
            <SortableExerciseItem
              key={ex.WorkoutExerciseID}
              workoutExercise={ex}
              exercise={ex.Exercise}
              index={index}
              onChange={(updates) => onUpdateExercise(ex.WorkoutExerciseID, updates)}
              onRemove={() => onRemoveExercise(ex.WorkoutExerciseID)}
            />
          ))}

          <button
            onClick={onAddExercise}
            className={`w-full border-2 border-dashed rounded-lg py-3 text-sm transition-colors ${
              isSelectedForAdd
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-600'
            }`}
          >
            {isSelectedForAdd ? '👉 בחר תרגיל מהסיידבר' : `+ הוסף תרגיל לבלוק ${blockNumber}`}
          </button>
        </div>
      </SortableContext>
    </div>
  )
}
