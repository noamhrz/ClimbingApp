// lib/exercise-stats-metrics.ts
// 💪 לוגיקת חישוב סטטיסטיקות תרגילים
// ✅ Left vs Right comparison
// 📊 Progress tracking

import { supabase } from '@/lib/supabaseClient'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface HandStats {
  current: number          // ערך אחרון
  max: number             // מקסימום
  avg: number             // ממוצע
  stdDev: number          // סטיית תקן
  trend: number           // שינוי % (last 5 vs previous 5)
  last5: number[]         // 5 אימונים אחרונים
  totalSessions: number   // סה"כ אימונים
  unit: 'KG' | 'reps' | 'seconds'  // יחידת מדידה
  isBodyWeight?: boolean  // האם זה תרגיל משקל גוף
}

export interface ImbalanceStats {
  currentGap: number      // פער נוכחי (%)
  avgGap: number          // פער ממוצע (%)
  maxGap: number          // פער מקסימלי (%)
  status: 'good' | 'warning' | 'critical'
  message: string
}

export interface ExerciseStats {
  exerciseId: number
  exerciseName: string
  category: string
  isSingleHand: boolean
  
  rightHand?: HandStats
  leftHand?: HandStats
  bothHands?: HandStats
  
  imbalance?: ImbalanceStats
}

export interface ExercisePerformance {
  exercises: ExerciseStats[]
  bodyWeightKG: number
  dateRange: {
    start: string
    end: string
  }
}

// ═══════════════════════════════════════════════════════════════════
// Main Function
// ═══════════════════════════════════════════════════════════════════

export async function getExercisePerformance(
  email: string,
  startDate: string,
  endDate: string
): Promise<ExercisePerformance> {
  
  try {
    // Fetch user's body weight for scale calculation
    const { data: profileData, error: profileError } = await supabase
      .from('Profiles')
      .select('BodyWeightKG')
      .eq('Email', email)
      .single()
    
    if (profileError) {
      console.warn('⚠️ Profile fetch error:', profileError)
    }
    
    const bodyWeightKG = profileData?.BodyWeightKG || 70 // Default to 70kg

    // Fetch exercise logs with exercise info
    const { data: logs, error: logsError } = await supabase
      .from('ExerciseLogs')
      .select(`
        ExerciseLogID,
        ExerciseID,
        HandSide,
        WeightKG,
        RepsDone,
        DurationSec,
        RPE,
        CreatedAt,
        Exercises!exerciselogs_ExerciseID_fkey(ExerciseID, Name, Category, IsSingleHand, isDuration)
      `)
      .eq('Email', email)
      .gte('CreatedAt', startDate)
      .lte('CreatedAt', `${endDate}T23:59:59.999`)
      .eq('Completed', true)
      .order('CreatedAt', { ascending: true })

    if (logsError) {
      console.error('Error fetching exercise logs:', logsError)
      throw new Error('שגיאה בטעינת נתוני תרגילים')
    }

    // Group by ExerciseID
    const exerciseMap = new Map<number, {
      exerciseName: string
      category: string
      isSingleHand: boolean
      isDuration: boolean
      rightLogs: any[]
      leftLogs: any[]
      bothLogs: any[]
    }>()

    for (const log of logs || []) {
      const exerciseId = log.ExerciseID
      
      // @ts-ignore - Supabase nested type can be array or object
      const exerciseData = Array.isArray(log.Exercises) ? log.Exercises[0] : log.Exercises
      
      if (!exerciseData) continue

      // @ts-ignore - Access nested properties
      const exerciseName = exerciseData.Name || `Exercise ${exerciseId}`
      // @ts-ignore
      const category = exerciseData.Category || 'אחר'
      // @ts-ignore
      const isSingleHand = exerciseData.IsSingleHand || false
      // @ts-ignore
      const isDuration = exerciseData.isDuration || false

      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, {
          exerciseName,
          category,
          isSingleHand,
          isDuration,
          rightLogs: [],
          leftLogs: [],
          bothLogs: []
        })
      }

      const data = exerciseMap.get(exerciseId)!
      
      if (log.HandSide === 'Right') {
        data.rightLogs.push(log)
      } else if (log.HandSide === 'Left') {
        data.leftLogs.push(log)
      } else if (log.HandSide === 'Both') {
        data.bothLogs.push(log)
      }
    }

    // Calculate stats for each exercise
    const exercises: ExerciseStats[] = []

    for (const [exerciseId, data] of exerciseMap) {
      const stats: ExerciseStats = {
        exerciseId,
        exerciseName: data.exerciseName,
        category: data.category,
        isSingleHand: data.isSingleHand
      }

      // Calculate right hand stats
      if (data.rightLogs.length > 0) {
        stats.rightHand = calculateHandStats(data.rightLogs, data.isDuration)
      }

      // Calculate left hand stats
      if (data.leftLogs.length > 0) {
        stats.leftHand = calculateHandStats(data.leftLogs, data.isDuration)
      }

      // Calculate both hands stats
      if (data.bothLogs.length > 0) {
        stats.bothHands = calculateHandStats(data.bothLogs, data.isDuration)
      }

      // Only add exercises with valid data
      if (stats.rightHand || stats.leftHand || stats.bothHands) {
        // Calculate imbalance if single hand exercise
        if (data.isSingleHand && stats.rightHand && stats.leftHand) {
          stats.imbalance = calculateImbalance(stats.rightHand, stats.leftHand)
        }

        exercises.push(stats)
      }
    }

    // Sort by category, then by exercise name
    exercises.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.exerciseName.localeCompare(b.exerciseName)
    })

    return {
      exercises,
      bodyWeightKG,
      dateRange: {
        start: startDate,
        end: endDate
      }
    }

  } catch (error) {
    console.error('Error in getExercisePerformance:', error)
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════
// Helper: Calculate Hand Stats
// ═══════════════════════════════════════════════════════════════════

function calculateHandStats(logs: any[], isDuration: boolean = false): HandStats {
  // Determine unit and values based on priority:
  // 1. WeightKG (if exists) - primary metric for strength
  // 2. DurationSec (if isDuration flag)
  // 3. RepsDone (for body weight exercises)
  
  let unit: 'KG' | 'reps' | 'seconds' = 'reps'
  let values: number[] = []
  let isBodyWeight = false

  // Check if we have weight data
  const hasWeight = logs.some(l => l.WeightKG && l.WeightKG > 0)
  const hasReps = logs.some(l => l.RepsDone && l.RepsDone > 0)
  const hasDuration = logs.some(l => l.DurationSec && l.DurationSec > 0)
  
  if (hasWeight) {
    // Priority 1: Weight-based exercise (e.g., Max Strength tests, Weighted exercises)
    unit = 'KG'
    values = logs.map(l => l.WeightKG || 0).filter(v => v > 0)
  } else if (isDuration) {
    // Priority 2: Duration-based exercise (e.g., Plank, Timed Hangs)
    unit = 'seconds'
    values = logs.map(l => l.DurationSec || 0).filter(v => v > 0)
  } else if (hasReps) {
    // Priority 3: Body Weight exercise (has reps but no weight)
    unit = 'reps'
    isBodyWeight = true
    values = logs.map(l => l.RepsDone || 0).filter(v => v > 0)
  } else if (hasDuration) {
    // Duration without reps or weight
    unit = 'seconds'
    isBodyWeight = true
    values = logs.map(l => l.DurationSec || 0).filter(v => v > 0)
  } else {
    // Fallback
    unit = 'reps'
    values = []
  }
  
  // Note: RepsDone can coexist with Weight or Duration as a secondary metric

  if (values.length === 0) {
    // No valid data - return null instead of empty stats
    return null as any  // Will be filtered out
  }

  // Calculate stats
  const current = values[values.length - 1]
  const max = Math.max(...values)
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length

  // Standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  // Last 5 values
  const last5 = values.slice(-5)

  // Trend: compare last 5 avg vs previous 5 avg
  let trend = 0
  if (values.length >= 10) {
    const previous5 = values.slice(-10, -5)
    const avgLast5 = last5.reduce((sum, v) => sum + v, 0) / last5.length
    const avgPrev5 = previous5.reduce((sum, v) => sum + v, 0) / previous5.length
    trend = ((avgLast5 - avgPrev5) / avgPrev5) * 100
  }

  return {
    current,
    max,
    avg,
    stdDev,
    trend,
    last5,
    totalSessions: values.length,
    unit,
    isBodyWeight
  }
}

// ═══════════════════════════════════════════════════════════════════
// Helper: Calculate Imbalance
// ═══════════════════════════════════════════════════════════════════

function calculateImbalance(
  rightHand: HandStats,
  leftHand: HandStats
): ImbalanceStats {
  
  // Current gap
  const currentGap = rightHand.current > 0
    ? ((rightHand.current - leftHand.current) / rightHand.current) * 100
    : 0

  // Average gap
  const avgGap = rightHand.avg > 0
    ? ((rightHand.avg - leftHand.avg) / rightHand.avg) * 100
    : 0

  // Max gap (from last 5)
  const gaps = rightHand.last5.map((r, i) => {
    const l = leftHand.last5[i]
    return r > 0 ? ((r - l) / r) * 100 : 0
  })
  const maxGap = Math.max(...gaps.map(Math.abs))

  // Determine status
  let status: 'good' | 'warning' | 'critical'
  let message: string

  if (Math.abs(avgGap) < 10) {
    status = 'good'
    message = '✅ איזון טוב'
  } else if (Math.abs(avgGap) < 20) {
    status = 'warning'
    message = '⚠️ פער קל - לשים לב'
  } else {
    status = 'critical'
    message = '🔴 פער משמעותי - להתייחס!'
  }

  return {
    currentGap,
    avgGap,
    maxGap,
    status,
    message
  }
}

// ═══════════════════════════════════════════════════════════════════
// Helper: Format Number
// ═══════════════════════════════════════════════════════════════════

export function formatValue(value: number, unit: string, isBodyWeight?: boolean): string {
  if (unit === 'KG') {
    if (isBodyWeight) {
      return 'Body Weight'  // Only if no other data
    }
    return `${value.toFixed(1)} KG`
  } else if (unit === 'seconds') {
    return `${value.toFixed(0)}s`
  } else if (unit === 'reps') {
    return `${value.toFixed(0)} reps`
  } else {
    return `${value.toFixed(0)} reps`
  }
}