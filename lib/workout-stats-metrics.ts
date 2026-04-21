// lib/workout-stats-metrics.ts
// 💪 Workout Statistics Metrics
// מחשב סטטיסטיקות אימונים - כמה פעמים בוצע כל אימון

import { supabase } from '@/lib/supabaseClient'

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface WorkoutStats {
  workoutId: number
  workoutName: string
  workoutCategory: string | null
  containClimbing: boolean
  containExercise: boolean
  totalSessions: number        // סה"כ פעמים שהאימון היה בלוח
  completedSessions: number    // כמה פעמים בוצע
  completionRate: number       // אחוז השלמה (0-100)
  averageRPE: number | null    // ממוצע RPE (רק של מה שבוצע)
  firstCompleted: string | null // תאריך ראשון שבוצע
  lastCompleted: string | null // תאריך אחרון שבוצע
  lastCalendarId: number | null // CalendarID של הסשן האחרון שבוצע
  totalWithRPE: number         // כמה אימונים יש להם RPE
}

export interface ExerciseSummary {
  exerciseId: number
  exerciseName: string
  hasWeight: boolean
  maxWeight: number       // 0 if no weight
  lastWeight: number
  totalSessions: number
  lastReps: number | null
  lastDuration: number | null
}

export interface WorkoutPerformance {
  workouts: WorkoutStats[]
  exerciseSummaries: ExerciseSummary[]
  totalSessions: number
  completedSessions: number
  overallCompletionRate: number
  dateRange: {
    start: string
    end: string
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════

export async function getWorkoutPerformance(
  email: string,
  startDate: string,
  endDate: string
): Promise<WorkoutPerformance> {
  
  // Fetch calendar entries with workout info
  const { data: calendar, error: calendarError } = await supabase
    .from('Calendar')
    .select(`
      CalendarID,
      WorkoutID,
      Completed,
      RPE,
      StartTime,
      Workouts:Calendar_WorkoutID_fkey(WorkoutID, Name, Category, containClimbing, containExercise)
    `)
    .eq('Email', email)
    .gte('StartTime', startDate)
    .lte('StartTime', `${endDate}T23:59:59.999`)
    .not('WorkoutID', 'is', null)
    .order('StartTime', { ascending: false })

  if (calendarError) {
    console.error('Error fetching workout stats:', calendarError)
    throw new Error('שגיאה בטעינת נתוני אימונים')
  }

  // Group by WorkoutID
  const workoutMap = new Map<number, {
    workoutName: string
    workoutCategory: string | null
    containClimbing: boolean
    containExercise: boolean
    sessions: any[]
    completedSessions: any[]
  }>()

  for (const entry of calendar || []) {
    const workoutId = entry.WorkoutID
    if (!workoutId) continue

    // @ts-ignore - Supabase nested type
    const workoutName = entry.Workouts?.Name || `Workout ${workoutId}`
    // @ts-ignore
    const workoutCategory = entry.Workouts?.Category || null
    
    // @ts-ignore
    const containClimbing = entry.Workouts?.containClimbing ?? false
    // @ts-ignore
    const containExercise = entry.Workouts?.containExercise ?? false

    if (!workoutMap.has(workoutId)) {
      workoutMap.set(workoutId, {
        workoutName,
        workoutCategory,
        containClimbing,
        containExercise,
        sessions: [],
        completedSessions: []
      })
    }

    const workoutData = workoutMap.get(workoutId)!
    workoutData.sessions.push(entry)
    
    if (entry.Completed) {
      workoutData.completedSessions.push(entry)
    }
  }

  // Calculate stats for each workout
  const workouts: WorkoutStats[] = []
  
  for (const [workoutId, data] of workoutMap.entries()) {
    const totalSessions = data.sessions.length
    const completedSessions = data.completedSessions.length
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

    // Calculate average RPE (only from completed sessions with RPE)
    const sessionsWithRPE = data.completedSessions.filter(s => s.RPE !== null && s.RPE !== undefined)
    const averageRPE = sessionsWithRPE.length > 0
      ? sessionsWithRPE.reduce((sum, s) => sum + s.RPE, 0) / sessionsWithRPE.length
      : null

    // Get last completed session (sorted by date desc)
    const sortedCompleted = [...data.completedSessions].sort(
      (a, b) => new Date(b.StartTime).getTime() - new Date(a.StartTime).getTime()
    )
    const lastCompleted = sortedCompleted[0]?.StartTime || null
    const firstCompleted = sortedCompleted[sortedCompleted.length - 1]?.StartTime || null
    const lastCalendarId = sortedCompleted[0]?.CalendarID ?? null

    workouts.push({
      workoutId,
      workoutName: data.workoutName,
      workoutCategory: data.workoutCategory,
      containClimbing: data.containClimbing,
      containExercise: data.containExercise,
      totalSessions,
      completedSessions,
      completionRate,
      averageRPE,
      firstCompleted,
      lastCompleted,
      lastCalendarId,
      totalWithRPE: sessionsWithRPE.length
    })
  }

  // Sort by total sessions (most frequent first)
  workouts.sort((a, b) => b.totalSessions - a.totalSessions)

  // Calculate overall stats
  const totalSessions = calendar?.length || 0
  const completedSessions = calendar?.filter(c => c.Completed).length || 0
  const overallCompletionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

  // Fetch exercise-level summaries from ExerciseLogs
  const { data: exerciseLogs } = await supabase
    .from('ExerciseLogs')
    .select('ExerciseID, WeightKG, RepsDone, DurationSec, CreatedAt, Exercises!exerciselogs_ExerciseID_fkey(Name)')
    .eq('Email', email)
    .eq('Completed', true)
    .gte('CreatedAt', startDate)
    .lte('CreatedAt', `${endDate}T23:59:59.999`)
    .order('CreatedAt', { ascending: true })

  const exerciseMap = new Map<number, {
    name: string
    weights: number[]
    reps: (number | null)[]
    durations: (number | null)[]
  }>()

  for (const log of exerciseLogs || []) {
    const id = log.ExerciseID
    if (!id) continue
    // @ts-ignore
    const name = (Array.isArray(log.Exercises) ? log.Exercises[0] : log.Exercises)?.Name || `Exercise ${id}`
    if (!exerciseMap.has(id)) exerciseMap.set(id, { name, weights: [], reps: [], durations: [] })
    const e = exerciseMap.get(id)!
    e.weights.push(log.WeightKG ?? 0)
    e.reps.push(log.RepsDone ?? null)
    e.durations.push(log.DurationSec ?? null)
  }

  const exerciseSummaries: ExerciseSummary[] = []
  for (const [exerciseId, e] of exerciseMap) {
    const maxWeight = Math.max(...e.weights)
    const hasWeight = maxWeight > 0
    const lastWeight = e.weights[e.weights.length - 1] ?? 0
    const lastReps = e.reps[e.reps.length - 1] ?? null
    const lastDuration = e.durations[e.durations.length - 1] ?? null
    exerciseSummaries.push({
      exerciseId,
      exerciseName: e.name,
      hasWeight,
      maxWeight,
      lastWeight,
      totalSessions: e.weights.length,
      lastReps,
      lastDuration,
    })
  }
  exerciseSummaries.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))

  return {
    workouts,
    exerciseSummaries,
    totalSessions,
    completedSessions,
    overallCompletionRate,
    dateRange: { start: startDate, end: endDate }
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

export function getCompletionRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600'
  if (rate >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

export function getCompletionRateBgColor(rate: number): string {
  if (rate >= 80) return 'bg-green-100 border-green-300'
  if (rate >= 50) return 'bg-yellow-100 border-yellow-300'
  return 'bg-red-100 border-red-300'
}

export function getRPEColor(rpe: number): string {
  if (rpe >= 9) return 'text-red-600'
  if (rpe >= 7) return 'text-orange-600'
  if (rpe >= 5) return 'text-yellow-600'
  return 'text-green-600'
}

export function getRPELabel(rpe: number): string {
  if (rpe >= 9) return '🔴 קשה מאוד'
  if (rpe >= 7) return '🟠 קשה'
  if (rpe >= 5) return '🟡 בינוני'
  return '🟢 קל'
}