// components/workouts/ExerciseSidebar.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Exercise } from '@/types/workouts'
import { supabase } from '@/lib/supabaseClient'

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
        className={`absolute inset-x-0 top-0 bg-white border rounded-lg cursor-pointer transition-shadow duration-150
          ${isExpanded ? 'z-20 shadow-xl border-blue-300' : 'z-10 shadow-sm hover:shadow-md'}`}
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
              className={`shrink-0 bg-blue-600 text-white rounded px-2 py-1 text-xs font-medium
                hover:bg-blue-700 transition-opacity duration-150
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
              className="overflow-hidden border-t border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="font-semibold text-sm leading-tight">{exercise.Name}</div>
                {exercise.Category && (
                  <div className="text-xs text-gray-500">קטגוריה: {exercise.Category}</div>
                )}
                {exercise.Description && (
                  <div className="text-xs text-gray-600 leading-relaxed">{exercise.Description}</div>
                )}
                <div className="flex gap-1 flex-wrap pt-0.5">
                  {exercise.IsSingleHand && (
                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                      יד בודדת
                    </span>
                  )}
                  {exercise.isDuration && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                      זמן
                    </span>
                  )}
                </div>
                {isTouchDevice && (
                  <button
                    className="w-full mt-1 bg-blue-600 text-white rounded px-3 py-2 text-sm font-medium hover:bg-blue-700 active:bg-blue-800"
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

interface Props {
  onAddExercise: (exercise: Exercise) => void
}

export default function ExerciseSidebar({ onAddExercise }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

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
    <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-bold mb-4">תרגילים זמינים</h3>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חפש תרגיל..."
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Category Filter */}
      <div className="mb-4">
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
      </div>

      {/* Exercises List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">טוען תרגילים...</p>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">לא נמצאו תרגילים</div>
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
  )
}
