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
import { createPortal } from 'react-dom'
import { LuSave, LuPlus, LuCheck } from 'react-icons/lu'

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
  const [additionalBlocks, setAdditionalBlocks] = useState<number[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null)
  // Phone: the exercise list opens as a bottom sheet (the side panel is desktop-only)
  const [picker, setPicker] = useState<{ added: string[] } | null>(null)
  const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

  // Always-current ref — avoids stale closure inside saveExercises
  const localExercisesRef = useRef<WorkoutExerciseWithDetails[]>(localExercises)
  useEffect(() => {
    localExercisesRef.current = localExercises
  }, [localExercises])

  // Sync from parent only on initial load / after explicit DB reload
  useEffect(() => {
    setLocalExercises(exercises)
    setAdditionalBlocks([])
    const blocks = exercises.map(e => e.Block)
    setSelectedBlock(blocks.length > 0 ? Math.max(...blocks) : null)
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
  const allBlockNumbers = [...new Set([...blockNumbers, ...additionalBlocks])].sort((a, b) => a - b)
  const nextBlock = allBlockNumbers.length > 0 ? Math.max(...allBlockNumbers) + 1 : 1

  const handleAddExercise = (exercise: Exercise, blockNumber?: number) => {
    const targetBlock = blockNumber ?? nextBlock
    const blockExes = blockMap[targetBlock] ?? []
    const nextOrder = blockExes.length > 0 ? Math.max(...blockExes.map(e => e.Order)) + 1 : 1

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
        Order: nextOrder,
        Block: targetBlock,
        Exercise: exercise,
      },
    ])
    setSelectedBlock(targetBlock)
  }

  const handleUpdateExercise = (exerciseId: number, updates: Partial<WorkoutExerciseWithDetails>) => {
    const ex = localExercises.find(e => e.WorkoutExerciseID === exerciseId)
    if (ex) setSelectedBlock(ex.Block)
    setLocalExercises(prev =>
      prev.map(e => e.WorkoutExerciseID === exerciseId ? { ...e, ...updates } : e)
    )
  }

  const handleRemoveExercise = (exerciseId: number) => {
    if (!confirm('האם להסיר תרגיל זה?')) return
    const removedEx = localExercises.find(e => e.WorkoutExerciseID === exerciseId)
    if (!removedEx) return
    const block = removedEx.Block
    const blockStillExists =
      localExercises.some(e => e.WorkoutExerciseID !== exerciseId && e.Block === block) ||
      additionalBlocks.includes(block)

    setLocalExercises(prev => {
      const filtered = prev.filter(e => e.WorkoutExerciseID !== exerciseId)
      const blockExes = filtered.filter(e => e.Block === block).sort((a, b) => a.Order - b.Order)
      return filtered.map(e => {
        if (e.Block !== block) return e
        return { ...e, Order: blockExes.findIndex(b => b.WorkoutExerciseID === e.WorkoutExerciseID) + 1 }
      })
    })

    if (blockStillExists) setSelectedBlock(block)
  }

  const handleAddBlock = () => {
    setAdditionalBlocks(prev => [...prev, nextBlock])
    setSelectedBlock(nextBlock)
  }

  const handleDeleteBlock = (blockNumber: number) => {
    if (!confirm(`האם למחוק את בלוק ${blockNumber} עם כל התרגילים?`)) return
    setLocalExercises(prev => prev.filter(e => e.Block !== blockNumber))
    setAdditionalBlocks(prev => prev.filter(b => b !== blockNumber))
    setSelectedBlock(prev => {
      if (prev !== blockNumber) return prev
      const remaining = allBlockNumbers.filter(b => b !== blockNumber)
      return remaining.length > 0 ? Math.max(...remaining) : null
    })
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
      setSelectedBlock(targetBlock)
      return
    }

    // Dropped on another exercise — destination block is wherever that exercise lives
    const overExForBlock = localExercises.find(e => e.WorkoutExerciseID === Number(overId))
    if (overExForBlock) setSelectedBlock(overExForBlock.Block)

    // All reads from prev to avoid stale closure
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
      <div className="flex gap-6 items-start relative">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">תרגילים באימון</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPicker({ added: [] })}
                className="md:hidden h-9 px-3 rounded-lg border border-accent text-accent text-sm font-bold inline-flex items-center gap-1"
              >
                <LuPlus aria-hidden className="w-4 h-4" />הוסף תרגיל
              </button>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="hidden md:inline text-sm text-accent hover:underline"
              >
                {showSidebar ? 'הסתר' : 'הצג'} תרגילים זמינים
              </button>
              <button
                onClick={handleSaveClick}
                disabled={saving}
                className="px-4 py-2 bg-success text-on-accent rounded-lg hover:bg-success/90 font-medium disabled:opacity-50 text-sm"
              >
                {saving ? <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שומר...</> : <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שמור תרגילים</>}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {allBlockNumbers.length === 0 && (
              <div className="bg-surface rounded-lg p-12 text-center border-2 border-dashed border-line">
                <p className="text-fg-3 mb-2 text-lg font-medium">עדיין אין תרגילים באימון</p>
                <p className="text-sm text-muted hidden md:block">👉 הוסף בלוק או לחץ על תרגיל מהצד כדי להתחיל</p>
                <button type="button" onClick={() => setPicker({ added: [] })} className="md:hidden mt-2 h-11 px-5 rounded-xl bg-accent text-on-accent font-bold">+ הוסף תרגיל</button>
              </div>
            )}

            {allBlockNumbers.map(blockNum => (
              <BlockContainer
                key={blockNum}
                blockNumber={blockNum}
                exercises={blockMap[blockNum] ?? []}
                onUpdateExercise={handleUpdateExercise}
                onRemoveExercise={handleRemoveExercise}
                onDeleteBlock={() => handleDeleteBlock(blockNum)}
                onAddExercise={() => { setSelectedBlock(blockNum); if (isPhone()) setPicker({ added: [] }) }}
                onSelectBlock={() => setSelectedBlock(blockNum)}
                isSelectedForAdd={selectedBlock === blockNum}
              />
            ))}

            <button
              onClick={handleAddBlock}
              className="w-full border-2 border-dashed border-line rounded-lg py-4 text-muted hover:border-accent hover:text-accent hover:bg-accent/15 font-medium transition-colors"
            >
              + הוסף בלוק חדש
            </button>
          </div>
        </div>

        {/* Sidebar — sticky below the app header, capped so it never runs under the header or the bottom save bar */}
        {showSidebar && (
          <div
            className={`hidden md:block sticky self-start ${selectedBlock !== null ? 'ring-4 ring-accent rounded-lg' : ''}`}
            style={{ top: 'calc(var(--app-header-height, 0px) + 1rem)' }}
          >
            <ExerciseSidebar
              onAddExercise={(exercise) =>
                handleAddExercise(exercise, selectedBlock ?? undefined)
              }
            />
          </div>
        )}
      </div>

      {picker && isPhone() && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end" onClick={e => { if (e.target === e.currentTarget) setPicker(null) }}>
          <div role="dialog" data-flow aria-modal="true" aria-labelledby="picker-title" dir="rtl" className="w-full h-[88vh] bg-raised border-t border-line-strong rounded-t-[20px] flex flex-col text-fg">
            <div className="px-4 pt-2.5 pb-3 flex flex-col gap-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto" />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 id="picker-title" className="text-xl font-extrabold">הוספת תרגיל</h2>
                  <p className="text-sm text-muted">לבלוק {selectedBlock ?? nextBlock}{selectedBlock == null ? ' (חדש)' : ''}</p>
                </div>
                <button type="button" onClick={() => setPicker(null)} className="h-10 px-4 rounded-xl bg-accent text-on-accent font-bold shrink-0">סיום</button>
              </div>
              {picker.added.length > 0 && (
                <p className="text-sm text-success font-bold flex items-center gap-1 truncate" aria-live="polite">
                  <LuCheck aria-hidden className="w-4 h-4 shrink-0" />נוסף: {picker.added.join(', ')}
                </p>
              )}
            </div>
            <ExerciseSidebar
              sheet
              onAddExercise={exercise => {
                handleAddExercise(exercise, selectedBlock ?? undefined)
                setPicker(p => p && { added: [...p.added, exercise.Name] })
              }}
            />
          </div>
        </div>,
        document.body,
      )}

      <DragOverlay>
        {activeExercise && (
          <div className="bg-surface border-2 border-accent rounded-lg p-3 opacity-90 cursor-grabbing">
            <span className="font-medium text-sm">{activeExercise.Exercise.Name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
})

export default WorkoutExercises
