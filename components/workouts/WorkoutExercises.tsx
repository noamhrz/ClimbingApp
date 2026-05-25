'use client'

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { WorkoutExerciseWithDetails, Exercise, DEFAULT_WORKOUT_EXERCISE } from '@/types/workouts'
import { supabase } from '@/lib/supabaseClient'
import BlockContainer from './BlockContainer'
import ExerciseSidebar from './ExerciseSidebar'

export interface WorkoutExercisesHandle {
  saveExercises: () => Promise<boolean>
}

interface Props {
  workoutId: number
  exercises: WorkoutExerciseWithDetails[]
  onUpdate: () => void
}

const WorkoutExercises = forwardRef<WorkoutExercisesHandle, Props>(function WorkoutExercises(
  { workoutId, exercises, onUpdate },
  ref
) {
  const [localExercises, setLocalExercises] = useState<WorkoutExerciseWithDetails[]>(exercises)
  const [showSidebar, setShowSidebar] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null)

  // Always-current ref — avoids stale closure inside saveExercises
  const localExercisesRef = useRef<WorkoutExerciseWithDetails[]>(localExercises)
  useEffect(() => {
    localExercisesRef.current = localExercises
  }, [localExercises])

  // Sync from parent only on initial load / after explicit DB reload
  useEffect(() => {
    setLocalExercises(exercises)
  }, [exercises])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const blockMap = localExercises.reduce((acc, ex) => {
    if (!acc[ex.Block]) acc[ex.Block] = []
    acc[ex.Block].push(ex)
    return acc
  }, {} as Record<number, WorkoutExerciseWithDetails[]>)

  const blockNumbers = Object.keys(blockMap).map(Number).sort((a, b) => a - b)
  const nextBlock = blockNumbers.length > 0 ? Math.max(...blockNumbers) + 1 : 1

  const handleAddExercise = (exercise: Exercise, blockNumber?: number) => {
    const targetBlock = blockNumber ?? nextBlock
    setSelectedBlock(null)
    const blockExes = blockMap[targetBlock] ?? []

    setLocalExercises(prev => [
      ...prev,
      {
        WorkoutExerciseID: -(Date.now()),
        WorkoutID: workoutId,
        ExerciseID: exercise.ExerciseID,
        Sets: DEFAULT_WORKOUT_EXERCISE.Sets,
        Reps: exercise.isDuration ? 1 : DEFAULT_WORKOUT_EXERCISE.Reps,
        Duration: exercise.isDuration ? DEFAULT_WORKOUT_EXERCISE.Duration : null,
        Rest: DEFAULT_WORKOUT_EXERCISE.Rest,
        Order: blockExes.length + 1,
        Block: targetBlock,
        Exercise: exercise,
      },
    ])
  }

  const handleUpdateExercise = (exerciseId: number, updates: Partial<WorkoutExerciseWithDetails>) => {
    setLocalExercises(prev =>
      prev.map(e => e.WorkoutExerciseID === exerciseId ? { ...e, ...updates } : e)
    )
  }

  const handleRemoveExercise = (exerciseId: number) => {
    if (!confirm('האם להסיר תרגיל זה?')) return
    setLocalExercises(prev => {
      const removedEx = prev.find(e => e.WorkoutExerciseID === exerciseId)
      if (!removedEx) return prev
      const filtered = prev.filter(e => e.WorkoutExerciseID !== exerciseId)
      const block = removedEx.Block
      const blockExes = filtered.filter(e => e.Block === block).sort((a, b) => a.Order - b.Order)
      return filtered.map(e => {
        if (e.Block !== block) return e
        return { ...e, Order: blockExes.findIndex(b => b.WorkoutExerciseID === e.WorkoutExerciseID) + 1 }
      })
    })
  }

  const handleDeleteBlock = (blockNumber: number) => {
    if (!confirm(`האם למחוק את בלוק ${blockNumber} עם כל התרגילים?`)) return
    setLocalExercises(prev => prev.filter(e => e.Block !== blockNumber))
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const activeId = active.id as number
    const overId = over.id

    // Dropped on a block droppable (empty area between exercises or block padding)
    if (typeof overId === 'string' && overId.startsWith('block-')) {
      const targetBlock = parseInt(overId.replace('block-', ''))
      setLocalExercises(prev => {
        const activeEx = prev.find(e => e.WorkoutExerciseID === activeId)
        if (!activeEx || activeEx.Block === targetBlock) return prev

        const targetBlockExes = prev
          .filter(e => e.Block === targetBlock)
          .sort((a, b) => a.Order - b.Order)

        let result = prev.map(e =>
          e.WorkoutExerciseID === activeId
            ? { ...e, Block: targetBlock, Order: targetBlockExes.length + 1 }
            : e
        )

        // Renumber source block
        const sourceBlock = activeEx.Block
        const sourceExes = result.filter(e => e.Block === sourceBlock).sort((a, b) => a.Order - b.Order)
        sourceExes.forEach((e, i) => {
          const idx = result.findIndex(r => r.WorkoutExerciseID === e.WorkoutExerciseID)
          if (idx !== -1) result[idx] = { ...result[idx], Order: i + 1 }
        })

        return [...result]
      })
      return
    }

    // Dropped on another exercise — all reads from prev to avoid stale closure
    setLocalExercises(prev => {
      const activeEx = prev.find(e => e.WorkoutExerciseID === activeId)
      const overEx = prev.find(e => e.WorkoutExerciseID === Number(overId))
      if (!activeEx || !overEx) return prev

      if (activeEx.Block === overEx.Block) {
        // Same block — reorder
        const block = activeEx.Block
        const blockExes = prev.filter(e => e.Block === block).sort((a, b) => a.Order - b.Order)
        const oldIdx = blockExes.findIndex(e => e.WorkoutExerciseID === activeId)
        const newIdx = blockExes.findIndex(e => e.WorkoutExerciseID === Number(overId))
        if (oldIdx === newIdx) return prev

        const reordered = arrayMove(blockExes, oldIdx, newIdx).map((e, i) => ({ ...e, Order: i + 1 }))
        return prev.map(e => reordered.find(r => r.WorkoutExerciseID === e.WorkoutExerciseID) || e)
      }

      // Cross-block — move to target block at specific position
      const targetBlock = overEx.Block
      const targetBlockExes = prev
        .filter(e => e.Block === targetBlock && e.WorkoutExerciseID !== activeId)
        .sort((a, b) => a.Order - b.Order)
      const overIdx = targetBlockExes.findIndex(e => e.WorkoutExerciseID === Number(overId))
      const insertAt = overIdx === -1 ? targetBlockExes.length : overIdx

      const newTargetBlock = [
        ...targetBlockExes.slice(0, insertAt),
        { ...activeEx, Block: targetBlock },
        ...targetBlockExes.slice(insertAt),
      ].map((e, i) => ({ ...e, Order: i + 1 }))

      const sourceExes = prev
        .filter(e => e.Block === activeEx.Block && e.WorkoutExerciseID !== activeId)
        .sort((a, b) => a.Order - b.Order)
        .map((e, i) => ({ ...e, Order: i + 1 }))

      return [
        ...prev.filter(e => e.Block !== targetBlock && e.Block !== activeEx.Block),
        ...newTargetBlock,
        ...sourceExes,
      ]
    })
  }

  // Reads from ref so it's always up-to-date regardless of render cycle
  const saveExercises = useCallback(async (): Promise<boolean> => {
    const exs = localExercisesRef.current
    console.log('Saving exercises:', JSON.stringify(exs.map(e => ({ id: e.ExerciseID, block: e.Block, order: e.Order }))))
    setSaving(true)
    try {
      const { error: deleteError } = await supabase
        .from('WorkoutsExercises')
        .delete()
        .eq('WorkoutID', workoutId)

      if (deleteError) throw deleteError

      if (exs.length > 0) {
        const { error: insertError } = await supabase
          .from('WorkoutsExercises')
          .insert(
            exs.map(e => ({
              WorkoutID: workoutId,
              ExerciseID: e.ExerciseID,
              Sets: e.Sets,
              Reps: e.Reps,
              Rest: e.Rest,
              Order: e.Order,
              Block: e.Block,
              Duration: e.Duration,
            }))
          )

        if (insertError) throw insertError
      }

      return true
    } catch (error) {
      console.error('Error saving exercises:', error)
      return false
    } finally {
      setSaving(false)
    }
  }, [workoutId])

  useImperativeHandle(ref, () => ({ saveExercises }), [saveExercises])

  // Standalone green button — save + reload IDs from DB
  const handleSaveClick = async () => {
    const ok = await saveExercises()
    if (ok) {
      onUpdate()
    } else {
      alert('שגיאה בשמירת תרגילים')
    }
  }

  const activeExercise = activeId != null
    ? localExercises.find(e => e.WorkoutExerciseID === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 relative">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">תרגילים באימון</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-sm text-blue-600 hover:underline md:hidden"
              >
                {showSidebar ? 'הסתר' : 'הצג'} תרגילים זמינים
              </button>
              <button
                onClick={handleSaveClick}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 text-sm"
              >
                {saving ? '💾 שומר...' : '💾 שמור תרגילים'}
              </button>
            </div>
          </div>

          {blockNumbers.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
              <p className="text-gray-600 mb-2 text-lg font-medium">עדיין אין תרגילים באימון</p>
              <p className="text-sm text-gray-500">👉 לחץ על תרגיל מהצד כדי להתחיל</p>
            </div>
          ) : (
            <div className="space-y-6">
              {blockNumbers.map(blockNum => (
                <BlockContainer
                  key={blockNum}
                  blockNumber={blockNum}
                  exercises={blockMap[blockNum]}
                  onUpdateExercise={handleUpdateExercise}
                  onRemoveExercise={handleRemoveExercise}
                  onDeleteBlock={() => handleDeleteBlock(blockNum)}
                  onAddExercise={() => setSelectedBlock(blockNum)}
                  isSelectedForAdd={selectedBlock === blockNum}
                />
              ))}

              <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600">
                  לחץ על תרגיל מהסיידבר להוספה לבלוק חדש ({nextBlock})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className={`hidden md:block ${selectedBlock !== null ? 'ring-4 ring-blue-500 rounded-lg' : ''}`}>
            <ExerciseSidebar
              onAddExercise={(exercise) =>
                handleAddExercise(exercise, selectedBlock ?? undefined)
              }
            />
          </div>
        )}
      </div>

      <DragOverlay>
        {activeExercise && (
          <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-xl opacity-90 cursor-grabbing">
            <span className="font-medium text-sm">{activeExercise.Exercise.Name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
})

export default WorkoutExercises
