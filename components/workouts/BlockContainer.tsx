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
  onSelectBlock: () => void
  isSelectedForAdd?: boolean
}

export default function BlockContainer({
  blockNumber,
  exercises,
  onUpdateExercise,
  onRemoveExercise,
  onDeleteBlock,
  onAddExercise,
  onSelectBlock,
  isSelectedForAdd,
}: Props) {
  const sortedExercises = [...exercises].sort((a, b) => a.Order - b.Order)

  const { setNodeRef, isOver } = useDroppable({ id: `block-${blockNumber}` })

  return (
    <div
      ref={setNodeRef}
      onPointerDownCapture={onSelectBlock}
      className={`rounded-lg p-4 border-2 transition-colors ${
 isOver || isSelectedForAdd
 ? 'border-accent bg-accent/15'
 : 'border-line bg-surface'
 }`}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">📌 בלוק {blockNumber}</h3>
        <button
          onClick={onDeleteBlock}
          className="text-danger hover:text-danger/90 text-sm font-medium"
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
            <div className="py-6 text-center text-faint text-sm border border-dashed border-line rounded-lg">
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
 ? 'border-accent text-accent bg-accent/15'
 : 'border-line text-muted hover:border-accent/90 hover:text-accent/90'
 }`}
          >
            {isSelectedForAdd ? '👉 בחר תרגיל מהסיידבר' : `+ הוסף תרגיל לבלוק ${blockNumber}`}
          </button>
        </div>
      </SortableContext>
    </div>
  )
}
