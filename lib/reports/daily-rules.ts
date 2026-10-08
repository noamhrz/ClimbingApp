// Pure rules for the coach's daily alert email (Issue #17).
// No database access here: everything works on already-loaded trainee data,
// so the rules can be checked with synthetic data.
//
// De-duplication without extra tables, so each alert is sent once:
// - Calendar rules (missed, plan ending, silence, new trainee) fire on the day
//   their condition becomes true (true as of today, false as of yesterday).
// - Wellness rules (pain 3, 3-of-5, load) fire when the reports created in the
//   last 24 hours are what made the condition true.

import { addDays, daysBetween } from './dates'

export interface WellnessRow {
  date: string            // 'YYYY-MM-DD'
  sleep: number | null    // hours
  vitality: number | null // 0–3
  pain: number | null     // 0–3
  painArea: string | null
  createdAt: Date | null
}

export interface CalendarRow {
  date: string            // 'YYYY-MM-DD' (Israel)
  completed: boolean
  deloading: boolean
}

export interface TraineeData {
  email: string
  name: string
  wellness: WellnessRow[] // any order
  calendar: CalendarRow[] // any order
}

export type Severity = 'red' | 'amber' | 'blue'

export type Alert =
  | { kind: 'pain3'; severity: 'red'; date: string; painArea: string | null; recentPain: (number | null)[] }
  | { kind: 'wellness'; severity: Severity; metrics: WellnessMetric[] }
  | { kind: 'missed'; severity: 'amber'; missedDays: number; strip: DayCell[] }
  | { kind: 'overload'; severity: 'amber'; painFrom: number; painTo: number; vitFrom: number; vitTo: number; painUp: boolean; vitDown: boolean }
  | { kind: 'silence'; severity: 'amber'; lastActivity: string; days: number }
  | { kind: 'newTrainee'; severity: 'blue'; firstDate: string }
  | { kind: 'planEnding'; severity: 'blue'; lastDate: string }

export interface WellnessMetric {
  key: 'sleep' | 'pain' | 'vitality'
  bad: number         // how many of the last reports were bad
  of: number          // out of how many reports
  values: (number | null)[] // last reports, oldest → newest
}

export interface DayCell {
  date: string
  state: 'done' | 'missed' | 'none' | 'partial'
}

export const THRESHOLDS = {
  sleepBelow: 6,         // hours
  painAtLeast: 2,        // 0–3
  vitalityAtMost: 1,     // 0–3
  wellnessWindow: 5,     // last N reports
  wellnessBadCount: 3,   // ≥ N bad of the window
  missedWindowDays: 7,
  missedDays: 3,
  silenceDays: 5,
  planHorizonDays: 7,
  newTraineeDays: 7,
  overloadDelta: 0.5,
  overloadMinReports: 3,
}

const isBad = {
  sleep: (r: WellnessRow) => r.sleep != null && r.sleep > 0 && r.sleep < THRESHOLDS.sleepBelow,
  pain: (r: WellnessRow) => r.pain != null && r.pain >= THRESHOLDS.painAtLeast,
  vitality: (r: WellnessRow) => r.vitality != null && r.vitality <= THRESHOLDS.vitalityAtMost,
}

function lastReports(t: TraineeData, asOf: string, n: number): WellnessRow[] {
  return t.wellness
    .filter(r => r.date <= asOf)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, n)
    .reverse() // oldest → newest
}

// ── individual conditions (as of a given day) ───────────────────────────────

function wellnessFlags(t: TraineeData, asOf: string): WellnessMetric[] {
  const reports = lastReports(t, asOf, THRESHOLDS.wellnessWindow)
  if (reports.length < THRESHOLDS.wellnessBadCount) return []
  const out: WellnessMetric[] = []
  for (const key of ['pain', 'sleep', 'vitality'] as const) {
    const bad = reports.filter(isBad[key]).length
    if (bad >= THRESHOLDS.wellnessBadCount) {
      out.push({ key, bad, of: reports.length, values: reports.map(r => r[key]) })
    }
  }
  return out
}

function daysMap(t: TraineeData): Map<string, CalendarRow[]> {
  const m = new Map<string, CalendarRow[]>()
  for (const c of t.calendar) {
    const list = m.get(c.date) ?? []
    list.push(c)
    m.set(c.date, list)
  }
  return m
}

/** Days in the last 7 (excluding today) with a scheduled workout that was not done. */
function missedDays(t: TraineeData, asOf: string): { count: number; strip: DayCell[] } {
  const byDay = daysMap(t)
  const strip: DayCell[] = []
  let count = 0
  for (let i = THRESHOLDS.missedWindowDays; i >= 1; i--) {
    const date = addDays(asOf, -i)
    const rows = byDay.get(date) ?? []
    let state: DayCell['state'] = 'none'
    if (rows.length) {
      const done = rows.filter(r => r.completed).length
      state = done === rows.length ? 'done' : done === 0 ? 'missed' : 'partial'
      if (state !== 'done') count++
    }
    strip.push({ date, state })
  }
  return { count, strip }
}

/** Last scheduled date if the schedule runs out within the horizon, else null. */
function planEnding(t: TraineeData, asOf: string): string | null {
  const future = t.calendar.filter(c => c.date >= asOf).map(c => c.date).sort()
  if (!future.length) return null
  const last = future[future.length - 1]
  return daysBetween(asOf, last) < THRESHOLDS.planHorizonDays ? last : null
}

function lastActivity(t: TraineeData, asOf: string): string | null {
  const dates = [
    ...t.wellness.filter(r => r.date <= asOf).map(r => r.date),
    ...t.calendar.filter(c => c.completed && c.date <= asOf).map(c => c.date),
  ].sort()
  return dates.length ? dates[dates.length - 1] : null
}

function avg(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length
}

function overload(t: TraineeData, asOf: string) {
  const inWin = (from: number, to: number) =>
    t.wellness.filter(r => r.date > addDays(asOf, -from) && r.date <= addDays(asOf, -to))
  const recent = inWin(7, 0)
  const before = inWin(14, 7)
  const nums = (rows: WellnessRow[], k: 'pain' | 'vitality') =>
    rows.map(r => r[k]).filter((v): v is number => v != null)
  const pR = nums(recent, 'pain'), pB = nums(before, 'pain')
  const vR = nums(recent, 'vitality'), vB = nums(before, 'vitality')
  const min = THRESHOLDS.overloadMinReports
  const painUp = pR.length >= min && pB.length >= min && avg(pR) - avg(pB) >= THRESHOLDS.overloadDelta
  const vitDown = vR.length >= min && vB.length >= min && avg(vB) - avg(vR) >= THRESHOLDS.overloadDelta
  if (!painUp && !vitDown) return null
  return {
    painFrom: pB.length ? avg(pB) : 0, painTo: pR.length ? avg(pR) : 0,
    vitFrom: vB.length ? avg(vB) : 0, vitTo: vR.length ? avg(vR) : 0,
    painUp, vitDown,
  }
}

// ── the daily evaluation ────────────────────────────────────────────────────

/**
 * Alerts for one trainee on day `today`.
 * `now` bounds the 24-hour window for pain-3 reports.
 */
export function dailyAlerts(t: TraineeData, today: string, now: Date): Alert[] {
  const yesterday = addDays(today, -1)
  const alerts: Alert[] = []

  // Pain 3, reported in the last 24 hours (event-based)
  const since = now.getTime() - 24 * 3600 * 1000
  const pain3 = t.wellness
    .filter(r => r.pain === 3 && r.createdAt && r.createdAt.getTime() > since && r.createdAt.getTime() <= now.getTime())
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  if (pain3) {
    alerts.push({
      kind: 'pain3', severity: 'red', date: pain3.date, painArea: pain3.painArea,
      recentPain: lastReports(t, today, 5).map(r => r.pain),
    })
  }

  // The same trainee without the reports created in the last 24 hours
  const prior: TraineeData = { ...t, wellness: t.wellness.filter(r => !r.createdAt || r.createdAt.getTime() <= since) }

  // 3 of the last 5 reports bad (per metric) — only metrics that are newly flagged
  const nowFlags = wellnessFlags(t, today)
  const before = new Set(wellnessFlags(prior, today).map(m => m.key))
  const fresh = nowFlags.filter(m => !before.has(m.key))
  if (fresh.length && !(pain3 && fresh.every(m => m.key === 'pain'))) {
    alerts.push({ kind: 'wellness', severity: fresh.some(m => m.key === 'pain') ? 'red' : 'amber', metrics: fresh })
  }

  // ≥3 days with an unfinished scheduled workout in the last 7 days
  const m = missedDays(t, today)
  if (m.count >= THRESHOLDS.missedDays && missedDays(t, yesterday).count < THRESHOLDS.missedDays) {
    alerts.push({ kind: 'missed', severity: 'amber', missedDays: m.count, strip: m.strip })
  }

  // Load: average pain up / vitality down vs the previous week
  const o = overload(t, today)
  if (o && !overload(prior, today)) alerts.push({ kind: 'overload', severity: 'amber', ...o })

  // Silence: 5 days without wellness or a completed workout
  const last = lastActivity(t, today)
  if (last && daysBetween(last, today) === THRESHOLDS.silenceDays) {
    alerts.push({ kind: 'silence', severity: 'amber', lastActivity: last, days: THRESHOLDS.silenceDays })
  }

  // New trainee: a week since the first scheduled workout and nothing completed
  const first = t.calendar.map(c => c.date).sort()[0]
  if (first && daysBetween(first, today) === THRESHOLDS.newTraineeDays &&
      !t.calendar.some(c => c.completed && c.date >= first && c.date < today)) {
    alerts.push({ kind: 'newTrainee', severity: 'blue', firstDate: first })
  }

  // Plan ending: nothing scheduled from a week from now
  const end = planEnding(t, today)
  if (end && !planEnding(t, yesterday)) alerts.push({ kind: 'planEnding', severity: 'blue', lastDate: end })

  return alerts
}

const ORDER: Record<Severity, number> = { red: 0, amber: 1, blue: 2 }

export function worstSeverity(alerts: Alert[]): Severity {
  return alerts.map(a => a.severity).sort((a, b) => ORDER[a] - ORDER[b])[0] ?? 'blue'
}
