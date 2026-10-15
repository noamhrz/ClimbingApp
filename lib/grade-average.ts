// Average grade of a set of climbs: every attempt counts once at its route's grade, sent or not
// (a V5 tried 3 times weighs 3, a V3 flashed weighs 1), so many attempts on hard routes show
// as higher intensity. Sum(grade × attempts) / Sum(attempts).
//  - Boulder / Board: V average — mean of the V number (V0 = 0), e.g. V4.3
//  - Lead: French average — mean of the grade's position in the LeadGrades order,
//    shown as the nearest grade, e.g. 6b+

export type GradeType = 'Boulder' | 'Board' | 'Lead'

export interface GradeScale {
  /** Boulder/Board GradeID → V number */
  v: Map<number, number>
  /** Lead GradeID → position in the difficulty order */
  leadPos: Map<number, number>
  /** position → French grade label */
  leadLabel: string[]
}

export function gradeScale(
  boulder: { BoulderGradeID: number; VGrade: string }[],
  lead: { LeadGradeID: number; FrenchGrade: string }[],
): GradeScale {
  const v = new Map<number, number>()
  boulder.forEach(g => {
    const n = parseInt(String(g.VGrade).replace(/[^0-9]/g, ''), 10)
    if (!Number.isNaN(n)) v.set(g.BoulderGradeID, n)
  })
  const sorted = [...lead].sort((a, b) => a.LeadGradeID - b.LeadGradeID)
  return {
    v,
    leadPos: new Map(sorted.map((g, i) => [g.LeadGradeID, i])),
    leadLabel: sorted.map(g => g.FrenchGrade),
  }
}

export interface GradedClimb { GradeID: number | null | undefined; Attempts?: number | null }

/** Attempt-weighted average for one type (V number, or lead position); null when there are no climbs. */
export function gradeAverage(scale: GradeScale, type: GradeType, climbs: GradedClimb[]): number | null {
  const map = type === 'Lead' ? scale.leadPos : scale.v
  let sum = 0, n = 0
  for (const c of climbs) {
    const g = c.GradeID == null ? undefined : map.get(c.GradeID)
    if (g == null) continue
    const w = Math.max(1, Math.round(Number(c.Attempts) || 1))
    sum += g * w; n += w
  }
  return n ? sum / n : null
}

/** Display: "V4.3" for boulder/board, nearest French grade for lead. */
export function formatGradeAverage(scale: GradeScale, type: GradeType, avg: number | null): string {
  if (avg == null) return ''
  if (type === 'Lead') return scale.leadLabel[Math.min(scale.leadLabel.length - 1, Math.max(0, Math.round(avg)))] ?? ''
  return `V${Math.round(avg * 10) / 10}`
}
