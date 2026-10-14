'use client'

// Coach range tools: the range is marked on the big calendar (see app/calendar/page.tsx),
// this panel shows what the chosen action will do for that range and runs it.
//  - cycle:    copy the marked days (any length, usually a week) N times, back to back.
//              Copies are added next to existing workouts (with a warning), never deloaded.
//  - deload / undeload: set or clear deloading on every workout in the range (undoable).
//  - clear:    delete the workouts in the range (completed ones only when asked; not undoable).

import { useEffect, useState } from 'react'
import moment from 'moment-timezone'
import { LuBatteryLow, LuCopy, LuMinus, LuPlus, LuTrash2, LuX } from 'react-icons/lu'
import { supabase } from '@/lib/supabaseClient'

export type RangeTool = 'cycle' | 'deload' | 'undeload' | 'clear'

export const RANGE_TOOLS: { key: RangeTool; label: string }[] = [
  { key: 'cycle', label: 'שכפול סייקל' },
  { key: 'deload', label: 'דילודינג' },
  { key: 'undeload', label: 'הסר דילודינג' },
  { key: 'clear', label: 'נקה טווח' },
]

const TZ = 'Asia/Jerusalem'
const DB = 'YYYY-MM-DD HH:mm:ss'
// StartTime is naive UTC; a local day maps to [00:00, 24:00) Jerusalem time
const dayFrom = (d: string) => moment.tz(d, TZ).startOf('day').utc().format(DB)
const dayTo = (d: string) => moment.tz(d, TZ).endOf('day').utc().format(DB)
const localDay = (startTime: string) => moment.utc(startTime).tz(TZ).format('YYYY-MM-DD')
const addDays = (d: string, n: number) => moment(d, 'YYYY-MM-DD').add(n, 'days').format('YYYY-MM-DD')
const dm = (d: string) => moment(d, 'YYYY-MM-DD').format('DD/MM')
const span = (a: string, b: string) => <bdi dir="ltr" className="tabular-nums">{dm(a)}–{dm(b)}</bdi>
const daysBetween = (a: string, b: string) => moment(b, 'YYYY-MM-DD').diff(moment(a, 'YYYY-MM-DD'), 'days') + 1

interface Row {
  CalendarID: number
  WorkoutID: number
  StartTime: string
  EndTime: string | null
  Completed: boolean | null
  Deloading: boolean | null
  DeloadingPercentage: number | null
  Order: number | null
  TimeOfDay: string | null
  CoachNotes: string | null
  Color: string | null
}

interface Props {
  tool: RangeTool
  email: string
  from: string | null   // YYYY-MM-DD (local), ordered
  to: string | null
  onPreview: (days: Set<string>) => void
  onDone: (text: string, undo?: () => Promise<void>) => void
  onCancel: () => void
  /** desktop: shown in the side column instead of floating at the bottom */
  inline?: boolean
}

export default function RangeToolPanel({ tool, email, from, to, onPreview, onDone, onCancel, inline }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busyDays, setBusyDays] = useState<Set<string>>(new Set())
  const [repeats, setRepeats] = useState(1)
  const [pct, setPct] = useState(70)
  const [withCompleted, setWithCompleted] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const len = from && to ? daysBetween(from, to) : 0

  // load the workouts in the marked range
  useEffect(() => {
    if (!from || !to) { setRows(null); return }
    let alive = true
    setRows(null)
    setError('')
    setConfirmClear(false)
    supabase
      .from('Calendar')
      .select('CalendarID, WorkoutID, StartTime, EndTime, Completed, Deloading, DeloadingPercentage, Order, TimeOfDay, CoachNotes, Color')
      .eq('Email', email)
      .gte('StartTime', dayFrom(from))
      .lte('StartTime', dayTo(to))
      .order('StartTime')
      .then(({ data, error: e }) => {
        if (!alive) return
        if (e) { setError('שגיאה בטעינת האימונים בטווח'); setRows([]); return }
        setRows((data ?? []) as Row[])
      })
    return () => { alive = false }
  }, [email, from, to])

  // cycle: target days (preview on the calendar) and the ones that already have workouts
  const targetDays = (() => {
    const s = new Set<string>()
    if (tool !== 'cycle' || !rows || !from || !to) return s
    for (let k = 1; k <= repeats; k++) rows.forEach(r => s.add(addDays(localDay(r.StartTime), len * k)))
    return s
  })()
  const targetKey = [...targetDays].sort().join(',')
  useEffect(() => {
    onPreview(new Set(targetKey ? targetKey.split(',') : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey])
  useEffect(() => () => onPreview(new Set()), [onPreview])

  useEffect(() => {
    if (tool !== 'cycle' || !from || !to || !len) { setBusyDays(new Set()); return }
    let alive = true
    supabase
      .from('Calendar')
      .select('StartTime')
      .eq('Email', email)
      .gte('StartTime', dayFrom(addDays(from, len)))
      .lte('StartTime', dayTo(addDays(to, len * repeats)))
      .then(({ data }) => { if (alive) setBusyDays(new Set((data ?? []).map(r => localDay(r.StartTime)))) })
    return () => { alive = false }
  }, [tool, email, from, to, len, repeats])

  const clash = [...targetDays].filter(d => busyDays.has(d)).length
  const completed = rows?.filter(r => r.Completed).length ?? 0
  const toClear = rows?.filter(r => withCompleted || !r.Completed) ?? []

  const run = async () => {
    if (!rows || !from || !to || running) return
    setRunning(true)
    setError('')
    try {
      if (tool === 'cycle') {
        const now = moment().format(DB)
        const inserts = []
        for (let k = 1; k <= repeats; k++) {
          for (const r of rows) {
            const s = moment.utc(r.StartTime).add(len * k, 'days')
            const e = r.EndTime ? moment.utc(r.EndTime).add(len * k, 'days') : s.clone().add(1, 'hour')
            inserts.push({
              Email: email, WorkoutID: r.WorkoutID, StartTime: s.format(DB), EndTime: e.format(DB),
              TimeOfDay: r.TimeOfDay, Order: r.Order, CoachNotes: r.CoachNotes, Color: r.Color || '#3b82f6',
              Completed: false, Deloading: false, DeloadingPercentage: null,
              ClimberNotes: null, RPE: null, CreatedAt: now,
            })
          }
        }
        const { data, error: e } = await supabase.from('Calendar').insert(inserts).select('CalendarID')
        if (e) throw e
        const ids = (data ?? []).map(d => d.CalendarID)
        onDone(`${ids.length} אימונים נוספו (${repeats === 1 ? 'פעם אחת' : `${repeats} פעמים`})`, async () => {
          await supabase.from('Calendar').delete().in('CalendarID', ids)
        })
      } else if (tool === 'deload' || tool === 'undeload') {
        const ids = rows.map(r => r.CalendarID)
        const patch = tool === 'deload' ? { Deloading: true, DeloadingPercentage: pct } : { Deloading: false, DeloadingPercentage: null }
        const { data, error: e } = await supabase.from('Calendar').update(patch).in('CalendarID', ids).select('CalendarID')
        if (e) throw e
        if (!data?.length) throw new Error('העדכון נחסם (0 שורות עודכנו)')
        const before = rows.map(r => ({ id: r.CalendarID, Deloading: r.Deloading ?? false, DeloadingPercentage: r.DeloadingPercentage }))
        onDone(tool === 'deload' ? `דילודינג ${pct}% על ${data.length} אימונים` : `דילודינג הוסר מ-${data.length} אימונים`, async () => {
          await Promise.all(before.map(b => supabase.from('Calendar').update({ Deloading: b.Deloading, DeloadingPercentage: b.DeloadingPercentage }).eq('CalendarID', b.id)))
        })
      } else {
        if (!confirmClear) { setConfirmClear(true); setRunning(false); return }
        const ids = toClear.map(r => r.CalendarID)
        const { error: ce } = await supabase.from('ClimbingLog').delete().in('CalendarID', ids)
        if (ce && ce.code !== '23503' && ce.code !== 'PGRST116') throw ce
        const { data, error: e } = await supabase.from('Calendar').delete().in('CalendarID', ids).select('CalendarID')
        if (e) throw e
        if (!data?.length) throw new Error('המחיקה נחסמה (0 שורות נמחקו)')
        onDone(`${data.length} אימונים נמחקו`)
      }
    } catch (e) {
      setError(`הפעולה נכשלה: ${(e as { message?: string })?.message ?? 'שגיאה לא ידועה'}`)
      setRunning(false)
    }
  }

  const title = RANGE_TOOLS.find(t => t.key === tool)!.label
  const Icon = tool === 'cycle' ? LuCopy : tool === 'clear' ? LuTrash2 : tool === 'deload' ? LuBatteryLow : LuX
  const n = rows?.length ?? 0

  let body: React.ReactNode
  if (!from) body = <p className="text-fg-2">סמן בלוח את יום ההתחלה. במחשב אפשר גם לגרור מיום ליום.</p>
  else if (!to) body = <p className="text-fg-2">התחלה: <b>{dm(from)}</b>. עכשיו סמן את יום הסוף.</p>
  else if (!rows) body = <p className="text-muted">טוען אימונים בטווח...</p>
  else if (!n) body = <p className="text-fg-2">אין אימונים בטווח {span(from, to)}. סמן טווח אחר.</p>
  else if (tool === 'cycle') body = (
    <div className="flex flex-col gap-2">
      <p className="text-fg-2">סייקל של <b>{len} ימים</b> · {n} אימונים ({span(from, to)})</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted">כמה פעמים לחזור</span>
        <Stepper value={repeats} onChange={v => setRepeats(Math.min(12, v))} />
        <span className="text-sm text-muted">עד {dm(addDays(to, len * repeats))}</span>
      </div>
      {clash > 0 && <p className="text-sm text-warning">שים לב: ב-{clash} {clash === 1 ? 'יום' : 'ימים'} כבר יש אימונים. העותקים יתווספו לידם.</p>}
      <p className="text-xs text-muted">העותקים לא מקבלים דילודינג. הימים שיתמלאו מסומנים בלוח.</p>
    </div>
  )
  else if (tool === 'deload') body = (
    <div className="flex flex-col gap-2">
      <p className="text-fg-2">{n} אימונים ({span(from, to)})</p>
      <label className="flex items-center gap-2 text-sm text-muted">
        אחוז מהעומס
        <input type="number" min={1} max={100} value={pct} onChange={e => setPct(Math.max(1, Math.min(100, +e.target.value || 0)))}
          className="w-20 h-10 rounded-lg bg-bg border border-line-strong px-2 text-base text-fg tabular-nums focus:outline-none focus:border-accent" />
        %
      </label>
    </div>
  )
  else if (tool === 'undeload') body = <p className="text-fg-2">יוסר דילודינג מ-{rows.filter(r => r.Deloading).length} מתוך {n} אימונים ({span(from, to)})</p>
  else body = (
    <div className="flex flex-col gap-2">
      <p className="text-fg-2">ימחקו <b>{toClear.length}</b> אימונים ({span(from, to)})</p>
      {completed > 0 && (
        <label className="flex items-center gap-2 text-sm text-fg-2">
          <input type="checkbox" checked={withCompleted} onChange={e => { setWithCompleted(e.target.checked); setConfirmClear(false) }} className="w-5 h-5 accent-[var(--color-danger)]" />
          למחוק גם {completed === 1 ? 'אימון אחד שבוצע' : `${completed} אימונים שבוצעו`} (כולל המסלולים שנרשמו בהם)
        </label>
      )}
      {confirmClear && <p className="text-sm text-danger font-bold">אי אפשר לבטל מחיקה. ללחוץ שוב לאישור.</p>}
    </div>
  )

  const ready = !!(from && to && rows && n && (tool !== 'clear' || toClear.length))
  const actionLabel = tool === 'cycle' ? `שכפל (${n * repeats})`
    : tool === 'deload' ? 'החל דילודינג'
    : tool === 'undeload' ? 'הסר דילודינג'
    : confirmClear ? `כן, למחוק ${toClear.length}` : 'מחק'

  const card = (
      <div role="region" data-flow aria-label={title} className={`pointer-events-auto w-full bg-raised border border-line-strong rounded-2xl p-3.5 flex flex-col gap-3 ${inline ? '' : 'max-w-xl shadow-2xl'}`} dir="rtl">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className={`w-5 h-5 ${tool === 'clear' ? 'text-danger' : 'text-accent'}`} />
          <b className="text-lg">{title}</b>
          {from && <span className="text-sm text-muted">{to && to !== from ? span(from, to) : dm(from)}</span>}
          <button type="button" onClick={onCancel} aria-label="סגירה" className="ms-auto w-9 h-9 grid place-items-center rounded-lg text-fg-3 hover:text-fg">
            <LuX aria-hidden className="w-5 h-5" />
          </button>
        </div>
        <div className="text-[15px]">{body}</div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn-ghost min-h-10 px-4 text-sm">ביטול</button>
          <button type="button" onClick={run} disabled={!ready || running}
            className={`${tool === 'clear' ? 'btn bg-danger text-on-accent hover:bg-danger/90' : 'btn-primary'} min-h-10 px-5 text-sm disabled:opacity-45`}>
            {running ? 'מבצע...' : actionLabel}
          </button>
        </div>
      </div>
  )
  // phone: the bar above the calendar guides the marking; the panel appears once a range is marked
  if (!inline && !to) return null
  if (inline) return <div className="sticky" style={{ top: 'calc(var(--app-header-height, 0px) + 4.5rem)' }}>{card}</div>
  return (
    <div className="fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] lg:bottom-24 z-50 px-4 flex justify-center pointer-events-none">
      {card}
    </div>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" dir="ltr" role="group" aria-label="מספר חזרות">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="פחות" className="w-9 h-9 rounded-lg border border-line-strong bg-surface grid place-items-center"><LuMinus aria-hidden className="w-4 h-4" /></button>
      <span className="min-w-[2rem] text-center font-extrabold text-lg tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="יותר" className="w-9 h-9 rounded-lg border border-line-strong bg-surface grid place-items-center"><LuPlus aria-hidden className="w-4 h-4" /></button>
    </div>
  )
}
