// Climbing summary for the workout flow: totals and per-grade groups (sent / not sent), hardest first.

import { BoulderGrade, ClimbingRoute, LeadGrade } from '@/types/climbing'
import type { ClimbGroup } from './IntroSummary'

export function climbSummary(routes: ClimbingRoute[], boulderGrades: BoulderGrade[], leadGrades: LeadGrade[]) {
  const gradeInfo = (r: ClimbingRoute) => {
    if (r.climbType === 'Lead') {
      const k = leadGrades.findIndex(g => g.LeadGradeID === r.gradeID)
      return { label: leadGrades[k]?.FrenchGrade ?? r.gradeDisplay, order: k }
    }
    const k = boulderGrades.findIndex(g => g.BoulderGradeID === r.gradeID)
    return { label: boulderGrades[k]?.VGrade ?? r.gradeDisplay, order: k }
  }
  const typeOrder = { Boulder: 0, Board: 1, Lead: 2 }
  const groups = (sent: boolean): ClimbGroup[] => {
    const m = new Map<string, ClimbGroup & { order: number }>()
    for (const r of routes.filter(x => !!x.successful === sent)) {
      const key = `${r.climbType}|${r.gradeID}|${sent}`
      const info = gradeInfo(r)
      const g = m.get(key) ?? { key, type: r.climbType, grade: info.label, count: 0, attempts: 0, order: info.order }
      g.count++
      g.attempts += r.attempts || 1
      m.set(key, g)
    }
    return [...m.values()].sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || b.order - a.order)
  }
  return {
    total: routes.length,
    sent: routes.filter(r => r.successful).length,
    attempts: routes.reduce((n, r) => n + (r.attempts || 1), 0),
    sentGroups: groups(true),
    failedGroups: groups(false),
  }
}
