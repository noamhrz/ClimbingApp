// lib/climbing-helpers.ts

import { BoulderGrade, LeadGrade } from '@/types/climbing'

export function getGradeDisplay(
  gradeID: number | null, 
  climbType: 'Boulder' | 'Board' | 'Lead',
  boulderGrades: BoulderGrade[],
  leadGrades: LeadGrade[]
): string {
  if (!gradeID && gradeID !== 0) return '-'
  
  if (climbType === 'Boulder' || climbType === 'Board') {
    const grade = boulderGrades.find(g => g.BoulderGradeID === gradeID)
    return grade 
      ? `${grade.VGrade} (${grade.FontGrade})`
      : `V${gradeID}`
  } else {
    const grade = leadGrades.find(g => g.LeadGradeID === gradeID)
    return grade?.FrenchGrade || `Grade ${gradeID}`
  }
}

export function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
