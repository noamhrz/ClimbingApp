// lib/goals-progress-api.ts
// 📊 Goals Progress Tracker - Compare goals vs actual climbs
// ✅ FIXED: Boulder, Board, Lead are completely separate!

import { supabase } from '@/lib/supabaseClient'

export interface GoalProgress {
  grade: string
  gradeId: number
  target: number
  actual: number
  remaining: number
  percentage: number
}

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
// Boulder Progress (ONLY Boulder)
// ═══════════════════════════════════════════════════════════════
export async function getBoulderProgress(
  email: string,
  year: number,
  quarter: number
): Promise<GoalProgress[]> {
  try {
    const dateRange = getQuarterDateRange(year, quarter)
    
    const { data: boulderGoals } = await supabase
      .from('BoulderGoals')
      .select('*')
      .eq('Email', email)
      .eq('Year', year)
      .eq('Quarter', quarter)
      .single()
    
    if (!boulderGoals) return []
    
    const { data: climbs } = await supabase
      .from('ClimbingLog')
      .select('GradeID')
      .eq('Email', email)
      .eq('ClimbType', 'Boulder')
      .eq('Successful', true)
      .gte('LogDateTime', dateRange.start)
      .lte('LogDateTime', dateRange.end + 'T23:59:59.999')
    
    const { data: grades } = await supabase
      .from('BoulderGrades')
      .select('BoulderGradeID, VGrade')
      .order('BoulderGradeID')
    
    if (!grades) return []
    
    const actualCounts = new Map<number, number>()
    climbs?.forEach(climb => {
      actualCounts.set(climb.GradeID, (actualCounts.get(climb.GradeID) || 0) + 1)
    })
    
    const progress: GoalProgress[] = []
    grades.forEach(grade => {
      const target = (boulderGoals as any)[`V${grade.BoulderGradeID}`] || 0
      if (target === 0) return
      
      const actual = actualCounts.get(grade.BoulderGradeID) || 0
      progress.push({
        grade: grade.VGrade,
        gradeId: grade.BoulderGradeID,
        target,
        actual,
        remaining: Math.max(0, target - actual),
        percentage: Math.round((actual / target) * 100)
      })
    })
    
    return progress.sort((a, b) => b.gradeId - a.gradeId)
  } catch (error) {
    console.error('❌ Boulder progress error:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
// Board Progress (ONLY Board)
// ═══════════════════════════════════════════════════════════════
export async function getBoardProgress(
  email: string,
  year: number,
  quarter: number
): Promise<GoalProgress[]> {
  try {
    const dateRange = getQuarterDateRange(year, quarter)
    
    const { data: boardGoals } = await supabase
      .from('BoardGoals')
      .select('*')
      .eq('Email', email)
      .eq('Year', year)
      .eq('Quarter', quarter)
      .single()
    
    if (!boardGoals) return []
    
    const { data: climbs } = await supabase
      .from('ClimbingLog')
      .select('GradeID')
      .eq('Email', email)
      .eq('ClimbType', 'Board')
      .eq('Successful', true)
      .gte('LogDateTime', dateRange.start)
      .lte('LogDateTime', dateRange.end + 'T23:59:59.999')
    
    const { data: grades } = await supabase
      .from('BoulderGrades')
      .select('BoulderGradeID, VGrade')
      .order('BoulderGradeID')
    
    if (!grades) return []
    
    const actualCounts = new Map<number, number>()
    climbs?.forEach(climb => {
      actualCounts.set(climb.GradeID, (actualCounts.get(climb.GradeID) || 0) + 1)
    })
    
    const progress: GoalProgress[] = []
    grades.forEach(grade => {
      const target = (boardGoals as any)[`V${grade.BoulderGradeID}`] || 0
      if (target === 0) return
      
      const actual = actualCounts.get(grade.BoulderGradeID) || 0
      progress.push({
        grade: grade.VGrade,
        gradeId: grade.BoulderGradeID,
        target,
        actual,
        remaining: Math.max(0, target - actual),
        percentage: Math.round((actual / target) * 100)
      })
    })
    
    return progress.sort((a, b) => b.gradeId - a.gradeId)
  } catch (error) {
    console.error('❌ Board progress error:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
// Lead Progress (ONLY Lead)
// ═══════════════════════════════════════════════════════════════
export async function getLeadProgress(
  email: string,
  year: number,
  quarter: number
): Promise<GoalProgress[]> {
  try {
    const dateRange = getQuarterDateRange(year, quarter)
    
    const { data: leadGoals } = await supabase
      .from('LeadGoals')
      .select('*')
      .eq('Email', email)
      .eq('Year', year)
      .eq('Quarter', quarter)
      .single()
    
    if (!leadGoals) return []
    
    const { data: climbs } = await supabase
      .from('ClimbingLog')
      .select('GradeID')
      .eq('Email', email)
      .eq('ClimbType', 'Lead')
      .eq('Successful', true)
      .gte('LogDateTime', dateRange.start)
      .lte('LogDateTime', dateRange.end + 'T23:59:59.999')
    
    const { data: grades } = await supabase
      .from('LeadGrades')
      .select('LeadGradeID, FrenchGrade')
      .gte('LeadGradeID', 8)
      .order('LeadGradeID')
    
    if (!grades) return []
    
    const actualCounts = new Map<number, number>()
    climbs?.forEach(climb => {
      actualCounts.set(climb.GradeID, (actualCounts.get(climb.GradeID) || 0) + 1)
    })
    
    const progress: GoalProgress[] = []
    grades.forEach(grade => {
      const target = (leadGoals as any)[grade.FrenchGrade] || 0
      if (target === 0) return
      
      const actual = actualCounts.get(grade.LeadGradeID) || 0
      progress.push({
        grade: grade.FrenchGrade,
        gradeId: grade.LeadGradeID,
        target,
        actual,
        remaining: Math.max(0, target - actual),
        percentage: Math.round((actual / target) * 100)
      })
    })
    
    return progress.sort((a, b) => b.gradeId - a.gradeId)
  } catch (error) {
    console.error('❌ Lead progress error:', error)
    return []
  }
}