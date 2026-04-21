// components/workout-stats-display.tsx
// 💪 תצוגת סטטיסטיקות אימונים - Timeline + Categories

'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { WorkoutPerformance, WorkoutStats } from '@/lib/workout-stats-metrics'
import { getCompletionRateColor, getRPEColor } from '@/lib/workout-stats-metrics'

interface WorkoutStatsDisplayProps {
  performance: WorkoutPerformance
  email: string
}

export function WorkoutStatsDisplay({ performance, email }: WorkoutStatsDisplayProps) {
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  if (performance.workouts.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">💪</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">אין נתוני אימונים</h3>
        <p className="text-gray-600">לא נמצאו אימונים בטווח התאריכים הנבחר</p>
      </div>
    )
  }

  // Group workouts by category
  const categorizedWorkouts = groupByCategory(performance.workouts)

  // Fixed display order: climbing first, then named categories, then the rest alphabetically
  const PRIORITY_ORDER = ['אימוני טיפוס 🧗', 'Hangboard 🏋️', 'General Strength 💪', 'Mobility 🤸']
  const remaining = Object.keys(categorizedWorkouts)
    .filter(c => !PRIORITY_ORDER.includes(c))
    .sort()
  const allCategories = [...PRIORITY_ORDER.filter(c => categorizedWorkouts[c]), ...remaining]

  // Filter workouts based on selected category
  const filteredCategories = selectedCategory === 'all'
    ? allCategories
    : allCategories.filter(c => c === selectedCategory)
  const filteredWorkouts = Object.fromEntries(
    filteredCategories.map(c => [c, categorizedWorkouts[c]])
  )

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">💪 סיכום אימונים</h2>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-90">סנן לפי קטגוריה:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            >
              <option value="all" className="text-gray-900">🔍 הכל ({performance.workouts.length})</option>
              {allCategories.map((category) => (
                <option key={category} value={category} className="text-gray-900">
                  {getCategoryIcon(category)} {category} ({categorizedWorkouts[category]?.length ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-sm opacity-90">סה"כ אימונים</div>
            <div className="text-3xl font-bold">{performance.totalSessions}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-sm opacity-90">בוצעו</div>
            <div className="text-3xl font-bold">{performance.completedSessions}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm col-span-2 md:col-span-1">
            <div className="text-sm opacity-90">אחוז השלמה</div>
            <div className="text-3xl font-bold">
              {performance.overallCompletionRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Category Sections */}
      {Object.entries(filteredWorkouts).map(([category, workouts]) => (
        workouts?.length > 0 && (
          <CategorySection
            key={category}
            category={category}
            workouts={workouts}
            email={email}
            dateRange={performance.dateRange}
          />
        )
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Group by Category
// ═══════════════════════════════════════════════════════════════════

function resolveCategory(workout: WorkoutStats): string {
  if (workout.containClimbing) return 'אימוני טיפוס 🧗'
  const cat = workout.workoutCategory || ''
  if (cat === 'HangBoard') return 'Hangboard 🏋️'
  if (cat === 'General strength') return 'General Strength 💪'
  if (cat.toLowerCase().includes('mobility')) return 'Mobility 🤸'
  return cat || 'אחר'
}

function groupByCategory(workouts: WorkoutStats[]): Record<string, WorkoutStats[]> {
  const grouped: Record<string, WorkoutStats[]> = {}

  for (const workout of workouts) {
    const category = resolveCategory(workout)
    if (!grouped[category]) grouped[category] = []
    grouped[category].push(workout)
  }

  for (const category in grouped) {
    grouped[category].sort((a, b) => b.totalSessions - a.totalSessions)
  }

  return grouped
}

// ═══════════════════════════════════════════════════════════════════
// Category Icon Mapping
// ═══════════════════════════════════════════════════════════════════

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'אימוני טיפוס 🧗': '🧗',
    'Hangboard 🏋️': '🪵',
    'General Strength 💪': '🏋️',
    'Mobility 🤸': '🤸',
    'אחר': '📋',
  }
  return icons[category] || '📋'
}

// ═══════════════════════════════════════════════════════════════════
// Category Section
// ═══════════════════════════════════════════════════════════════════

function CategorySection({
  category, workouts, email, dateRange
}: {
  category: string
  workouts: WorkoutStats[]
  email: string
  dateRange: { start: string; end: string }
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b-2 border-gray-200 rounded-t-lg">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>{getCategoryIcon(category)}</span>
          <span>{category}</span>
          <span className="text-sm font-normal text-gray-600">({workouts.length} אימונים)</span>
        </h3>
      </div>
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-700 text-xs">
                <th className="text-center p-2 font-bold w-16">תאריך</th>
                <th className="text-center p-2 font-bold w-32">ציר זמן</th>
                <th className="text-center p-2 font-bold w-12">#</th>
                <th className="text-right p-2 font-bold">שם אימון</th>
                <th className="text-center p-2 font-bold w-16">סה"כ</th>
                <th className="text-center p-2 font-bold w-16">✅</th>
                <th className="text-center p-2 font-bold w-16">%</th>
                <th className="text-center p-2 font-bold w-16">RPE</th>
                <th className="text-center p-2 font-bold w-8"></th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((workout, index) => (
                <WorkoutTimelineRow
                  key={workout.workoutId}
                  workout={workout}
                  rank={index + 1}
                  maxSessions={workouts[0].totalSessions}
                  email={email}
                  dateRange={dateRange}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Timeline Row — expandable accordion
// ═══════════════════════════════════════════════════════════════════

function WorkoutTimelineRow({ workout, rank, maxSessions, email, dateRange }: {
  workout: WorkoutStats
  rank: number
  maxSessions: number
  email: string
  dateRange: { start: string; end: string }
}) {
  const [open, setOpen] = useState(false)

  const bgColor = workout.completionRate >= 80 ? 'bg-green-50' :
                  workout.completionRate >= 50 ? 'bg-yellow-50' : 'bg-red-50'

  const timelineWidth = maxSessions > 0 ? (workout.totalSessions / maxSessions) * 100 : 0

  const lastDate = workout.lastCompleted
    ? new Date(workout.lastCompleted).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
    : '—'

  const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

  return (
    <>
      <tr
        className={`border-b border-gray-100 cursor-pointer hover:brightness-95 transition ${bgColor}`}
        onClick={() => setOpen(o => !o)}
      >
        <td className="text-center p-2 text-xs text-gray-600 font-mono">{lastDate}</td>
        <td className="p-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                workout.completionRate >= 80 ? 'bg-green-500' :
                workout.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${timelineWidth}%` }}
            />
          </div>
        </td>
        <td className="text-center p-2 text-xs font-bold">{rankBadge}</td>
        <td className="text-right p-2 font-semibold text-gray-900">{workout.workoutName}</td>
        <td className="text-center p-2 font-medium text-gray-700">{workout.totalSessions}</td>
        <td className="text-center p-2 text-green-700 font-semibold">{workout.completedSessions}</td>
        <td className="text-center p-2">
          <span className={`font-bold ${getCompletionRateColor(workout.completionRate)}`}>
            {workout.completionRate.toFixed(0)}%
          </span>
        </td>
        <td className="text-center p-2">
          {workout.averageRPE !== null ? (
            <span className={`font-bold ${getRPEColor(workout.averageRPE)}`}>
              {workout.averageRPE.toFixed(1)}
            </span>
          ) : <span className="text-gray-400">—</span>}
        </td>
        <td className="text-center p-2 text-gray-400 text-xs">{open ? '▲' : '▼'}</td>
      </tr>

      {open && (
        <tr>
          <td colSpan={9} className="p-0 bg-gray-50 border-b border-gray-200">
            <WorkoutExercisesPanel
              workoutId={workout.workoutId}
              lastCalendarId={workout.lastCalendarId}
              email={email}
              dateRange={dateRange}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Exercises Panel — planned vs performed
// ═══════════════════════════════════════════════════════════════════

interface PlannedExercise {
  exerciseId: number
  name: string
  sets: number | null
  reps: number | null
  order: number
}

interface PerformedLog {
  exerciseId: number
  name: string
  weightKG: number | null
  repsDone: number | null
  durationSec: number | null
  handSide: string | null
}

interface SetEntry {
  reps: number | null
  weight: number | null
  duration: number | null
}

interface SessionEntry {
  calendarId: number
  date: string
  handSide: string | null
  sets: SetEntry[]
}

function WorkoutExercisesPanel({ workoutId, lastCalendarId, email, dateRange }: {
  workoutId: number
  lastCalendarId: number | null
  email: string
  dateRange: { start: string; end: string }
}) {
  const [planned, setPlanned] = useState<PlannedExercise[]>([])
  const [performed, setPerformed] = useState<PerformedLog[]>([])
  const [historyMap, setHistoryMap] = useState<Map<number, SessionEntry[]>>(new Map())
  const [exerciseNames, setExerciseNames] = useState<Map<number, string>>(new Map())
  const [sessionCount, setSessionCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)

      // Q1: WorkoutsExercises (planned)
      const { data: weData } = await supabase
        .from('WorkoutsExercises')
        .select('WorkoutExerciseID, WorkoutID, ExerciseID, Sets, Reps, Rest, Order, Block')
        .eq('WorkoutID', workoutId)

      const weRows = weData || []
      const plannedExIds = weRows.map((r: any) => r.ExerciseID).filter(Boolean)

      // Q2: ExerciseLogs for last session (for the planned/performed table)
      const { data: logsData } = lastCalendarId
        ? await supabase
            .from('ExerciseLogs')
            .select('ExerciseID, WeightKG, RepsDone, DurationSec, HandSide')
            .eq('CalendarID', lastCalendarId)
        : { data: [] }
      const logRows = logsData || []
      const lastSessionExIds = logRows.map((l: any) => l.ExerciseID).filter(Boolean)

      // Q3: All completed Calendar sessions in date range for this workout
      const { data: allSessions } = await supabase
        .from('Calendar')
        .select('CalendarID, StartTime')
        .eq('WorkoutID', workoutId)
        .eq('Email', email)
        .eq('Completed', true)
        .gte('StartTime', dateRange.start)
        .lte('StartTime', `${dateRange.end}T23:59:59.999`)
        .order('StartTime', { ascending: true })

      const sessionRows = allSessions || []
      const allCalendarIds = sessionRows.map((s: any) => s.CalendarID)

      // Q4: All ExerciseLogs for all sessions
      const { data: allLogsData } = allCalendarIds.length > 0
        ? await supabase
            .from('ExerciseLogs')
            .select('ExerciseID, WeightKG, RepsDone, DurationSec, HandSide, CalendarID')
            .in('CalendarID', allCalendarIds)
        : { data: [] }
      const allLogs = allLogsData || []
      const historyExIds = allLogs.map((l: any) => l.ExerciseID).filter(Boolean)

      // Q5: Exercise names for all referenced IDs
      const allIds = [...new Set([...plannedExIds, ...lastSessionExIds, ...historyExIds])]
      const { data: exData } = allIds.length > 0
        ? await supabase.from('Exercises').select('ExerciseID, Name').in('ExerciseID', allIds)
        : { data: [] }

      const nameMap = new Map<number, string>()
      for (const e of exData || []) nameMap.set(e.ExerciseID, e.Name)

      // Build date map: calendarId → "DD/MM"
      const dateMap = new Map<number, string>()
      for (const s of sessionRows) {
        const d = new Date(s.StartTime)
        dateMap.set(s.CalendarID, d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }))
      }

      // Build history map: exerciseId → SessionEntry[]
      // Group by: exerciseId → calendarId → handSide → sets[]
      const histMap = new Map<number, SessionEntry[]>()
      for (const log of allLogs) {
        const id = log.ExerciseID
        if (!id) continue
        if (!histMap.has(id)) histMap.set(id, [])
        const sessions = histMap.get(id)!
        const calId = log.CalendarID
        const side = log.HandSide && log.HandSide !== 'Both' ? log.HandSide : null
        let entry = sessions.find(s => s.calendarId === calId && s.handSide === side)
        if (!entry) {
          entry = {
            calendarId: calId,
            date: dateMap.get(calId) ?? '?',
            handSide: side,
            sets: []
          }
          sessions.push(entry)
        }
        entry.sets.push({
          reps: log.RepsDone ?? null,
          weight: log.WeightKG ?? null,
          duration: log.DurationSec ?? null
        })
      }

      if (!cancelled) {
        setPlanned(
          weRows
            .sort((a: any, b: any) => (a.Order ?? 0) - (b.Order ?? 0))
            .map((p: any) => ({
              exerciseId: p.ExerciseID,
              name: nameMap.get(p.ExerciseID) ?? `#${p.ExerciseID}`,
              sets: p.Sets ?? null,
              reps: p.Reps ?? null,
              order: p.Order ?? 0,
            }))
        )
        setPerformed(
          logRows.map((l: any) => ({
            exerciseId: l.ExerciseID,
            name: nameMap.get(l.ExerciseID) ?? `#${l.ExerciseID}`,
            weightKG: l.WeightKG ?? null,
            repsDone: l.RepsDone ?? null,
            durationSec: l.DurationSec ?? null,
            handSide: l.HandSide ?? null,
          }))
        )
        setHistoryMap(histMap)
        setExerciseNames(nameMap)
        setSessionCount(sessionRows.length)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [workoutId, lastCalendarId, email, dateRange.start, dateRange.end])

  if (loading) {
    return <div className="p-4 text-sm text-gray-500 text-center">טוען תרגילים...</div>
  }

  if (planned.length === 0) {
    return <div className="p-4 text-sm text-gray-400 text-center">אין תרגילים מתוכננים לאימון זה</div>
  }

  // Group performed logs by exerciseId
  const performedMap = new Map<number, PerformedLog[]>()
  for (const log of performed) {
    if (!performedMap.has(log.exerciseId)) performedMap.set(log.exerciseId, [])
    performedMap.get(log.exerciseId)!.push(log)
  }

  // Exercises performed but not planned (extras)
  const plannedIds = new Set(planned.map(p => p.exerciseId))
  const extraPerformed = performed.filter(l => !plannedIds.has(l.exerciseId))
  const extraMap = new Map<number, PerformedLog[]>()
  for (const log of extraPerformed) {
    if (!extraMap.has(log.exerciseId)) extraMap.set(log.exerciseId, [])
    extraMap.get(log.exerciseId)!.push(log)
  }

  function renderPerformedCells(logs: PerformedLog[]) {
    return logs.map((l, i) => {
      const parts: string[] = []
      if (l.weightKG) parts.push(`${l.weightKG} KG`)
      if (l.repsDone) parts.push(`${l.repsDone} חז׳`)
      if (l.durationSec) parts.push(`${l.durationSec}s`)
      const side = l.handSide && l.handSide !== 'Both'
        ? (l.handSide === 'Right' ? 'ימין' : 'שמאל') + ': '
        : ''
      return (
        <span key={i} className="block leading-tight">
          {side}{parts.join(' · ') || '✓'}
        </span>
      )
    })
  }

  function formatSet(s: SetEntry): string {
    if (s.reps && s.weight) return `${s.reps}×${s.weight}KG`
    if (s.reps) return `${s.reps} חז׳`
    if (s.duration) return `${s.duration}s`
    return '✓'
  }

  // All exercises that have history (union of planned + extras with history)
  const allExerciseIds = [...new Set([
    ...planned.map(p => p.exerciseId),
    ...extraMap.keys(),
    ...historyMap.keys()
  ])]
  const exercisesWithHistory = allExerciseIds.filter(id => historyMap.has(id))

  return (
    <div className="px-4 py-3 space-y-4" dir="rtl">
      {!lastCalendarId && (
        <p className="text-xs text-amber-600">⚠️ האימון לא בוצע — מציג תוכנית בלבד</p>
      )}

      {/* Planned vs performed table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300 text-gray-500">
            <th className="text-right py-1 pr-2 font-semibold">תרגיל</th>
            <th className="text-center py-1 font-semibold w-16">סטים מתוכנן</th>
            <th className="text-center py-1 font-semibold w-16">חזרות מתוכנן</th>
            <th className="text-center py-1 font-semibold w-24">חזרות בוצע</th>
            <th className="text-center py-1 font-semibold w-20">משקל בוצע</th>
            <th className="text-center py-1 font-semibold w-20">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {planned.map(ex => {
            const logs = performedMap.get(ex.exerciseId) ?? []
            const done = logs.length > 0
            const firstLog = logs[0]
            return (
              <tr key={ex.exerciseId} className={`border-b border-gray-100 ${done ? '' : 'opacity-50'}`}>
                <td className="py-1.5 pr-2 font-medium text-gray-800">{ex.name}</td>
                <td className="text-center py-1.5 text-gray-500">{ex.sets ?? '—'}</td>
                <td className="text-center py-1.5 text-gray-500">{ex.reps ?? '—'}</td>
                <td className="text-center py-1.5 text-green-700 font-semibold">
                  {done ? renderPerformedCells(logs) : <span className="text-gray-400">—</span>}
                </td>
                <td className="text-center py-1.5 text-gray-700">
                  {done && firstLog?.weightKG ? `${firstLog.weightKG} KG` : '—'}
                </td>
                <td className="text-center py-1.5">
                  {done
                    ? <span className="text-green-600 font-bold">✅ בוצע</span>
                    : <span className="text-gray-400">לא בוצע</span>}
                </td>
              </tr>
            )
          })}

          {[...extraMap.entries()].map(([exerciseId, logs]) => {
            const firstLog = logs[0]
            return (
              <tr key={`extra-${exerciseId}`} className="border-b border-gray-100 bg-blue-50">
                <td className="py-1.5 pr-2 font-medium text-blue-800">
                  {firstLog.name} <span className="text-xs text-blue-500">(לא מתוכנן)</span>
                </td>
                <td className="text-center py-1.5 text-gray-400">—</td>
                <td className="text-center py-1.5 text-gray-400">—</td>
                <td className="text-center py-1.5 text-green-700 font-semibold">
                  {renderPerformedCells(logs)}
                </td>
                <td className="text-center py-1.5 text-gray-700">
                  {firstLog?.weightKG ? `${firstLog.weightKG} KG` : '—'}
                </td>
                <td className="text-center py-1.5">
                  <span className="text-blue-600 font-bold">✅ בוצע</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Performance history */}
      {exercisesWithHistory.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-xs font-bold text-gray-700">📈 היסטוריית ביצועים</h4>
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              בוצע {sessionCount} פעמים בטווח
            </span>
          </div>
          <div className="space-y-2">
            {exercisesWithHistory.map(exId => {
              const sessions = historyMap.get(exId)!
              // Sort by calendarId (ascending = chronological, since we ordered Calendar by StartTime asc)
              const sorted = [...sessions].sort((a, b) => a.calendarId - b.calendarId)
              const name = exerciseNames.get(exId) ?? `#${exId}`
              return (
                <div key={exId} className="bg-white rounded border border-gray-200 p-2">
                  <div className="text-xs font-semibold text-gray-800 mb-1">{name}</div>
                  <div className="space-y-0.5">
                    {sorted.map((session, i) => {
                      const setsStr = session.sets.map(formatSet).join(' • ')
                      const sideLabel = session.handSide
                        ? (session.handSide === 'Right' ? 'ימין' : 'שמאל') + ':'
                        : null
                      return (
                        <div key={`${session.calendarId}-${session.handSide ?? 'both'}-${i}`}
                             className="text-xs text-gray-600 font-mono flex gap-2">
                          <span className="text-gray-400 shrink-0">{session.date}</span>
                          {sideLabel && (
                            <span className="text-blue-600 shrink-0">{sideLabel}</span>
                          )}
                          <span>{setsStr}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}