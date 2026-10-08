// Date helpers for server-side reports. All "day" logic is in Israel time.

const TZ = 'Asia/Jerusalem'

/** 'YYYY-MM-DD' of a moment in Israel time. */
export function ilDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

/**
 * Calendar.StartTime / CreatedAt come back from Supabase as naive timestamps
 * that are stored in UTC. Parse them as UTC.
 */
export function parseDbTimestamp(ts: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts + 'Z')
}

/** 'YYYY-MM-DD' (Israel) of a DB timestamp. */
export function ilDateOfTimestamp(ts: string): string {
  return ilDate(parseDbTimestamp(ts))
}

/** Add whole days to a 'YYYY-MM-DD' string. */
export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Whole days between two 'YYYY-MM-DD' strings (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000)
}

const HE_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export function heWeekday(date: string): string {
  return HE_DAYS[new Date(date + 'T12:00:00Z').getUTCDay()]
}

/** '8.10' */
export function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(d)}.${Number(m)}`
}

/** 'יום ה׳, 8 באוקטובר' */
export function longHeDate(date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  const month = d.toLocaleDateString('he-IL', { month: 'long', timeZone: 'UTC' })
  return `יום ${heWeekday(date)}, ${d.getUTCDate()} ב${month}`
}
