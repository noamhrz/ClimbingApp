// Monthly trainee report: data assembly (server side, service-role client).
// Used by the in-app monthly report page and, later, the monthly coach email.

import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, ilDate, ilDateOfTimestamp } from './dates'

export type ClimbType = 'Boulder' | 'Board' | 'Lead'

export interface CountBucket { label: string; planned: number; done: number; current?: boolean }
export interface VolumeBucket { label: string; Boulder: number; Board: number; Lead: number; current?: boolean; note?: string }
export interface GoalRow { grade: string; target: number; actual: number }
export interface RoadmapRow { name: string; level: number; max: number }
export interface ExercisePoint { date: string; weight: number | null; reps: number | null; duration: number | null }
export interface ExerciseSeries {
  name: string
  metric: 'weight' | 'reps' | 'duration'
  points: ExercisePoint[]          // last 10, oldest → newest
  change: number                   // relative change of the main metric, last 5 vs previous 5
  weightChange: number | null
  repsChange: number | null
  prevAvg: number
  lastAvg: number
  prevReps: number | null
  lastReps: number | null
}

export interface MonthlyReport {
  email: string
  name: string
  year: number
  month: number                    // 1–12
  monthLabel: string               // 'ספטמבר 2026'
  completion: { planned: number; done: number }
  weekly: CountBucket[]            // 12 weeks
  monthlyCounts: CountBucket[]     // 12 months
  volumeMonths: VolumeBucket[]     // 6 months
  volumeWeeks: VolumeBucket[]      // weeks of the selected month
  volumeTotals: Record<ClimbType, number>
  volumeChangePct: number | null   // vs previous month
  quarter: number
  goals: Record<ClimbType, GoalRow[]>
  newGrades: { type: ClimbType; grade: string }[]
  general: { overarching: string | null; goals: string[] }
  roadmap: { rows: RoadmapRow[]; started: number; total: number }
  exercises: { good: ExerciseSeries[]; moderate: ExerciseSeries[]; stuck: ExerciseSeries[] }
  todos: { coach: { task: string; done: boolean }[]; athlete: { task: string; done: boolean }[] }
  wellness: { reports: number; sleep: number | null; pain: number | null; vitality: number | null; prevReports: number }
}

export const PROGRESS = { good: 0.10, minSessions: 10 }

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const HE_MONTHS_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳']

const pad = (n: number) => String(n).padStart(2, '0')
const monthStart = (y: number, m: number) => `${y}-${pad(m)}-01`
function shiftMonth(y: number, m: number, d: number): [number, number] {
  const idx = y * 12 + (m - 1) + d
  return [Math.floor(idx / 12), (idx % 12) + 1]
}
function monthEnd(y: number, m: number): string {
  const [ny, nm] = shiftMonth(y, m, 1)
  return addDays(monthStart(ny, nm), -1)
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

/** Fetch all rows of a query, 1000 at a time (PostgREST caps responses). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make(from, from + 999)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

/** Sunday-based week start (Israel). */
function weekStart(date: string): string {
  const dow = new Date(date + 'T12:00:00Z').getUTCDay()
  return addDays(date, -dow)
}

function relChange(prev: number[], last: number[]): number | null {
  const a = avg(prev), b = avg(last)
  if (a == null || b == null) return null
  if (a === 0) return b > 0 ? 1 : 0
  return b / a - 1
}

export async function buildMonthlyReport(db: SupabaseClient, email: string, year: number, month: number): Promise<MonthlyReport> {
  const today = ilDate()
  const mStart = monthStart(year, month)
  const mEnd = monthEnd(year, month)
  const asOf = mEnd < today ? mEnd : today
  const quarter = Math.floor((month - 1) / 3) + 1

  const [y12, m12] = shiftMonth(year, month, -11)
  const [y6, m6] = shiftMonth(year, month, -5)
  const [yp, mp] = shiftMonth(year, month, -1)
  const calFrom = [monthStart(y12, m12), addDays(weekStart(asOf), -7 * 11)].sort()[0]
  const qStart = monthStart(year, (quarter - 1) * 3 + 1)
  const qEnd = monthEnd(year, quarter * 3)

  // ── queries ──────────────────────────────────────────────────────────────
  const [user, calendar, climbs, wellness, boulderG, leadG, bGoals, boGoals, lGoals, gGoals,
    cats, levels, progress, session, logs] = await Promise.all([
    db.from('Users').select('Name').eq('Email', email).maybeSingle(),
    fetchAll<{ StartTime: string; Completed: boolean | null; Deloading: boolean | null }>((f, t) =>
      db.from('Calendar').select('StartTime, Completed, Deloading').eq('Email', email)
        .gte('StartTime', `${addDays(calFrom, -1)}T00:00:00`).lt('StartTime', `${addDays(asOf, 1)}T23:59:59`)
        .order('StartTime').range(f, t)),
    fetchAll<{ LogDateTime: string; ClimbType: ClimbType; GradeID: number; Successful: boolean | null; VolumeScore: number | null }>((f, t) =>
      db.from('ClimbingLog').select('LogDateTime, ClimbType, GradeID, Successful, VolumeScore').eq('Email', email)
        .gte('LogDateTime', [monthStart(y6, m6), qStart].sort()[0]).lte('LogDateTime', `${[mEnd, qEnd].sort()[1]}T23:59:59.999`)
        .order('LogDateTime').range(f, t)),
    db.from('WellnessLog').select('Date, SleepHours, VitalityLevel, PainLevel').eq('Email', email)
      .gte('Date', monthStart(yp, mp)).lte('Date', mEnd),
    db.from('BoulderGrades').select('BoulderGradeID, VGrade').order('BoulderGradeID'),
    db.from('LeadGrades').select('LeadGradeID, FrenchGrade').order('LeadGradeID'),
    db.from('BoulderGoals').select('*').eq('Email', email).eq('Year', year).eq('Quarter', quarter).maybeSingle(),
    db.from('BoardGoals').select('*').eq('Email', email).eq('Year', year).eq('Quarter', quarter).maybeSingle(),
    db.from('LeadGoals').select('*').eq('Email', email).eq('Year', year).eq('Quarter', quarter).maybeSingle(),
    db.from('GeneralGoals').select('*').eq('Email', email).eq('Year', year).eq('Quarter', quarter).maybeSingle(),
    db.from('RoadmapCategories').select('CategoryID, Name, Order').order('Order'),
    db.from('RoadmapLevels').select('CategoryID, LevelNumber'),
    db.from('UserRoadmapProgress').select('CategoryID, CurrentLevel').eq('Email', email),
    db.from('MonthlySessions').select('SessionID').eq('Email', email).eq('Year', year).eq('Month', month).maybeSingle(),
    fetchAll<{ ExerciseID: number; HandSide: string | null; RepsDone: number | null; WeightKG: number | null; DurationSec: number | null; CreatedAt: string }>((f, t) =>
      db.from('ExerciseLogs').select('ExerciseID, HandSide, RepsDone, WeightKG, DurationSec, CreatedAt')
        .eq('Email', email).eq('Completed', true).lte('CreatedAt', `${mEnd}T23:59:59.999`)
        .order('CreatedAt').range(f, t)),
  ])

  // ── completion: weekly (12 weeks) and monthly (12 months) ───────────────
  const cal = calendar.map(c => ({ date: ilDateOfTimestamp(c.StartTime), done: !!c.Completed, deload: !!c.Deloading }))
    .filter(c => c.date <= asOf)
  const thisWeek = weekStart(asOf)
  const weekly: CountBucket[] = []
  for (let i = 11; i >= 0; i--) {
    const ws = addDays(thisWeek, -7 * i)
    const we = addDays(ws, 6)
    const rows = cal.filter(c => c.date >= ws && c.date <= we)
    const [, mm, dd] = ws.split('-')
    weekly.push({ label: `${Number(dd)}.${Number(mm)}`, planned: rows.length, done: rows.filter(r => r.done).length, current: i === 0 })
  }
  const monthlyCounts: CountBucket[] = []
  for (let i = 11; i >= 0; i--) {
    const [yy, mm] = shiftMonth(year, month, -i)
    const s = monthStart(yy, mm), e = monthEnd(yy, mm)
    const rows = cal.filter(c => c.date >= s && c.date <= e)
    monthlyCounts.push({ label: HE_MONTHS_SHORT[mm - 1], planned: rows.length, done: rows.filter(r => r.done).length, current: i === 0 })
  }
  const inMonth = cal.filter(c => c.date >= mStart && c.date <= mEnd)

  // ── climbing volume ──────────────────────────────────────────────────────
  const climbRows = climbs.map(c => ({ ...c, date: String(c.LogDateTime).slice(0, 10), vol: Number(c.VolumeScore) || 0 }))
  const emptyVol = (label: string): VolumeBucket => ({ label, Boulder: 0, Board: 0, Lead: 0 })
  const volumeMonths: VolumeBucket[] = []
  for (let i = 5; i >= 0; i--) {
    const [yy, mm] = shiftMonth(year, month, -i)
    const b = emptyVol(HE_MONTHS_SHORT[mm - 1]); b.current = i === 0
    for (const c of climbRows) if (c.date >= monthStart(yy, mm) && c.date <= monthEnd(yy, mm) && c.ClimbType in b) b[c.ClimbType] += c.vol
    volumeMonths.push(b)
  }
  const lastDay = Number(mEnd.slice(8))
  const weekRanges: [number, number][] = [[1, 7], [8, 14], [15, 21], [22, lastDay]]
  const volumeWeeks: VolumeBucket[] = weekRanges.map(([a, z]) => {
    const s = `${year}-${pad(month)}-${pad(a)}`, e = `${year}-${pad(month)}-${pad(z)}`
    const b = emptyVol(`${a}–${z}`)
    for (const c of climbRows) if (c.date >= s && c.date <= e && c.ClimbType in b) b[c.ClimbType] += c.vol
    if (inMonth.some(r => r.deload && r.date >= s && r.date <= e)) b.note = 'דילודינג'
    return b
  })
  const cur = volumeMonths[5], prev = volumeMonths[4]
  const sum = (b: VolumeBucket) => b.Boulder + b.Board + b.Lead
  const volumeChangePct = sum(prev) > 0 ? Math.round((sum(cur) / sum(prev) - 1) * 100) : null

  // ── goals (quarter) and new grades ───────────────────────────────────────
  const vName = new Map((boulderG.data ?? []).map(g => [g.BoulderGradeID as number, g.VGrade as string]))
  const lName = new Map((leadG.data ?? []).map(g => [g.LeadGradeID as number, g.FrenchGrade as string]))
  const inQuarter = climbRows.filter(c => c.Successful && c.date >= qStart && c.date <= qEnd)
  const countBy = (type: ClimbType) => {
    const m = new Map<number, number>()
    for (const c of inQuarter) if (c.ClimbType === type) m.set(c.GradeID, (m.get(c.GradeID) ?? 0) + 1)
    return m
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vGoals = (row: any, type: ClimbType): GoalRow[] => {
    if (!row) return []
    const actual = countBy(type)
    return (boulderG.data ?? [])
      .map(g => ({ id: g.BoulderGradeID as number, grade: g.VGrade as string, target: Number(row[`V${g.BoulderGradeID}`]) || 0 }))
      .filter(g => g.target > 0)
      .map(g => ({ grade: g.grade, target: g.target, actual: actual.get(g.id) ?? 0 }))
  }
  const leadActual = countBy('Lead')
  const leadGoals: GoalRow[] = lGoals.data
    ? (leadG.data ?? [])
      .map(g => ({ id: g.LeadGradeID as number, grade: g.FrenchGrade as string, target: Number((lGoals.data as Record<string, unknown>)[g.FrenchGrade]) || 0 }))
      .filter(g => g.target > 0)
      .map(g => ({ grade: g.grade, target: g.target, actual: leadActual.get(g.id) ?? 0 }))
    : []

  const newGrades: { type: ClimbType; grade: string }[] = []
  for (const type of ['Boulder', 'Board', 'Lead'] as ClimbType[]) {
    const monthBest = Math.max(-1, ...climbRows.filter(c => c.Successful && c.ClimbType === type && c.date >= mStart && c.date <= mEnd).map(c => c.GradeID))
    if (monthBest < 0) continue
    const { data: before } = await db.from('ClimbingLog').select('GradeID').eq('Email', email).eq('ClimbType', type)
      .eq('Successful', true).lt('LogDateTime', mStart).order('GradeID', { ascending: false }).limit(1)
    const prevBest = before?.[0]?.GradeID ?? -1
    if (monthBest > prevBest) newGrades.push({ type, grade: (type === 'Lead' ? lName : vName).get(monthBest) ?? String(monthBest) })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = gGoals.data as any
  const general = {
    overarching: g?.OverarchingGoal || null,
    goals: g ? [g.Goal1, g.Goal2, g.Goal3, g.Goal4, g.Goal5].filter((x: unknown) => typeof x === 'string' && x.trim()) : [],
  }

  // ── roadmap ──────────────────────────────────────────────────────────────
  const maxLevel = new Map<number, number>()
  for (const l of levels.data ?? []) maxLevel.set(l.CategoryID, Math.max(maxLevel.get(l.CategoryID) ?? 0, l.LevelNumber))
  const curLevel = new Map((progress.data ?? []).map(p => [p.CategoryID as number, p.CurrentLevel as number]))
  const roadmapRows: RoadmapRow[] = (cats.data ?? []).map(c => ({ name: c.Name, level: curLevel.get(c.CategoryID) ?? 0, max: maxLevel.get(c.CategoryID) ?? 0 }))

  // ── exercises: progress over the last 10 sessions ────────────────────────
  const series = new Map<string, { id: number; hand: string; pts: ExercisePoint[] }>()
  for (const l of logs) {
    const hand = l.HandSide || 'Both'
    const key = `${l.ExerciseID}|${hand}`
    if (!series.has(key)) series.set(key, { id: l.ExerciseID, hand, pts: [] })
    series.get(key)!.pts.push({
      date: ilDateOfTimestamp(l.CreatedAt),
      weight: l.WeightKG == null ? null : Number(l.WeightKG),
      reps: l.RepsDone == null ? null : Number(l.RepsDone),
      duration: l.DurationSec == null ? null : Number(l.DurationSec),
    })
  }
  const ids = [...new Set([...series.values()].map(s => s.id))]
  const { data: exInfo } = ids.length
    ? await db.from('Exercises').select('ExerciseID, Name, isDuration').in('ExerciseID', ids)
    : { data: [] as { ExerciseID: number; Name: string; isDuration: boolean }[] }
  const exMap = new Map((exInfo ?? []).map(e => [e.ExerciseID as number, e]))
  const good: ExerciseSeries[] = [], moderate: ExerciseSeries[] = [], stuck: ExerciseSeries[] = []
  for (const s of series.values()) {
    if (s.pts.length < PROGRESS.minSessions) continue
    if (!s.pts.some(p => p.date >= mStart && p.date <= mEnd)) continue // not trained this month
    const pts = s.pts.slice(-10)
    const info = exMap.get(s.id)
    const prev5 = pts.slice(0, 5), last5 = pts.slice(5)
    const nums = (xs: ExercisePoint[], k: 'weight' | 'reps' | 'duration') => xs.map(p => p[k]).filter((v): v is number => v != null && v > 0)
    const hasWeight = nums(pts, 'weight').length >= 6
    const metric: ExerciseSeries['metric'] = hasWeight ? 'weight' : info?.isDuration ? 'duration' : 'reps'
    const wC = hasWeight ? relChange(nums(prev5, 'weight'), nums(last5, 'weight')) : null
    const rC = relChange(nums(prev5, 'reps'), nums(last5, 'reps'))
    const main = metric === 'weight' ? wC : metric === 'duration' ? relChange(nums(prev5, 'duration'), nums(last5, 'duration')) : rC
    if (main == null) continue
    // weight unchanged → reps decide; weight down → no progress
    const change = metric === 'weight' && Math.abs(wC ?? 0) < 1e-9 ? (rC ?? 0) : main
    const entry: ExerciseSeries = {
      name: (info?.Name ?? `תרגיל ${s.id}`) + (s.hand === 'Right' ? ' (ימין)' : s.hand === 'Left' ? ' (שמאל)' : ''),
      metric, points: pts, change,
      weightChange: wC, repsChange: rC,
      prevAvg: avg(nums(prev5, metric)) ?? 0, lastAvg: avg(nums(last5, metric)) ?? 0,
      prevReps: avg(nums(prev5, 'reps')), lastReps: avg(nums(last5, 'reps')),
    }
    if (change >= PROGRESS.good) good.push(entry)
    else if (change > 0) moderate.push(entry)
    else stuck.push(entry)
  }
  good.sort((a, b) => b.change - a.change)
  moderate.sort((a, b) => b.change - a.change)

  // ── monthly session todos ────────────────────────────────────────────────
  let todos: MonthlyReport['todos'] = { coach: [], athlete: [] }
  if (session.data?.SessionID) {
    const [ct, at] = await Promise.all([
      db.from('CoachTodos').select('Task, Completed').eq('SessionID', session.data.SessionID),
      db.from('AthleteTodos').select('Task, Completed').eq('SessionID', session.data.SessionID),
    ])
    todos = {
      coach: (ct.data ?? []).map(x => ({ task: x.Task, done: !!x.Completed })),
      athlete: (at.data ?? []).map(x => ({ task: x.Task, done: !!x.Completed })),
    }
  }

  // ── wellness ─────────────────────────────────────────────────────────────
  const wRows = wellness.data ?? []
  const wm = wRows.filter(w => w.Date >= mStart)
  const nn = (xs: unknown[]) => xs.filter((v): v is number => typeof v === 'number')
  const r1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10)

  return {
    email, name: user.data?.Name || email, year, month,
    monthLabel: `${HE_MONTHS[month - 1]} ${year}`,
    completion: { planned: inMonth.length, done: inMonth.filter(r => r.done).length },
    weekly, monthlyCounts, volumeMonths, volumeWeeks,
    volumeTotals: { Boulder: cur.Boulder, Board: cur.Board, Lead: cur.Lead },
    volumeChangePct, quarter,
    goals: { Boulder: vGoals(bGoals.data, 'Boulder'), Board: vGoals(boGoals.data, 'Board'), Lead: leadGoals },
    newGrades, general,
    roadmap: { rows: roadmapRows, started: roadmapRows.filter(r => r.level > 0).length, total: roadmapRows.length },
    exercises: { good, moderate, stuck },
    todos,
    wellness: {
      reports: wm.length,
      sleep: r1(avg(nn(wm.map(w => w.SleepHours)).filter(v => v > 0))),
      pain: r1(avg(nn(wm.map(w => w.PainLevel)))),
      vitality: r1(avg(nn(wm.map(w => w.VitalityLevel)))),
      prevReports: wRows.length - wm.length,
    },
  }
}
