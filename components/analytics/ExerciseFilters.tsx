// components/analytics/ExerciseFilters.tsx
// Filters bar for Exercise Analytics

'use client'

import { useState, useEffect } from 'react'
import { Exercise, DateRange, FilterState } from '@/types/analytics'
import { supabase } from '@/lib/supabaseClient'

interface ExerciseFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  exercises: Exercise[]
  categories: string[]
}

export default function ExerciseFilters({
  filters,
  onFiltersChange,
  exercises,
  categories
}: ExerciseFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // ✅ FIX: Filter exercises by category FIRST, then by search term
  const filteredExercises = exercises.filter(ex => {
    // Filter by category if selected
    if (filters.category && ex.Category !== filters.category) {
      return false
    }
    // Filter by search term
    if (searchTerm && !ex.Name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })

  const selectedExercise = exercises.find(e => e.ExerciseID === filters.exerciseId)

  const handleExerciseSelect = (exercise: Exercise) => {
    onFiltersChange({ ...filters, exerciseId: exercise.ExerciseID })
    setSearchTerm(exercise.Name)
    setShowDropdown(false)
  }

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ ...filters, category: category === 'all' ? null : category })
  }

  const handleDateRangeChange = (range: DateRange) => {
    onFiltersChange({ ...filters, dateRange: range })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Exercise Autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏋️ תרגיל
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm || selectedExercise?.Name || ''}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="חפש תרגיל..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Dropdown */}
            {showDropdown && filteredExercises.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredExercises.map(exercise => (
                  <button
                    key={exercise.ExerciseID}
                    onClick={() => handleExerciseSelect(exercise)}
                    className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{exercise.Name}</div>
                    <div className="text-sm text-gray-500">{exercise.Category}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Clear button */}
          {filters.exerciseId && (
            <button
              onClick={() => {
                onFiltersChange({ ...filters, exerciseId: null })
                setSearchTerm('')
              }}
              className="absolute left-3 top-10 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📂 קטגוריה
          </label>
          <select
            value={filters.category || 'all'}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">הכל</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 טווח תאריכים
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value as DateRange)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="week">שבוע אחרון</option>
            <option value="month">חודש אחרון</option>
            <option value="3months">3 חודשים</option>
            <option value="6months">6 חודשים</option>
            <option value="year">שנה</option>
            <option value="all">הכל</option>
          </select>
        </div>

      </div>

      {/* Active Filters Summary */}
      {(filters.exerciseId || filters.category) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.exerciseId && selectedExercise && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
              {selectedExercise.Name}
              <button
                onClick={() => {
                  onFiltersChange({ ...filters, exerciseId: null })
                  setSearchTerm('')
                }}
                className="mr-2 hover:text-blue-900"
              >
                ✕
              </button>
            </span>
          )}
          
          {filters.category && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700">
              {filters.category}
              <button
                onClick={() => onFiltersChange({ ...filters, category: null })}
                className="mr-2 hover:text-purple-900"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}