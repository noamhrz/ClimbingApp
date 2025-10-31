// lib/climbing-helpers.ts

import { BoulderGrade, LeadGrade } from '@/types/climbing'

export function getGradeDisplay(
  gradeID: number | null,
  climbType: 'Boulder' | 'Board' | 'Lead',
  boulderGrades: BoulderGrade[],
  leadGrades: LeadGrade[]
): string {
  if (!gradeID) return ''
  
  if (climbType === 'Lead') {
    const grade = leadGrades.find(g => g.LeadGradeID === gradeID)
    return grade ? `${grade.FrenchGrade} (${grade.YosemiteGrade})` : ''
  } else {
    // Boulder or Board
    const grade = boulderGrades.find(g => g.BoulderGradeID === gradeID)
    return grade ? `${grade.VGrade} (${grade.FontGrade})` : ''
  }
}

export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}