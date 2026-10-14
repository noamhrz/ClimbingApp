// Average grade of a set of climbs (all routes, sent or not, equal weight).
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

/** Numeric average for one type (V number, or lead position); null when there are no climbs. */
export function gradeAverage(scale: GradeScale, type: GradeType, gradeIds: (number | null | undefined)[]): number | null {
  const map = type === 'Lead' ? scale.leadPos : scale.v
  const vals = gradeIds.map(id => (id == null ? undefined : map.get(id))).filter((x): x is number => x != null)
  if (!vals.length) return null
  return vals.reduce((s, x) => s + x, 0) / vals.length
}

/** Display: "V4.3" for boulder/board, nearest French grade for lead. */
export function formatGradeAverage(scale: GradeScale, type: GradeType, avg: number | null): string {
  if (avg == null) return ''
  if (type === 'Lead') return scale.leadLabel[Math.min(scale.leadLabel.length - 1, Math.max(0, Math.round(avg)))] ?? ''
  return `V${Math.round(avg * 10) / 10}`
}
