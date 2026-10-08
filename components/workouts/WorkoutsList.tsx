// components/workouts/WorkoutsList.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Workout, WorkoutFilters } from '@/types/workouts'
import { fetchWorkouts, fetchCategories } from '@/lib/workout-api'
import WorkoutCard from './WorkoutCard'
import { LuDumbbell, LuSearch } from 'react-icons/lu'

export default function WorkoutsList() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<WorkoutFilters>({
    search: '',
    category: 'all',
    type: 'all',
    showInactive: false,
  })

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    setLoading(true)
    try {
      const [workoutsData, categoriesData] = await Promise.all([
        fetchWorkouts(filters),
        fetchCategories(),
      ])
      setWorkouts(workoutsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof WorkoutFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="text-fg-3 hover:text-fg"
            title="חזור לדף הבית"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <h1 className="text-3xl font-bold"><LuDumbbell aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />ניהול אימונים</h1>
        </div>
        
        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={() => router.push('/workouts-editor/new')}
            className="bg-accent text-on-accent px-4 py-2 rounded-lg hover:bg-accent-hover font-medium"
          >
            + אימון חדש
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showInactive}
              onChange={(e) => handleFilterChange('showInactive', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">הצג אימונים לא פעילים</span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1"><LuSearch aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />חיפוש</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="חפש לפי שם..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1">קטגוריה</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">הכל</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">סוג</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">הכל</option>
              <option value="exercise">תרגילים בלבד</option>
              <option value="climbing">טיפוס בלבד</option>
              <option value="both">תרגילים + טיפוס</option>
              <option value="none">ללא תוכן</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workouts List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-fg-3">טוען אימונים...</p>
        </div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg">
          <p className="text-fg-3 text-lg">לא נמצאו אימונים</p>
          <button
            onClick={() => router.push('/workouts-editor/new')}
            className="mt-4 text-accent hover:underline"
          >
            צור אימון חדש
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.WorkoutID} workout={workout} onUpdate={loadData} />
          ))}
        </div>
      )}
    </div>
  )
}