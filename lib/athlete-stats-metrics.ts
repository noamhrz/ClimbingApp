// lib/athlete-stats-metrics.ts
// 📊 לוגיקת חישוב סטטיסטיקות מתאמן
// ✅ Workout Completion Rate
// 😴 Sleep Average

import { supabase } from '@/lib/supabaseClient'

export interface ProfileMetrics {
  userName: string
  // Workout metrics
  totalWorkouts: number
  completedWorkouts: number
  workoutCompletion: number  // percentage
  
  // Sleep metrics
  sleepAverage: number  // hours
  sleepDaysReported: number
}

/**
 * Get profile metrics for a user in a date range
 */
export async function getProfileMetrics(
  email: string,
  startDate: string,
  endDate: string
): Promise<ProfileMetrics> {
  // ═══════════════════════════════════════════════════════
  // 📝 Get user name
  // ═══════════════════════════════════════════════════════
  const { data: user, error: userError } = await supabase
    .from('Users')
    .select('Name')
    .eq('Email', email)
    .single()

  if (userError) {
    throw new Error(`Failed to fetch user: ${userError.message}`)
  }

  // ═══════════════════════════════════════════════════════
  // ✅ Calculate workout completion rate
  // ═══════════════════════════════════════════════════════
  const { data: workouts, error: workoutsError } = await supabase
    .from('Calendar')
    .select('CalendarID, Completed')
    .eq('Email', email)
    .gte('StartTime', startDate)
    .lte('StartTime', `${endDate}T23:59:59.999`)

  if (workoutsError) {
    console.warn('⚠️ Error fetching workouts:', workoutsError)
  }

  const totalWorkouts = workouts?.length || 0
  const completedWorkouts = workouts?.filter((w: any) => w.Completed === true).length || 0
  const workoutCompletion = totalWorkouts > 0 
    ? (completedWorkouts / totalWorkouts) * 100 
    : 0

  // ═══════════════════════════════════════════════════════
  // 😴 Calculate sleep average
  // ═══════════════════════════════════════════════════════
  const { data: wellnessData, error: wellnessError } = await supabase
    .from('WellnessLog')
    .select('SleepHours')
    .eq('Email', email)
    .gte('Date', startDate)
    .lte('Date', `${endDate}T23:59:59.999`)
    .not('SleepHours', 'is', null)
    .gt('SleepHours', 0)  // Only include actual reported sleep

  if (wellnessError) {
    console.warn('⚠️ Error fetching wellness data:', wellnessError)
  }

  const sleepRecords = wellnessData || []
  const sleepDaysReported = sleepRecords.length
  const sleepAverage = sleepDaysReported > 0
    ? sleepRecords.reduce((sum: number, record) => sum + (record.SleepHours || 0), 0) / sleepDaysReported
    : 0

  return {
    userName: user.Name,
    totalWorkouts,
    completedWorkouts,
    workoutCompletion,
    sleepAverage,
    sleepDaysReported
  }
}

/**
 * Get color for workout completion percentage
 */
export function getWorkoutCompletionColor(percentage: number): string {
  if (percentage >= 80) return 'green'
  if (percentage >= 50) return 'yellow'
  return 'red'
}

/**
 * Get color for sleep average
 */
export function getSleepColor(hours: number): string {
  if (hours >= 8) return 'green'
  if (hours >= 6) return 'yellow'
  return 'red'
}

/**
 * Get sleep status text
 */
export function getSleepStatus(hours: number): string {
  if (hours >= 8) return 'מעולה!'
  if (hours >= 6) return 'בינוני'
  return 'נמוך מדי'
}