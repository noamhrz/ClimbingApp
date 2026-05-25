'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WorkoutExercise, Exercise } from '@/types/workouts'
import ExerciseForm from './ExerciseForm'

interface Props {
  workoutExercise: WorkoutExercise
  exercise: Exercise
  index: number
  onChange: (updates: Partial<WorkoutExercise>) => void
  onRemove: () => void
}

export default function SortableExerciseItem({
  workoutExercise,
  exercise,
  index,
  onChange,
  onRemove,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workoutExercise.WorkoutExerciseID })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute -right-2 -top-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
        {index + 1}
      </div>
      <ExerciseForm
        workoutExercise={workoutExercise}
        exercise={exercise}
        onChange={onChange}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
