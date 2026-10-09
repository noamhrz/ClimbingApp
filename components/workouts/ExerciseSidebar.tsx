// components/workouts/ExerciseSidebar.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Exercise } from '@/types/workouts'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'

interface CardProps {
  exercise: Exercise
  onAddExercise: (exercise: Exercise) => void
}

function ExerciseCard({ exercise, onAddExercise }: CardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleMouseEnter = () => {
    if (!isTouchDevice) setIsExpanded(true)
  }

  const handleMouseLeave = () => {
    if (!isTouchDevice) setIsExpanded(false)
  }

  const handleClick = () => {
    if (isTouchDevice) {
      setIsExpanded((prev) => !prev)
    } else {
      onAddExercise(exercise)
    }
  }

  return (
    // Fixed-height wrapper keeps the list layout stable
    <div className="relative h-11">
      <div
        className={`absolute inset-x-0 top-0 bg-surface border rounded-lg cursor-pointer transition-shadow duration-150
 ${isExpanded ? 'z-20 shadow-xl border-accent' : 'z-10 '}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Compact row — always visible */}
        <div className="flex items-center gap-2 px-3 h-11">
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm truncate block">{exercise.Name}</span>
          </div>
          {!isTouchDevice && (
            <button
              className={`shrink-0 bg-accent text-on-accent rounded px-2 py-1 text-xs font-medium
 hover:bg-accent-hover transition-opacity duration-150
 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
              onClick={(e) => {
                e.stopPropagation()
                onAddExercise(exercise)
              }}
            >
              + הוסף
            </button>
          )}
        </div>

        {/* Expanded details — overlays below */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden border-t border-line"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="font-semibold text-sm leading-tight">{exercise.Name}</div>
                {exercise.Category && (
                  <div className="text-xs text-muted">קטגוריה: {exercise.Category}</div>
                )}
                {exercise.Description && (
                  <div className="text-xs text-fg-3 leading-relaxed">{exercise.Description}</div>
                )}
                <div className="flex gap-1 flex-wrap pt-0.5">
                  {exercise.IsSingleHand && (
                    <span className="bg-info/10 text-info text-xs px-2 py-0.5 rounded">
                      יד בודדת
                    </span>
                  )}
                  {exercise.isDuration && (
                    <span className="bg-accent/15 text-accent text-xs px-2 py-0.5 rounded">
                      זמן
                    </span>
                  )}
                </div>
                {isTouchDevice && (
                  <button
                    className="w-full mt-1 bg-accent text-on-accent rounded px-3 py-2 text-sm font-medium hover:bg-accent-hover active:bg-accent"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddExercise(exercise)
                      setIsExpanded(false)
                    }}
                  >
                    + הוסף תרגיל
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Quick "new exercise" form: creates the exercise and adds it to the workout in one step
export function NewExerciseForm({ initialName, categories, onCreated, onCancel }: {
  initialName: string
  categories: string[]
  onCreated: (exercise: Exercise) => void
  onCancel: () => void
}) {
  const { currentUser } = useAuth()
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState(categories[0] ?? '')
  const [newCategory, setNewCategory] = useState('')
  const [isDuration, setIsDuration] = useState(false)
  const [single, setSingle] = useState(false)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const finalCategory = category === '__new' ? newCategory.trim() : category

  const save = async () => {
    if (!name.trim() || !finalCategory) { setError('צריך שם וקטגוריה'); return }
    setSaving(true); setError('')
    const { data, error: e } = await supabase
      .from('Exercises')
      .insert({
        Name: name.trim(), Category: finalCategory, Description: description.trim(),
        isDuration, IsSingleHand: single, is_dynamic: false,
        Status: 'Active', CreatedBy: currentUser?.Email ?? null, CreatedAt: new Date().toISOString(),
      })
      .select()
      .single()
    setSaving(false)
    if (e || !data) { setError(e?.message ?? 'שגיאה ביצירת התרגיל'); return }
    onCreated(data as Exercise)
  }

  const seg = (on: boolean) => `h-9 rounded-md text-sm font-bold ${on ? 'bg-accent text-on-accent' : 'text-fg-2'}`
  return (
    <div className="mt-3 rounded-lg border border-accent/60 bg-accent/5 p-3 flex flex-col gap-2.5">
      <p className="font-bold text-sm">תרגיל חדש</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="שם התרגיל" aria-label="שם התרגיל" autoFocus className="w-full border rounded-lg px-3 py-2 text-sm" />
      <select value={category} onChange={e => setCategory(e.target.value)} aria-label="קטגוריה" className="w-full border rounded-lg px-3 py-2 text-sm">
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__new">+ קטגוריה חדשה…</option>
      </select>
      {category === '__new' && (
        <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="שם הקטגוריה" aria-label="שם הקטגוריה" className="w-full border rounded-lg px-3 py-2 text-sm" />
      )}
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1" role="group" aria-label="סוג">
        <button type="button" aria-pressed={!isDuration} onClick={() => setIsDuration(false)} className={seg(!isDuration)}>חזרות</button>
        <button type="button" aria-pressed={isDuration} onClick={() => setIsDuration(true)} className={seg(isDuration)}>זמן</button>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={single} onChange={e => setSingle(e.target.checked)} />יד אחת (ימין ושמאל בנפרד)
      </label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="תיאור (לא חובה)" aria-label="תיאור" className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
      {error && <p className="text-danger text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="h-10 px-3 rounded-lg border border-line-strong text-sm font-bold text-fg-2">ביטול</button>
        <button type="button" onClick={save} disabled={saving} className="flex-1 h-10 rounded-lg bg-accent text-on-accent text-sm font-bold disabled:opacity-50">
          {saving ? 'יוצר…' : 'צור והוסף לאימון'}
        </button>
      </div>
    </div>
  )
}

interface Props {
  onAddExercise: (exercise: Exercise) => void
  /** Full-width, fills its parent (used inside the mobile bottom sheet) */
  sheet?: boolean
}

export default function ExerciseSidebar({ onAddExercise, sheet = false }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadExercises()
  }, [])

  useEffect(() => {
    filterExercises()
  }, [search, selectedCategory, exercises])

  const loadExercises = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('Exercises')
        .select('*')
        .eq('Status', 'Active')
        .order('Name')

      if (error) throw error

      setExercises(data || [])

      const cats = [...new Set((data || []).map((ex) => ex.Category).filter(Boolean))]
      setCategories(cats.sort())
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterExercises = () => {
    let filtered = exercises

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((ex) => ex.Category === selectedCategory)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (ex) =>
          ex.Name.toLowerCase().includes(searchLower) ||
          ex.Description?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredExercises(filtered)
  }

  return (
    <div
      className={sheet ? 'w-full flex-1 min-h-0 flex flex-col' : 'w-80 bg-surface border border-line rounded-lg flex flex-col'}
      style={sheet ? undefined : { maxHeight: 'calc(100vh - var(--app-header-height, 0px) - 8rem)' }}
    >
      {/* Fixed header — title, search, filter */}
      <div className={`border-b border-line shrink-0 ${sheet ? 'px-4 pb-3' : 'p-4'}`}>
        {!sheet && <h3 className="text-lg font-bold mb-3">תרגילים זמינים</h3>}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חפש תרגיל..."
          className={`w-full border rounded-lg px-3 py-2 mb-2 ${sheet ? 'text-base h-11' : 'text-sm'}`}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">📁 כל הקטגוריות</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {creating ? (
          <NewExerciseForm
            initialName={search}
            categories={categories}
            onCancel={() => setCreating(false)}
            onCreated={ex => {
              setExercises(prev => [...prev, ex].sort((a, b) => a.Name.localeCompare(b.Name, 'he')))
              if (ex.Category && !categories.includes(ex.Category)) setCategories(c => [...c, ex.Category].sort())
              setCreating(false)
              setSearch('')
              onAddExercise(ex)
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-2 w-full h-10 rounded-lg border border-dashed border-line-strong text-accent text-sm font-bold"
          >
            + תרגיל חדש{search.trim() ? `: ${search.trim()}` : ''}
          </button>
        )}
      </div>

      {/* Scrollable exercise list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <p className="mt-2 text-sm text-fg-3">טוען תרגילים...</p>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">
            לא נמצאו תרגילים.{' '}
            {!creating && <button type="button" onClick={() => setCreating(true)} className="text-accent font-bold underline">ליצור תרגיל חדש?</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.ExerciseID}
                exercise={exercise}
                onAddExercise={onAddExercise}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
