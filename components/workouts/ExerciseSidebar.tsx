// components/workouts/ExerciseSidebar.tsx
'use client'

import { useState, useEffect } from 'react'
import { Exercise } from '@/types/workouts'
import { supabase } from '@/lib/supabaseClient'

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

      // Extract unique categories
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

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((ex) => ex.Category === selectedCategory)
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((ex) =>
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
        <div className="text-center py-8 text-gray-500 text-sm">
          לא נמצאו תרגילים
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExercises.map((exercise) => (
            <div
              key={exercise.ExerciseID}
              className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onAddExercise(exercise)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm mb-1 truncate">
                    {exercise.Name}
                  </div>
                  {exercise.Category && (
                    <div className="text-xs text-gray-500 mb-1">
                      {exercise.Category}
                    </div>
                  )}
                  {exercise.IsSingleHand && (
                    <span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                      Single Hand
                    </span>
                  )}
                  {exercise.isDuration && (
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded ml-1">
                      Duration
                    </span>
                  )}
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white rounded px-2 py-1 text-xs font-medium hover:bg-blue-700 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddExercise(exercise)
                  }}
                >
                  + הוסף
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}