// components/workouts/WorkoutsList.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Workout, WorkoutFilters } from '@/types/workouts'
import { fetchWorkouts, fetchCategories } from '@/lib/workout-api'
import { supabase } from '@/lib/supabaseClient'
import { parseDbTimestamp } from '@/lib/reports/dates'
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

  // quick filters: used lately (in anyone's calendar, last 30 days) / assigned to at least one user
  const [recentOnly, setRecentOnly] = useState(false)
  const [assignedOnly, setAssignedOnly] = useState(false)
  const [lastUsed, setLastUsed] = useState<Map<number, string>>(new Map())
  const [assignedCount, setAssignedCount] = useState<Map<number, number>>(new Map())
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
      const [{ data: cal }, { data: assigned }] = await Promise.all([
        supabase.from('Calendar').select('WorkoutID, StartTime').gte('StartTime', since)
          .lte('StartTime', new Date(Date.now() + 86400000).toISOString().slice(0, 10)).range(0, 9999),
        supabase.from('WorkoutsForUser').select('WorkoutID, Email').range(0, 9999),
      ])
      if (cancelled) return
      const lu = new Map<number, string>()
      for (const c of cal ?? []) {
        const prev = lu.get(c.WorkoutID)
        if (!prev || c.StartTime > prev) lu.set(c.WorkoutID, c.StartTime)
      }
      const ac = new Map<number, number>()
      for (const a of assigned ?? []) ac.set(a.WorkoutID, (ac.get(a.WorkoutID) ?? 0) + 1)
      setLastUsed(lu)
      setAssignedCount(ac)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    loadData()
  }, [filters])

  const shown = workouts
    .filter(w => !recentOnly || lastUsed.has(w.WorkoutID))
    .filter(w => !assignedOnly || (assignedCount.get(w.WorkoutID) ?? 0) > 0)
    // used lately: most recent first
    .sort((a, b) => (recentOnly ? (lastUsed.get(b.WorkoutID) ?? '').localeCompare(lastUsed.get(a.WorkoutID) ?? '') : 0))
  const chip = (on: boolean) => `h-10 px-4 rounded-full border text-sm font-bold whitespace-nowrap ${on ? 'border-accent bg-accent/15 text-accent' : 'border-line-strong text-fg-3'}`

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
        <div className="flex gap-2 flex-wrap mb-4" role="group" aria-label="סינון מהיר">
          <button type="button" aria-pressed={recentOnly} onClick={() => setRecentOnly(v => !v)} className={chip(recentOnly)}
            title="אימונים שהופיעו בלוח השנה של מתאמן ב־30 הימים האחרונים">
            🕘 בשימוש לאחרונה
          </button>
          <button type="button" aria-pressed={assignedOnly} onClick={() => setAssignedOnly(v => !v)} className={chip(assignedOnly)}
            title="אימונים ששויכו לפחות למתאמן אחד">
            👤 משובץ למתאמן
          </button>
          {(recentOnly || assignedOnly) && !loading && (
            <span className="self-center text-sm text-muted">{shown.length} אימונים</span>
          )}
        </div>
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
      ) : shown.length === 0 ? (
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
          {shown.map((workout) => (
            <div key={workout.WorkoutID} className="flex flex-col gap-1">
              <WorkoutCard workout={workout} onUpdate={loadData} />
              {(lastUsed.has(workout.WorkoutID) || assignedCount.has(workout.WorkoutID)) && (
                <p className="text-xs text-muted px-1 flex gap-3">
                  {assignedCount.has(workout.WorkoutID) && <span>👤 משובץ ל־{assignedCount.get(workout.WorkoutID)}</span>}
                  {lastUsed.has(workout.WorkoutID) && <span>🕘 בלוח: {parseDbTimestamp(lastUsed.get(workout.WorkoutID)!).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' })}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}