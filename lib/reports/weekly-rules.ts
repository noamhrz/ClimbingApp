// Pure rules for the coach's weekly exceptions email (Sunday morning, Issue #17).
// Only things that need attention, plus a short list of positives. No aggregate tiles.
//
// The reviewed week is the 7 days before `today` (Sunday → previous Sunday–Saturday).

import { addDays, daysBetween } from './dates'
import { DayCell, TraineeData, WellnessMetric, lastActivity, missedDays, overload, wellnessFlags, THRESHOLDS } from './daily-rules'

export interface WeekStat { start: string; planned: number; done: number }

export type WeeklyItem =
  | { kind: 'completionDrop'; weeks: WeekStat[]; lastRate: number; priorRate: number }
  | { kind: 'wellnessTrend'; changes: { key: 'pain' | 'vitality' | 'sleep'; from: number; to: number }[] }
  | { kind: 'wellnessOngoing'; metrics: WellnessMetric[] }
  | { kind: 'missedOngoing'; missedDays: number; strip: DayCell[] }
  | { kind: 'silenceOngoing'; lastActivity: string | null; days: number | null }
  | { kind: 'overloadOngoing'; painUp: boolean; vitDown: boolean }
  | { kind: 'neverStarted'; firstDate: string }

export interface WeeklyTrainee {
  email: string
  name: string
  concerns: WeeklyItem[]
  noWorkoutsNextWeek: boolean
  positive: { kind: 'fullWeek'; done: number } | { kind: 'streak'; weeks: number } | null
}

export const WEEKLY = {
  weeks: 4,                 // reviewed week + 3 before it
  dropPoints: 0.25,         // completion rate fell by ≥ 25 points
  minPriorRate: 0.5,        // only when the earlier weeks were reasonable
  minPlanned: 2,            // the reviewed week had at least 2 planned workouts
  trendDelta: { pain: 0.5, vitality: 0.5, sleep: 1 },
  trendMinReports: 3,
  streakWeeks: 4,
}

function weekStats(t: TraineeData, today: string, n: number): WeekStat[] {
  // oldest → newest; the last one is the reviewed week
  const out: WeekStat[] = []
  for (let i = n; i >= 1; i--) {
    const start = addDays(today, -7 * i)
    const end = addDays(start, 6)
    const rows = t.calendar.filter(c => c.date >= start && c.date <= end)
    out.push({ start, planned: rows.length, done: rows.filter(r => r.completed).length })
  }
  return out
}

function avg(xs: number[]) { return xs.reduce((s, x) => s + x, 0) / xs.length }

/** Last 7 days vs the 14 days before them. */
function wellnessTrend(t: TraineeData, today: string) {
  const recent = t.wellness.filter(r => r.date >= addDays(today, -7) && r.date < today)
  const before = t.wellness.filter(r => r.date >= addDays(today, -21) && r.date < addDays(today, -7))
  const changes: { key: 'pain' | 'vitality' | 'sleep'; from: number; to: number }[] = []
  for (const key of ['pain', 'vitality', 'sleep'] as const) {
    const pick = (rows: typeof recent) => rows.map(r => r[key]).filter((v): v is number => v != null && (key !== 'sleep' || v > 0))
    const a = pick(before), b = pick(recent)
    if (a.length < WEEKLY.trendMinReports || b.length < WEEKLY.trendMinReports) continue
    const from = avg(a), to = avg(b)
    const worse = key === 'pain' ? to - from : from - to
    if (worse >= WEEKLY.trendDelta[key]) changes.push({ key, from, to })
  }
  return changes
}

export function weeklyReview(t: TraineeData, today: string): WeeklyTrainee {
  const concerns: WeeklyItem[] = []
  const weeks = weekStats(t, today, WEEKLY.weeks)
  const last = weeks[weeks.length - 1]
  const prior = weeks.slice(0, -1).filter(w => w.planned > 0)

  // completion rate dropped vs the 3 weeks before
  if (last.planned >= WEEKLY.minPlanned && prior.length >= 2) {
    const lastRate = last.done / last.planned
    const priorRate = prior.reduce((s, w) => s + w.done, 0) / prior.reduce((s, w) => s + w.planned, 0)
    if (priorRate >= WEEKLY.minPriorRate && priorRate - lastRate >= WEEKLY.dropPoints) {
      concerns.push({ kind: 'completionDrop', weeks, lastRate, priorRate })
    }
  }

  const trend = wellnessTrend(t, today)
  if (trend.length) concerns.push({ kind: 'wellnessTrend', changes: trend })

  // daily conditions that are still true today
  const flags = wellnessFlags(t, today)
  if (flags.length) concerns.push({ kind: 'wellnessOngoing', metrics: flags })

  const m = missedDays(t, today)
  if (m.count >= THRESHOLDS.missedDays) concerns.push({ kind: 'missedOngoing', missedDays: m.count, strip: m.strip })

  const o = overload(t, today)
  if (o && !trend.length) concerns.push({ kind: 'overloadOngoing', painUp: o.painUp, vitDown: o.vitDown })

  const firstScheduled = t.calendar.map(c => c.date).filter(d => d < today).sort()[0]
  const everDone = t.calendar.some(c => c.completed && c.date < today)
  if (firstScheduled && !everDone && daysBetween(firstScheduled, today) >= THRESHOLDS.newTraineeDays) {
    concerns.push({ kind: 'neverStarted', firstDate: firstScheduled })
  } else {
    const la = lastActivity(t, addDays(today, -1))
    const days = la ? daysBetween(la, today) : null
    if (days == null || days >= THRESHOLDS.silenceDays) {
      // the calendar window starts ~5 weeks back: older activity is shown as "over a month"
      const known = la && days != null && days <= 30
      concerns.push({ kind: 'silenceOngoing', lastActivity: known ? la : null, days: known ? days : null })
    }
  }

  // next week (today … +6) has nothing scheduled
  const noWorkoutsNextWeek = !t.calendar.some(c => c.date >= today && c.date <= addDays(today, 6))

  // positives
  let positive: WeeklyTrainee['positive'] = null
  const full = (w: WeekStat) => w.planned > 0 && w.done === w.planned
  if (weeks.length >= WEEKLY.streakWeeks && weeks.slice(-WEEKLY.streakWeeks).every(full)) {
    positive = { kind: 'streak', weeks: WEEKLY.streakWeeks }
  } else if (full(last) && last.planned >= WEEKLY.minPlanned) {
    positive = { kind: 'fullWeek', done: last.done }
  }

  return { email: t.email, name: t.name, concerns, noWorkoutsNextWeek, positive }
}
