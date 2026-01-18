// lib/goals-progress-api.ts
// 📊 Goals Progress Tracker - Compare goals vs actual climbs

import { supabase } from '@/lib/supabaseClient'

export interface GoalProgress {
  grade: string           // 'V4', '6a', etc.
  gradeId: number        // For internal use
  target: number         // How many climbs wanted
  actual: number         // How many climbs done (successful)
  remaining: number      // target - actual
  percentage: number     // (actual / target) * 100
}

// ═══════════════════════════════════════════════════════════════
// Helper: Get quarter date range
// ═══════════════════════════════════════════════════════════════
function getQuarterDateRange(year: number, quarter: number) {
  const quarters = {
    1: { start: `${year}-01-01`, end: `${year}-03-31` },
    2: { start: `${year}-04-01`, end: `${year}-06-30` },
    3: { start: `${year}-07-01`, end: `${year}-09-30` },
    4: { start: `${year}-10-01`, end: `${year}-12-31` },
  }
  
  return quarters[quarter as keyof typeof quarters]
}

// ═══════════════════════════════════════════════════════════════
// Get Boulder Progress (Boulder + Board combined)
// ═══════════════════════════════════════════════════════════════
export async function getBoulderProgress(
  email: string,
  year: number,
  quarter: number
): Promise<GoalProgress[]> {
  try {
    const dateRange = getQuarterDateRange(year, quarter)
    
    // 1. Get goals from BoulderGoals
    const { data: boulderGoals } = await supabase
      .from('BoulderGoals')
      .select('*')
      .eq('Email', email)
      .eq('Year', year)
      .eq('Quarter', quarter)
      .single()
    
    // 2. Get goals from BoardGoals
    const { data: boardGoals } = await supabase
      .from('BoardGoals')
      .select('*')
      .eq('Email', email)
      .eq('Year', year)
      .eq('Quarter', quarter)
      .single()
    
    // 3. Get actual climbs from ClimbingLog (Boulder + Board, Successful only)
    const { data: climbs } = await supabase
      .from('ClimbingLog')
      .select('GradeID, ClimbType')
      .eq('Email', email)
      .in('ClimbType', ['Boulder', 'Board'])
      .eq('Successful', true)
      .gte('LogDateTime', dateRange.start)
      .lte('LogDateTime', dateRange.end + 'T23:59:59.999')
    
    // 4. Get grade names
    const { data: grades } = await supabase
      .from('BoulderGrades')
      .select('BoulderGradeID, VGrade')
      .order('BoulderGradeID')
    
    if (!grades) return []
    
    // 5. Count actual climbs per grade
    const actualCounts = new Map<number, number>()
    climbs?.forEach(climb => {
      const count = actualCounts.get(climb.GradeID) || 0
      actualCounts.set(climb.GradeID, count + 1)
    })
    
    // 6. Combine Boulder + Board goals
    const combinedGoals = new Map<number, number>()
    
    // Add boulder goals
    if (boulderGoals) {
      grades.forEach(grade => {
        const key = `V${grade.BoulderGradeID}`
        const target = (boulderGoals as any)[key] || 0
        if (target > 0) {
          combinedGoals.set(grade.BoulderGradeID, target)
        }
      })
    }
    
    // Add board goals to the same grades
    if (boardGoals) {
      grades.forEach(grade => {
        const key = `V${grade.BoulderGradeID}`
        const boardTarget = (boardGoals as any)[key] || 0
        if (boardTarget > 0) {
          const existing = combinedGoals.get(grade.BoulderGradeID) || 0
          combinedGoals.set(grade.BoulderGradeID, existing + boardTarget)
        }
      })
    }
    
    // 7. Build progress array
    const progress: GoalProgress[] = []
    
    combinedGoals.forEach((target, gradeId) => {
      const grade = grades.find(g => g.BoulderGradeID === gradeId)
      if (!grade) return
      
      const actual = actualCounts.get(gradeId) || 0
      const remaining = Math.max(0, target - actual)
      const percentage = target > 0 ? Math.round((actual / target) * 100) : 0
      
      progress.push({
        grade: grade.VGrade,
        gradeId,
        target,
        actual,
        remaining,
        percentage
      })
    })
    
    // Sort by grade (hardest first for pyramid display)
    return progress.sort((a, b) => b.gradeId - a.gradeId)
    
  } catch (error) {
    console.error('❌ Error fetching boulder progress:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
// Get Lead Progress
// ═══════════════════════════════════════════════════════════════
export async function getLeadProgress(
  email: string,
  year: number,
  quarter: number
): Promise<GoalProgress[]> {
  try {
    const dateRange = getQuarterDateRange(year, quarter)
    
    // 1. Get goals from LeadGoals
    const { data: leadGoals } = await supabase
      .from('LeadGoals')
      .select('*')
      .eq('Email', email)
      .eq('Year', year)
      .eq('Quarter', quarter)
      .single()
    
    if (!leadGoals) return []
    
    // 2. Get actual climbs from ClimbingLog (Lead, Successful only)
    const { data: climbs } = await supabase
      .from('ClimbingLog')
      .select('GradeID')
      .eq('Email', email)
      .eq('ClimbType', 'Lead')
      .eq('Successful', true)
      .gte('LogDateTime', dateRange.start)
      .lte('LogDateTime', dateRange.end + 'T23:59:59.999')
    
    // 3. Get grade names
    const { data: grades } = await supabase
      .from('LeadGrades')
      .select('LeadGradeID, FrenchGrade')
      .gte('LeadGradeID', 8)  // Start from 5c
      .order('LeadGradeID')
    
    if (!grades) return []
    
    // 4. Count actual climbs per grade
    const actualCounts = new Map<number, number>()
    climbs?.forEach(climb => {
      const count = actualCounts.get(climb.GradeID) || 0
      actualCounts.set(climb.GradeID, count + 1)
    })
    
    // 5. Build progress array
    const progress: GoalProgress[] = []
    
    grades.forEach(grade => {
      const target = (leadGoals as any)[grade.FrenchGrade] || 0
      if (target === 0) return
      
      const actual = actualCounts.get(grade.LeadGradeID) || 0
      const remaining = Math.max(0, target - actual)
      const percentage = target > 0 ? Math.round((actual / target) * 100) : 0
      
      progress.push({
        grade: grade.FrenchGrade,
        gradeId: grade.LeadGradeID,
        target,
        actual,
        remaining,
        percentage
      })
    })
    
    // Sort by grade (hardest first for pyramid display)
    return progress.sort((a, b) => b.gradeId - a.gradeId)
    
  } catch (error) {
    console.error('❌ Error fetching lead progress:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
// Get Board Progress (separate from Boulder)
// ═══════════════════════════════════════════════════════════════
export async function getBoardProgress(
  email: string,
  year: number,
  quarter: number
): Promise<GoalProgress[]> {
  try {
    const dateRange = getQuarterDateRange(year, quarter)
    
    // 1. Get goals from BoardGoals
    const { data: boardGoals } = await supabase
      .from('BoardGoals')
      .select('*')
      .eq('Email', email)
      .eq('Year', year)
      .eq('Quarter', quarter)
      .single()
    
    if (!boardGoals) return []
    
    // 2. Get actual climbs from ClimbingLog (Board only, Successful only)
    const { data: climbs } = await supabase
      .from('ClimbingLog')
      .select('GradeID')
      .eq('Email', email)
      .eq('ClimbType', 'Board')
      .eq('Successful', true)
      .gte('LogDateTime', dateRange.start)
      .lte('LogDateTime', dateRange.end + 'T23:59:59.999')
    
    // 3. Get grade names
    const { data: grades } = await supabase
      .from('BoulderGrades')
      .select('BoulderGradeID, VGrade')
      .order('BoulderGradeID')
    
    if (!grades) return []
    
    // 4. Count actual climbs per grade
    const actualCounts = new Map<number, number>()
    climbs?.forEach(climb => {
      const count = actualCounts.get(climb.GradeID) || 0
      actualCounts.set(climb.GradeID, count + 1)
    })
    
    // 5. Build progress array
    const progress: GoalProgress[] = []
    
    grades.forEach(grade => {
      const key = `V${grade.BoulderGradeID}`
      const target = (boardGoals as any)[key] || 0
      if (target === 0) return
      
      const actual = actualCounts.get(grade.BoulderGradeID) || 0
      const remaining = Math.max(0, target - actual)
      const percentage = target > 0 ? Math.round((actual / target) * 100) : 0
      
      progress.push({
        grade: grade.VGrade,
        gradeId: grade.BoulderGradeID,
        target,
        actual,
        remaining,
        percentage
      })
    })
    
    // Sort by grade (hardest first)
    return progress.sort((a, b) => b.gradeId - a.gradeId)
    
  } catch (error) {
    console.error('❌ Error fetching board progress:', error)
    return []
  }
}