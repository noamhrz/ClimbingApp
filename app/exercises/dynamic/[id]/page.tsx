'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '@/lib/supabaseClient'
import { Exercise } from '@/types/exercises'
import { RoadmapCategory, RoadmapLevel } from '@/types/dynamic-exercise'

interface LocalItem {
  id: number
  ExerciseID: number
  Sets: number
  Reps: number
  Duration: number | null
  Rest: number
  Order: number
  exercise: Exercise
}

function SortableItem({
  item,
  onUpdate,
  onRemove,
}: {
  item: LocalItem
  onUpdate: (id: number, updates: Partial<LocalItem>) => void
  onRemove: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 text-xl shrink-0 select-none"
      >
        ⠿
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.exercise.Name}</div>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {item.exercise.isDuration ? (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">שניות</span>
          ) : (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">חזרות</span>
          )}
          {item.exercise.IsSingleHand && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">יד אחת</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0">
        <label className="text-xs text-gray-500">סטים</label>
        <input
          type="number"
          value={item.Sets}
          min={1}
          onChange={(e) => onUpdate(item.id, { Sets: parseInt(e.target.value) || 1 })}
          className="w-14 border rounded px-2 py-1 text-sm text-center"
        />
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0">
        <label className="text-xs text-gray-500">
          {item.exercise.isDuration ? 'שניות' : 'חזרות'}
        </label>
        {item.exercise.isDuration ? (
          <input
            type="number"
            value={item.Duration ?? 30}
            min={1}
            onChange={(e) =>
              onUpdate(item.id, { Duration: parseInt(e.target.value) || 1, Reps: 1 })
            }
            className="w-16 border rounded px-2 py-1 text-sm text-center"
          />
        ) : (
          <input
            type="number"
            value={item.Reps}
            min={1}
            onChange={(e) => onUpdate(item.id, { Reps: parseInt(e.target.value) || 1 })}
            className="w-14 border rounded px-2 py-1 text-sm text-center"
          />
        )}
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0">
        <label className="text-xs text-gray-500">מנוחה</label>
        <input
          type="number"
          value={item.Rest}
          min={0}
          onChange={(e) => onUpdate(item.id, { Rest: parseInt(e.target.value) || 0 })}
          className="w-16 border rounded px-2 py-1 text-sm text-center"
        />
      </div>

      <button
        onClick={() => onRemove(item.id)}
        className="text-red-400 hover:text-red-600 text-xl leading-none shrink-0 font-medium"
      >
        ×
      </button>
    </div>
  )
}

export default function DynamicExerciseEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  const exerciseId = Number(id)

  const [dynamicExercise, setDynamicExercise] = useState<Exercise | null>(null)
  const [categories, setCategories] = useState<RoadmapCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [levels, setLevels] = useState<RoadmapLevel[]>([])
  const [activeLevelId, setActiveLevelId] = useState<number | null>(null)
  const [allItems, setAllItems] = useState<Record<number, LocalItem[]>>({})
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [addFilterCategory, setAddFilterCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    loadInitialData()
  }, [exerciseId])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [{ data: exData }, { data: cats }, { data: availExs }] = await Promise.all([
        supabase.from('Exercises').select('*').eq('ExerciseID', exerciseId).single(),
        supabase.from('RoadmapCategories').select('*').order('Order'),
        supabase
          .from('Exercises')
          .select('*')
          .eq('Status', 'Active')
          .eq('is_dynamic', false)
          .order('Name'),
      ])

      if (!exData || !exData.is_dynamic) {
        router.push('/exercises')
        return
      }

      setDynamicExercise(exData)
      setCategories(cats || [])
      setAvailableExercises(availExs || [])

      // Load existing items for this dynamic exercise
      const { data: items } = await supabase
        .from('dynamic_exercise_items')
        .select('*, exercise:ExerciseID(*)')
        .eq('DynamicExerciseID', exerciseId)
        .order('Order')

      if (items && items.length > 0) {
        const levelIds = [...new Set(items.map((i: any) => i.LevelID as number))]
        const { data: levelData } = await supabase
          .from('RoadmapLevels')
          .select('*')
          .in('LevelID', levelIds)

        if (levelData && levelData.length > 0) {
          const catId = levelData[0].CategoryID
          setSelectedCategoryId(catId)

          const lvls = await loadLevels(catId)
          setLevels(lvls)
          if (lvls.length > 0) setActiveLevelId(lvls[0].LevelID)

          const grouped: Record<number, LocalItem[]> = {}
          for (const item of items as any[]) {
            if (!grouped[item.LevelID]) grouped[item.LevelID] = []
            grouped[item.LevelID].push({
              id: item.DynamicExerciseItemID,
              ExerciseID: item.ExerciseID,
              Sets: item.Sets,
              Reps: item.Reps,
              Duration: item.Duration,
              Rest: item.Rest,
              Order: item.Order,
              exercise: item.exercise,
            })
          }
          for (const lvlId of Object.keys(grouped)) {
            grouped[Number(lvlId)].sort((a, b) => a.Order - b.Order)
          }
          setAllItems(grouped)
        }
      }
    } catch (err) {
      console.error('Error loading dynamic exercise:', err)
    } finally {
      setLoading(false)
    }
  }

  // -1 is truthy in JS so all `activeLevelId ? …` checks still work correctly.
  const VIRTUAL_LEVEL0_ID = -1

  const createLevel0ViaApi = async (catId: number): Promise<RoadmapLevel | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    try {
      const res = await fetch('/api/admin/roadmap/levels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ CategoryID: catId, LevelNumber: 0, Name: 'טרם התחיל' }),
      })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  const loadLevels = async (catId: number): Promise<RoadmapLevel[]> => {
    const { data: lvls } = await supabase
      .from('RoadmapLevels')
      .select('*')
      .eq('CategoryID', catId)
      .order('LevelNumber')

    const levelList: RoadmapLevel[] = lvls || []
    if (levelList.some((l) => l.LevelNumber === 0)) return levelList

    // Level 0 missing — create via API route (uses service role, bypasses RLS)
    const created = await createLevel0ViaApi(catId)
    if (created) {
      return [...levelList, created].sort((a, b) => a.LevelNumber - b.LevelNumber)
    }

    // Fallback: virtual tab so the UI is usable even if creation failed
    return [
      { LevelID: VIRTUAL_LEVEL0_ID, CategoryID: catId, LevelNumber: 0, Name: 'טרם התחיל' },
      ...levelList,
    ]
  }

  const resolveVirtualLevel0 = async (catId: number): Promise<number | null> => {
    const { data: existing } = await supabase
      .from('RoadmapLevels')
      .select('LevelID')
      .eq('CategoryID', catId)
      .eq('LevelNumber', 0)
      .maybeSingle()
    if (existing) return existing.LevelID

    const created = await createLevel0ViaApi(catId)
    return created?.LevelID ?? null
  }

  const handleCategoryChange = async (catId: number) => {
    setSelectedCategoryId(catId)
    setAllItems({})
    const levelList = await loadLevels(catId)
    setLevels(levelList)
    setActiveLevelId(levelList.length > 0 ? levelList[0].LevelID : null)
  }

  const activeItems = activeLevelId ? (allItems[activeLevelId] || []) : []

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !activeLevelId) return

    setAllItems((prev) => {
      const items = [...(prev[activeLevelId] || [])]
      const oldIdx = items.findIndex((i) => i.id === active.id)
      const newIdx = items.findIndex((i) => i.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return prev
      const reordered = arrayMove(items, oldIdx, newIdx).map((i, idx) => ({
        ...i,
        Order: idx + 1,
      }))
      return { ...prev, [activeLevelId]: reordered }
    })
  }

  const handleUpdateItem = (id: number, updates: Partial<LocalItem>) => {
    if (!activeLevelId) return
    setAllItems((prev) => ({
      ...prev,
      [activeLevelId]: (prev[activeLevelId] || []).map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    }))
  }

  const handleRemoveItem = (id: number) => {
    if (!activeLevelId) return
    setAllItems((prev) => ({
      ...prev,
      [activeLevelId]: (prev[activeLevelId] || []).filter((i) => i.id !== id),
    }))
  }

  const handleAddExercise = (exercise: Exercise) => {
    if (!activeLevelId) return
    const currentItems = allItems[activeLevelId] || []
    const newItem: LocalItem = {
      id: -(Date.now()),
      ExerciseID: exercise.ExerciseID,
      Sets: 3,
      Reps: exercise.isDuration ? 1 : 8,
      Duration: exercise.isDuration ? 30 : null,
      Rest: 90,
      Order: currentItems.length + 1,
      exercise,
    }
    setAllItems((prev) => ({
      ...prev,
      [activeLevelId]: [...(prev[activeLevelId] || []), newItem],
    }))
    setShowAddDropdown(false)
    setAddFilterCategory('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error: deleteError } = await supabase
        .from('dynamic_exercise_items')
        .delete()
        .eq('DynamicExerciseID', exerciseId)

      if (deleteError) throw deleteError

      // Resolve virtual level 0 to a real DB LevelID before saving
      let realLevel0Id: number | null = null
      const hasVirtualLevel0Items = (allItems[VIRTUAL_LEVEL0_ID] || []).length > 0
      if (selectedCategoryId && hasVirtualLevel0Items) {
        realLevel0Id = await resolveVirtualLevel0(selectedCategoryId)
        if (!realLevel0Id) {
          alert('רמה 0 לא קיימת ב-DB. הרץ את ה-SQL migration ב-Supabase כדי ליצור אותה, ואז שמור שוב.')
          setSaving(false)
          return
        }
      }

      const allItemsFlat: object[] = []
      for (const [levelId, items] of Object.entries(allItems)) {
        const numLevelId = Number(levelId)
        const resolvedLevelId =
          numLevelId === VIRTUAL_LEVEL0_ID ? realLevel0Id : numLevelId
        if (resolvedLevelId === null) continue
        for (const item of items) {
          allItemsFlat.push({
            DynamicExerciseID: exerciseId,
            LevelID: resolvedLevelId,
            ExerciseID: item.ExerciseID,
            Sets: item.Sets,
            Reps: item.Reps,
            Duration: item.Duration,
            Rest: item.Rest,
            Order: item.Order,
          })
        }
      }

      if (allItemsFlat.length > 0) {
        const { error: insertError } = await supabase
          .from('dynamic_exercise_items')
          .insert(allItemsFlat)
        if (insertError) throw insertError
      }

      alert('נשמר בהצלחה!')
    } catch (err) {
      console.error('Error saving dynamic exercise:', err)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const exerciseCategories = [
    ...new Set(availableExercises.map((ex) => ex.Category).filter(Boolean)),
  ].sort()

  const filteredAvailable = availableExercises.filter(
    (ex) =>
      (!addFilterCategory || ex.Category === addFilterCategory) &&
      !(allItems[activeLevelId ?? 0] || []).some((i) => i.ExerciseID === ex.ExerciseID)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  if (!dynamicExercise) return null

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/exercises')}
          className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
        >
          ← חזרה
        </button>
        <div>
          <h1 className="text-2xl font-bold">🧩 עורך דינמי</h1>
          <p className="text-gray-500 text-sm">{dynamicExercise.Name}</p>
        </div>
      </div>

      {/* Category select */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריית רודמאפ</label>
        <select
          value={selectedCategoryId ?? ''}
          onChange={(e) => handleCategoryChange(Number(e.target.value))}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- בחר קטגוריה --</option>
          {categories.map((cat) => (
            <option key={cat.CategoryID} value={cat.CategoryID}>
              {cat.Icon ? `${cat.Icon} ` : ''}{cat.Name}
            </option>
          ))}
        </select>
      </div>

      {/* Level tabs + content */}
      {levels.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {/* Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {levels.map((lvl) => {
              const hasItems = (allItems[lvl.LevelID] || []).length > 0
              const isActive = activeLevelId === lvl.LevelID
              return (
                <button
                  key={lvl.LevelID}
                  onClick={() => setActiveLevelId(lvl.LevelID)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors max-w-[180px] truncate ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-transparent'
                      : hasItems
                      ? 'bg-white text-green-700 border-green-400 hover:bg-green-50'
                      : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {lvl.Name || `רמה ${lvl.LevelNumber}`}
                </button>
              )
            })}
          </div>

          {/* Active level exercises */}
          {activeLevelId && (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                {levels.find((l) => l.LevelID === activeLevelId)?.Name || ''} — {activeItems.length} תרגילים
              </p>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 mb-3">
                    {activeItems.length === 0 && (
                      <div className="py-8 text-center text-gray-400 text-sm border border-dashed border-gray-300 rounded-lg">
                        אין תרגילים ברמה זו
                      </div>
                    )}
                    {activeItems.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        onUpdate={handleUpdateItem}
                        onRemove={handleRemoveItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add exercise */}
              {!showAddDropdown ? (
                <button
                  onClick={() => setShowAddDropdown(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + הוסף תרגיל לרמה
                </button>
              ) : (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={addFilterCategory}
                      onChange={(e) => setAddFilterCategory(e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      autoFocus
                    >
                      <option value="">בחר קטגוריה ▼</option>
                      {exerciseCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <select
                      value=""
                      disabled={!addFilterCategory}
                      onChange={(e) => {
                        const ex = availableExercises.find(
                          (x) => x.ExerciseID === Number(e.target.value)
                        )
                        if (ex) handleAddExercise(ex)
                      }}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">בחר תרגיל ▼</option>
                      {filteredAvailable.map((ex) => (
                        <option key={ex.ExerciseID} value={ex.ExerciseID}>
                          {ex.Name}{ex.isDuration ? ' ⏱' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddDropdown(false)
                      setAddFilterCategory('')
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    סגור
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => router.push('/exercises')}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
        >
          סגור
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !selectedCategoryId}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'שומר...' : '💾 שמור'}
        </button>
      </div>
    </div>
  )
}
