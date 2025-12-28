// lib/climbing-stats-metrics.ts
// 🧗 Climbing Performance Metrics
// מחשב סטטיסטיקות טיפוס לפי סוג ודירוג

import { supabase } from '@/lib/supabaseClient'

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface GradeStats {
  gradeId: number
  gradeName: string
  climbType: 'Boulder' | 'Board' | 'Lead'  // Added type per grade
  successfulRoutes: number
  attemptsWithSuccess: number
  attemptsWithoutSuccess: number
  totalAttempts: number
  successRate: number
  avgAttemptsToSuccess: number
}

export interface ClimbTypeStats {
  type: 'Boulder' | 'Lead' | 'Board'
  grades: GradeStats[]
  totalRoutes: number
  totalSuccesses: number
  totalAttempts: number
  overallSuccessRate: number
}

export interface ClimbingPerformance {
  boulder: ClimbTypeStats | null
  lead: ClimbTypeStats | null
  board: ClimbTypeStats | null
  totalRoutes: number
  totalSuccesses: number
  dateRange: {
    start: string
    end: string
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════

export async function getClimbingPerformance(
  email: string,
  startDate: string,
  endDate: string
): Promise<ClimbingPerformance> {
  
  const { data: logs, error } = await supabase
    .from('ClimbingLog')
    .select('ClimbingLogID, ClimbType, GradeID, Attempts, Successful, LogDateTime')
    .eq('Email', email)
    .gte('LogDateTime', startDate)
    .lte('LogDateTime', `${endDate}T23:59:59.999`)
    .order('LogDateTime', { ascending: false })

  if (error) {
    console.error('Error fetching climbing logs:', error)
    throw new Error('שגיאה בטעינת נתוני טיפוס')
  }

  // Get grade names separately
  const gradeIds = [...new Set((logs || []).map(l => l.GradeID).filter(Boolean))]
  
  const [boulderGrades, leadGrades] = await Promise.all([
    supabase.from('BoulderGrades').select('BoulderGradeID, VGrade').in('BoulderGradeID', gradeIds),
    supabase.from('LeadGrades').select('LeadGradeID, FrenchGrade').in('LeadGradeID', gradeIds)
  ])

  const boulderGradeMap = new Map(
    (boulderGrades.data || []).map(g => [g.BoulderGradeID, g.VGrade])
  )
  const leadGradeMap = new Map(
    (leadGrades.data || []).map(g => [g.LeadGradeID, g.FrenchGrade])
  )

  // Enrich logs with grade names
  const enrichedLogs = (logs || []).map(log => ({
    ...log,
    GradeName: log.ClimbType === 'Boulder' || log.ClimbType === 'Board'
      ? boulderGradeMap.get(log.GradeID) || `V${log.GradeID}`
      : leadGradeMap.get(log.GradeID) || `Grade ${log.GradeID}`
  }))

  const boulderStats = processClimbType(enrichedLogs, 'Boulder')
  const leadStats = processClimbType(enrichedLogs, 'Lead')
  const boardStats = processClimbType(enrichedLogs, 'Board')

  const totalRoutes = enrichedLogs.length
  const totalSuccesses = enrichedLogs.filter(l => l.Successful).length

  return {
    boulder: boulderStats,
    lead: leadStats,
    board: boardStats,
    totalRoutes,
    totalSuccesses,
    dateRange: { start: startDate, end: endDate }
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function processClimbType(
  logs: any[],
  type: 'Boulder' | 'Lead' | 'Board'
): ClimbTypeStats | null {
  
  const typeLogs = logs.filter(l => l.ClimbType === type)
  
  if (typeLogs.length === 0) {
    return null
  }

  const gradeMap = new Map<number, {
    gradeName: string
    successful: any[]
    failed: any[]
  }>()

  for (const log of typeLogs) {
    const gradeId = log.GradeID
    if (gradeId === null || gradeId === undefined) continue

    const gradeName = log.GradeName || `Grade ${gradeId}`
    
    if (!gradeMap.has(gradeId)) {
      gradeMap.set(gradeId, {
        gradeName,
        successful: [],
        failed: []
      })
    }

    const gradeData = gradeMap.get(gradeId)!
    
    if (log.Successful) {
      gradeData.successful.push(log)
    } else {
      gradeData.failed.push(log)
    }
  }

  const grades: GradeStats[] = []
  
  for (const [gradeId, data] of gradeMap.entries()) {
    const successfulRoutes = data.successful.length
    const attemptsWithSuccess = data.successful.reduce((sum, log) => sum + (log.Attempts || 1), 0)
    const attemptsWithoutSuccess = data.failed.reduce((sum, log) => sum + (log.Attempts || 1), 0)
    const totalAttempts = attemptsWithSuccess + attemptsWithoutSuccess
    const successRate = totalAttempts > 0 
      ? (successfulRoutes / (successfulRoutes + data.failed.length)) * 100 
      : 0
    const avgAttemptsToSuccess = successfulRoutes > 0
      ? attemptsWithSuccess / successfulRoutes
      : 0

    grades.push({
      gradeId,
      gradeName: data.gradeName,
      climbType: type,
      successfulRoutes,
      attemptsWithSuccess,
      attemptsWithoutSuccess,
      totalAttempts,
      successRate,
      avgAttemptsToSuccess
    })
  }

  grades.sort((a, b) => b.gradeId - a.gradeId)

  const totalRoutes = typeLogs.length
  const totalSuccesses = typeLogs.filter(l => l.Successful).length
  const totalAttempts = typeLogs.reduce((sum, log) => sum + (log.Attempts || 1), 0)
  const overallSuccessRate = totalRoutes > 0 ? (totalSuccesses / totalRoutes) * 100 : 0

  return {
    type,
    grades,
    totalRoutes,
    totalSuccesses,
    totalAttempts,
    overallSuccessRate
  }
}

export function getSuccessRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600'
  if (rate >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

export function getSuccessRateBgColor(rate: number): string {
  if (rate >= 80) return 'bg-green-100 border-green-300'
  if (rate >= 50) return 'bg-yellow-100 border-yellow-300'
  return 'bg-red-100 border-red-300'
}

export function getSuccessRateLabel(rate: number): string {
  if (rate >= 80) return '🟢 מצוין'
  if (rate >= 50) return '🟡 בינוני'
  return '🔴 צריך שיפור'
}