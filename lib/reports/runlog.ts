// Records every report run (cron or test) in "ReportRuns", so the reports page can show
// when the emails last ran and what happened. Best effort: if the table is missing, nothing breaks.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ReportRun {
  RunAt: string
  Source: 'cron' | 'test'
  Ok: boolean
  Results: Record<string, unknown>
}

export async function logReportRun(db: SupabaseClient, source: ReportRun['Source'], ok: boolean, results: Record<string, unknown>) {
  try {
    const { error } = await db.from('ReportRuns').insert({ Source: source, Ok: ok, Results: results })
    if (error) console.warn('ReportRuns insert failed:', error.message)
  } catch (e) {
    console.warn('ReportRuns insert failed:', e)
  }
}

export async function lastReportRuns(db: SupabaseClient, limit = 8): Promise<ReportRun[] | null> {
  const { data, error } = await db.from('ReportRuns').select('RunAt, Source, Ok, Results').order('RunAt', { ascending: false }).limit(limit)
  return error ? null : (data as ReportRun[])
}
