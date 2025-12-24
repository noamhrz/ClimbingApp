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
  totalSessions: number        // סה"כ פעמים שהאימון היה בלוח
  completedSessions: number    // כמה פעמים בוצע
  completionRate: number       // אחוז השלמה (0-100)
  averageRPE: number | null    // ממוצע RPE (רק של מה שבוצע)
  lastCompleted: string | null // תאריך אחרון שבוצע
  totalWithRPE: number         // כמה אימונים יש להם RPE
}

export interface WorkoutPerformance {
  workouts: WorkoutStats[]
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
      Workouts!inner(WorkoutID, Name)
    `)
    .eq('Email', email)
    .gte('StartTime', startDate)
    .lte('StartTime', endDate)
    .not('WorkoutID', 'is', null)
    .order('StartTime', { ascending: false })

  if (calendarError) {
    console.error('Error fetching workout stats:', calendarError)
    throw new Error('שגיאה בטעינת נתוני אימונים')
  }

  // Group by WorkoutID
  const workoutMap = new Map<number, {
    workoutName: string
    sessions: any[]
    completedSessions: any[]
  }>()

  for (const entry of calendar || []) {
    const workoutId = entry.WorkoutID
    if (!workoutId) continue

    // @ts-ignore - Supabase nested type
    const workoutName = entry.Workouts?.Name || `Workout ${workoutId}`
    
    if (!workoutMap.has(workoutId)) {
      workoutMap.set(workoutId, {
        workoutName,
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

    // Get last completed date
    const completedDates = data.completedSessions
      .map(s => s.StartTime)
      .filter(Boolean)
      .sort()
      .reverse()
    const lastCompleted = completedDates[0] || null

    workouts.push({
      workoutId,
      workoutName: data.workoutName,
      totalSessions,
      completedSessions,
      completionRate,
      averageRPE,
      lastCompleted,
      totalWithRPE: sessionsWithRPE.length
    })
  }

  // Sort by total sessions (most frequent first)
  workouts.sort((a, b) => b.totalSessions - a.totalSessions)

  // Calculate overall stats
  const totalSessions = calendar?.length || 0
  const completedSessions = calendar?.filter(c => c.Completed).length || 0
  const overallCompletionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

  return {
    workouts,
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