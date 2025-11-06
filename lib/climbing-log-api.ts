// lib/climbing-log-api.ts
// API functions for Climbing Log CRUD operations

import { supabase } from '@/lib/supabaseClient'
import { ClimbingLogEntry, BoulderGrade, LeadGrade, BoardType, ClimbingLocation } from '@/types/climbing'

/**
 * Fetch all climbing logs for a user with optional filters
 */
export async function fetchClimbingLogs(
  email: string,
  filters?: {
    startDate?: string
    endDate?: string
    climbType?: 'Boulder' | 'Board' | 'Lead' | 'all'
    minGradeId?: number | null
    maxGradeId?: number | null
  }
): Promise<ClimbingLogEntry[]> {
  let query = supabase
    .from('ClimbingLog')
    .select('*')
    .eq('Email', email)
    .order('LogDateTime', { ascending: false })

  // Apply date filters
  if (filters?.startDate) {
    query = query.gte('LogDateTime', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('LogDateTime', filters.endDate)
  }

  // Apply climb type filter (FIXED TYPE)
  if (filters?.climbType && filters.climbType !== 'all') {
    const climbType = filters.climbType as 'Boulder' | 'Board' | 'Lead'
    query = query.eq('ClimbType', climbType)
  }

  // Apply grade filters (only if not null)
  if (filters?.minGradeId !== undefined && filters.minGradeId !== null) {
    query = query.gte('GradeID', filters.minGradeId)
  }
  if (filters?.maxGradeId !== undefined && filters.maxGradeId !== null) {
    query = query.lte('GradeID', filters.maxGradeId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Add a new climbing log entry
 */
export async function addClimbingLog(
  email: string,
  logData: {
    ClimbType: 'Boulder' | 'Board' | 'Lead'
    GradeID: number | null
    RouteName: string | null
    Attempts: number
    Successful: boolean
    LogDateTime: string // ISO format
    LocationID?: number | null
    BoardTypeID?: number | null
    DurationSeconds?: number | null
    Notes?: string | null
  }
): Promise<ClimbingLogEntry> {
  const { data, error } = await supabase
    .from('ClimbingLog')
    .insert({
      Email: email,
      WorkoutID: null, // Not linking to workout
      CalendarID: null, // Not linking to calendar
      ...logData,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a climbing log entry
 */
export async function deleteClimbingLog(climbingLogId: number): Promise<void> {
  const { error } = await supabase
    .from('ClimbingLog')
    .delete()
    .eq('ClimbingLogID', climbingLogId)

  if (error) throw error
}

/**
 * Fetch all boulder grades
 */
export async function fetchBoulderGrades(): Promise<BoulderGrade[]> {
  const { data, error } = await supabase
    .from('BoulderGrades')
    .select('*')
    .order('BoulderGradeID')

  if (error) throw error
  return data || []
}

/**
 * Fetch all lead grades
 */
export async function fetchLeadGrades(): Promise<LeadGrade[]> {
  const { data, error } = await supabase
    .from('LeadGrades')
    .select('*')
    .order('LeadGradeID')

  if (error) throw error
  return data || []
}

/**
 * Fetch all board types
 */
export async function fetchBoardTypes(): Promise<BoardType[]> {
  const { data, error } = await supabase
    .from('BoardTypes')
    .select('*')
    .order('BoardName')

  if (error) throw error
  return data || []
}

/**
 * Fetch all climbing locations
 */
export async function fetchClimbingLocations(): Promise<ClimbingLocation[]> {
  const { data, error } = await supabase
    .from('ClimbingLocations')
    .select('*')
    .order('LocationName')

  if (error) throw error
  return data || []
}

/**
 * Calculate histogram data for Boulder+Board with separate counts (STACKED)
 */
export function calculateHistogramSplit(
  logs: ClimbingLogEntry[],
  boulderGrades: BoulderGrade[]
): {
  gradeLabel: string
  boulderCount: number
  boardCount: number
}[] {
  // Filter only Boulder and Board
  const boulderBoardLogs = logs.filter(
    (log) => log.ClimbType === 'Boulder' || log.ClimbType === 'Board'
  )

  // Group by grade and type
  const gradeData = new Map<
    number,
    { boulder: number; board: number; gradeLabel: string }
  >()

  boulderBoardLogs.forEach((log) => {
    if (log.GradeID !== null && log.GradeID !== undefined) {
      if (!gradeData.has(log.GradeID)) {
        const grade = boulderGrades.find((g) => g.BoulderGradeID === log.GradeID)
        const label = grade ? grade.VGrade : ''
        gradeData.set(log.GradeID, { boulder: 0, board: 0, gradeLabel: label })
      }

      const data = gradeData.get(log.GradeID)!
      if (log.ClimbType === 'Boulder') {
        data.boulder++
      } else if (log.ClimbType === 'Board') {
        data.board++
      }
    }
  })

  // Convert to array
  return Array.from(gradeData.values())
    .map((data) => ({
      gradeLabel: data.gradeLabel,
      boulderCount: data.boulder,
      boardCount: data.board,
    }))
    .sort((a, b) =>
      a.gradeLabel.localeCompare(b.gradeLabel, undefined, { numeric: true })
    )
}

/**
 * Calculate histogram for Lead
 */
export function calculateHistogramLead(
  logs: ClimbingLogEntry[],
  leadGrades: LeadGrade[]
): { gradeLabel: string; count: number }[] {
  // Filter only Lead
  const leadLogs = logs.filter((log) => log.ClimbType === 'Lead')

  // Group by grade
  const gradeCounts = new Map<number, number>()
  leadLogs.forEach((log) => {
    if (log.GradeID !== null && log.GradeID !== undefined) {
      gradeCounts.set(log.GradeID, (gradeCounts.get(log.GradeID) || 0) + 1)
    }
  })

  // Map to grade labels
  return Array.from(gradeCounts.entries())
    .map(([gradeId, count]) => {
      const grade = leadGrades.find((g) => g.LeadGradeID === gradeId)
      const gradeLabel = grade ? grade.FrenchGrade : ''
      return { gradeLabel, count }
    })
    .sort((a, b) =>
      a.gradeLabel.localeCompare(b.gradeLabel, undefined, { numeric: true })
    )
}