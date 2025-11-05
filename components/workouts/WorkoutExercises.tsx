// components/workouts/WorkoutExercises.tsx
'use client'

import { useState } from 'react'
import { WorkoutExerciseWithDetails, Exercise, DEFAULT_WORKOUT_EXERCISE } from '@/types/workouts'
import {
  addExerciseToWorkout,
  updateWorkoutExercise,
  removeExerciseFromWorkout,
  deleteBlock,
} from '@/lib/workout-api'
import BlockContainer from './BlockContainer'
import ExerciseSidebar from './ExerciseSidebar'

interface Props {
  workoutId: number
  exercises: WorkoutExerciseWithDetails[]
  onUpdate: () => void
}

export default function WorkoutExercises({ workoutId, exercises, onUpdate }: Props) {
  const [showSidebar, setShowSidebar] = useState(true)
  const [loading, setLoading] = useState(false)
  const [selectedBlockForAdd, setSelectedBlockForAdd] = useState<number | null>(null)

  // Group exercises by block
  const blocks = exercises.reduce((acc, ex) => {
    if (!acc[ex.Block]) acc[ex.Block] = []
    acc[ex.Block].push(ex)
    return acc
  }, {} as Record<number, WorkoutExerciseWithDetails[]>)

  const blockNumbers = Object.keys(blocks)
    .map(Number)
    .sort((a, b) => a - b)

  const handleAddExercise = async (exercise: Exercise, blockNumber?: number) => {
    setLoading(true)
    try {
      // Determine target block
      let targetBlock: number
      if (blockNumber !== undefined) {
        targetBlock = blockNumber
      } else if (selectedBlockForAdd !== null) {
        targetBlock = selectedBlockForAdd
        setSelectedBlockForAdd(null) // Reset after adding
      } else {
        targetBlock = blockNumbers.length > 0 ? Math.max(...blockNumbers) + 1 : 1
      }
      
      // Get next order number in block
      const blockExercises = blocks[targetBlock] || []
      const nextOrder = blockExercises.length + 1

      // Determine defaults based on exercise type
      const duration = exercise.isDuration ? DEFAULT_WORKOUT_EXERCISE.Duration : null
      const reps = exercise.isDuration ? 1 : DEFAULT_WORKOUT_EXERCISE.Reps

      await addExerciseToWorkout(
        workoutId,
        exercise.ExerciseID,
        targetBlock,
        nextOrder,
        DEFAULT_WORKOUT_EXERCISE.Sets,
        reps,
        duration,
        DEFAULT_WORKOUT_EXERCISE.Rest
      )

      onUpdate()
    } catch (error) {
      console.error('Error adding exercise:', error)
      alert('שגיאה בהוספת תרגיל')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateExercise = async (exerciseId: number, updates: any) => {
    try {
      await updateWorkoutExercise(exerciseId, updates)
      // Don't need to call onUpdate for every change - too many requests
      // The local state updates via ExerciseForm onChange
    } catch (error) {
      console.error('Error updating exercise:', error)
      alert('שגיאה בעדכון תרגיל')
      onUpdate() // Refresh on error
    }
  }

  const handleRemoveExercise = async (exerciseId: number) => {
    if (!confirm('האם להסיר תרגיל זה?')) return
    
    setLoading(true)
    try {
      await removeExerciseFromWorkout(exerciseId)
      onUpdate()
    } catch (error) {
      console.error('Error removing exercise:', error)
      alert('שגיאה בהסרת תרגיל')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBlock = async (blockNumber: number) => {
    if (!confirm(`האם למחוק את בלוק ${blockNumber} עם כל התרגילים?`)) return
    
    setLoading(true)
    try {
      await deleteBlock(workoutId, blockNumber)
      onUpdate()
    } catch (error) {
      console.error('Error deleting block:', error)
      alert('שגיאה במחיקת בלוק')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNewBlock = () => {
    const newBlockNumber = blockNumbers.length > 0 ? Math.max(...blockNumbers) + 1 : 1
    setSelectedBlockForAdd(newBlockNumber)
    // Highlight sidebar or show message
    alert(`בלוק ${newBlockNumber} יווצר כשתוסיף תרגיל ראשון מהסיידבר 👉`)
  }

  return (
    <div className="flex gap-6 relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">עובד...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">תרגילים באימון</h2>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-sm text-blue-600 hover:underline md:hidden"
          >
            {showSidebar ? 'הסתר' : 'הצג'} תרגילים זמינים
          </button>
        </div>

        {blockNumbers.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
            <p className="text-gray-600 mb-2 text-lg font-medium">עדיין אין תרגילים באימון</p>
            <p className="text-sm text-gray-500 mb-4">
              👉 לחץ על תרגיל מהצד כדי להתחיל
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {blockNumbers.map((blockNum) => (
              <BlockContainer
                key={blockNum}
                blockNumber={blockNum}
                exercises={blocks[blockNum]}
                onUpdateExercise={handleUpdateExercise}
                onRemoveExercise={handleRemoveExercise}
                onDeleteBlock={() => handleDeleteBlock(blockNum)}
                onAddExercise={() => {
                  setSelectedBlockForAdd(blockNum)
                  alert(`לחץ על תרגיל מהסיידבר כדי להוסיף לבלוק ${blockNum} 👉`)
                }}
              />
            ))}

            {/* Add New Block */}
            <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
              <p className="text-gray-700 mb-3">
                💡 <strong>רוצה להוסיף בלוק חדש?</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                פשוט לחץ על תרגיל מהצד והוא יתווסף לבלוק {blockNumbers.length > 0 ? Math.max(...blockNumbers) + 1 : 1} החדש
              </p>
              <button
                onClick={handleAddNewBlock}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                disabled={loading}
              >
                + מוכן להוסיף בלוק {blockNumbers.length > 0 ? Math.max(...blockNumbers) + 1 : 1}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className={`hidden md:block ${selectedBlockForAdd !== null ? 'ring-4 ring-blue-500 rounded-lg' : ''}`}>
          <ExerciseSidebar
            onAddExercise={(exercise) => {
              handleAddExercise(exercise, selectedBlockForAdd || undefined)
            }}
          />
        </div>
      )}
    </div>
  )
}