'use client'

// Weekly scheduling: pick days for each of the trainee's workouts ("A on Mon + Thu"),
// a start date and a number of weeks, preview, and fill the calendar in one go.
// Rows follow the same shape the calendar's add-workout modal writes
// (StartTime in Israel time at the chosen hour, minute = order within the day).

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabaseClient'
import { LuCalendarPlus, LuMinus, LuPlus, LuSearch, LuX } from 'react-icons/lu'

const TZ = 'Asia/Jerusalem'
const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const HOURS = { morning: 9, afternoon: 14, evening: 18 } as const

interface W { id: number; name: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (count: number) => void
  email: string
  name?: string
  workouts?: W[]          // the trainee's assigned workouts; loaded when not given
  preselect?: number[]    // workouts to show first
}

export default function ScheduleSheet({ isOpen, onClose, onSuccess, email, name, workouts: given, preselect = [] }: Props) {
  const [loaded, setLoaded] = useState<W[] | null>(null)
  const [days, setDays] = useState<Record<number, number[]>>({})   // workoutId → weekdays (0 = Sunday)
  const [from, setFrom] = useState(() => moment.tz(TZ).format('YYYY-MM-DD'))
  const [weeks, setWeeks] = useState(4)
  const [time, setTime] = useState<keyof typeof HOURS>('morning')
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // the trainee's assigned workouts (when not passed in)
  useEffect(() => {
    if (!isOpen || given) return
    let cancelled = false
    ;(async () => {
      const { data: rel } = await supabase.from('WorkoutsForUser').select('WorkoutID').eq('Email', email)
      const ids = (rel ?? []).map(r => r.WorkoutID)
      if (!ids.length) { if (!cancelled) setLoaded([]); return }
      const { data } = await supabase.from('Workouts').select('WorkoutID, Name').in('WorkoutID', ids)
      if (!cancelled) setLoaded((data ?? []).map(w => ({ id: w.WorkoutID, name: w.Name })))
    })()
    return () => { cancelled = true }
  }, [isOpen, given, email])

  const all = useMemo(() => {
    const list = [...(given ?? loaded ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'he'))
    const first = list.filter(w => preselect.includes(w.id))
    return [...first, ...list.filter(w => !preselect.includes(w.id))]
  }, [given, loaded, preselect])
  const shown = q.trim() ? all.filter(w => w.name.includes(q.trim())) : all

  // dates: every chosen weekday from `from`, for `weeks` weeks
  const plan = useMemo(() => {
    const out: { date: string; workoutId: number }[] = []
    const start = moment.tz(from, TZ).startOf('day')
    const end = start.clone().add(weeks * 7, 'days')
    for (const w of all) {
      for (const d of days[w.id] ?? []) {
        let cur = start.clone().day(d)
        if (cur.isBefore(start)) cur.add(7, 'days')
        while (cur.isBefore(end)) { out.push({ date: cur.format('YYYY-MM-DD'), workoutId: w.id }); cur = cur.clone().add(7, 'days') }
      }
    }
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  }, [all, days, from, weeks])

  const toggle = (wid: number, d: number) => setDays(prev => {
    const cur = prev[wid] ?? []
    return { ...prev, [wid]: cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort() }
  })

  const nameOf = (id: number) => all.find(w => w.id === id)?.name ?? ''

  const save = async () => {
    if (!plan.length) return
    setSaving(true); setError('')
    try {
      const dates = [...new Set(plan.map(p => p.date))]
      const first = moment.tz(dates[0], TZ).startOf('day'), last = moment.tz(dates[dates.length - 1], TZ).endOf('day')
      // what's already on those days: keep order after it, and skip exact duplicates
      const [{ data: existing, error: e1 }, { data: wdata, error: e2 }] = await Promise.all([
        supabase.from('Calendar').select('WorkoutID, StartTime').eq('Email', email)
          .gte('StartTime', first.toISOString()).lte('StartTime', last.toISOString()),
        supabase.from('Workouts').select('WorkoutID, EstimatedTotalTime').in('WorkoutID', [...new Set(plan.map(p => p.workoutId))]),
      ])
      if (e1 || e2) throw e1 || e2
      const dur = new Map((wdata ?? []).map(w => [w.WorkoutID, w.EstimatedTotalTime ?? 0]))
      const perDay = new Map<string, number>()
      const taken = new Set<string>()
      for (const r of existing ?? []) {
        const d = moment.utc(r.StartTime).tz(TZ).format('YYYY-MM-DD')
        perDay.set(d, (perDay.get(d) ?? 0) + 1)
        taken.add(`${d}|${r.WorkoutID}`)
      }
      let skipped = 0
      const rows = []
      for (const p of plan) {
        if (taken.has(`${p.date}|${p.workoutId}`)) { skipped++; continue }
        const order = (perDay.get(p.date) ?? 0) + 1
        perDay.set(p.date, order)
        const start = moment.tz(p.date, TZ).hour(HOURS[time]).minute(order - 1).second(0)
        rows.push({
          Email: email, WorkoutID: p.workoutId,
          StartTime: start.toDate(), EndTime: start.clone().add(dur.get(p.workoutId) ?? 0, 'minutes').toDate(),
          Completed: false, Deloading: false, Color: '#3b82f6', Order: order,
        })
      }
      if (rows.length) {
        const { error: e3 } = await supabase.from('Calendar').insert(rows)
        if (e3) throw e3
      }
      onSuccess?.(rows.length)
      setDays({})
      onClose()
      if (skipped) setTimeout(() => alert(`שובצו ${rows.length} אימונים. ${skipped} כבר היו בקלנדר ודולגו.`), 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשיבוץ')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null
  const byWeek = new Map<number, typeof plan>()
  for (const p of plan) {
    const w = Math.floor(moment.tz(p.date, TZ).diff(moment.tz(from, TZ).startOf('day'), 'days') / 7)
    byWeek.set(w, [...(byWeek.get(w) ?? []), p])
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end md:items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" data-flow aria-modal="true" aria-labelledby="sched-title" className="w-full max-w-[560px] max-h-[94vh] bg-raised border border-line-strong rounded-t-[20px] md:rounded-[20px] flex flex-col text-fg" dir="rtl">
        <div className="px-4 pt-3 pb-3 border-b border-line flex items-center gap-3">
          <LuCalendarPlus aria-hidden className="w-6 h-6 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 id="sched-title" className="text-xl font-extrabold">שיבוץ שבועי</h2>
            {name && <p className="text-sm text-muted truncate">{name}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="w-10 h-10 rounded-xl grid place-items-center text-fg-2"><LuX aria-hidden className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-5">
          {/* when */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-bold text-fg-2">
              החל מ-
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-12 rounded-xl border-2 border-line-strong bg-surface text-fg px-3 text-base font-bold" />
            </label>
            <div className="flex flex-col gap-1.5 text-sm font-bold text-fg-2">
              <span>מספר שבועות</span>
              <div dir="ltr" className="flex h-12 gap-1.5">
                <button type="button" aria-label="פחות שבועות" onClick={() => setWeeks(w => Math.max(1, w - 1))} className="w-11 rounded-xl border border-line-strong bg-surface grid place-items-center"><LuMinus aria-hidden className="w-5 h-5" /></button>
                <output className="flex-1 grid place-items-center rounded-xl border-2 border-line-strong bg-surface text-xl font-extrabold tabular-nums">{weeks}</output>
                <button type="button" aria-label="יותר שבועות" onClick={() => setWeeks(w => Math.min(16, w + 1))} className="w-11 rounded-xl border border-line-strong bg-surface grid place-items-center"><LuPlus aria-hidden className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-surface border border-line rounded-xl p-1" role="group" aria-label="שעה ביום">
            {([['morning', 'בוקר'], ['afternoon', 'צהריים'], ['evening', 'ערב']] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={time === k} onClick={() => setTime(k)} className={`h-10 rounded-lg font-extrabold text-[15px] ${time === k ? 'bg-accent text-on-accent' : 'text-fg-2'}`}>{l}</button>
            ))}
          </div>

          {/* which workout on which days */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-fg-2">באילו ימים כל אימון?</p>
            {all.length > 6 && (
              <label className="flex items-center gap-2 h-11 rounded-xl border-2 border-line-strong bg-surface px-3 focus-within:border-accent">
                <LuSearch aria-hidden className="w-4 h-4 text-muted" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש אימון" aria-label="חיפוש אימון" className="flex-1 min-w-0 bg-transparent text-fg focus:outline-none" />
              </label>
            )}
            {(given ?? loaded) === null ? (
              <p className="text-muted text-sm py-2">טוען אימונים…</p>
            ) : all.length === 0 ? (
              <p className="text-muted text-sm py-2">אין אימונים מוקצים למתאמן. קודם מקצים אימונים, ואז משבצים.</p>
            ) : shown.map(w => {
              const sel = days[w.id] ?? []
              return (
                <div key={w.id} className={`rounded-xl border p-3 flex flex-col gap-2 ${sel.length ? 'border-accent/60 bg-accent/5' : 'border-line bg-surface'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold truncate">{w.name}</span>
                    {sel.length > 0 && <span className="text-xs text-accent font-bold shrink-0">{sel.length} בשבוע</span>}
                  </div>
                  <div className="grid grid-cols-7 gap-1" role="group" aria-label={`ימים ל${w.name}`}>
                    {DAYS.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={sel.includes(i)}
                        onClick={() => toggle(w.id, i)}
                        className={`h-10 rounded-lg text-sm font-extrabold ${sel.includes(i) ? 'bg-accent text-on-accent' : 'bg-raised border border-line-strong text-fg-2'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* preview */}
          {plan.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-2">
              <p className="font-extrabold">ייווספו {plan.length} אימונים</p>
              {[...byWeek.entries()].map(([w, items]) => (
                <div key={w} className="text-sm">
                  <span className="text-muted font-bold">שבוע {w + 1}: </span>
                  {items.map((p, i) => (
                    <span key={i} className="text-fg-2">
                      {i > 0 && ' · '}{DAYS[moment.tz(p.date, TZ).day()]} {moment.tz(p.date, TZ).format('D.M')} {nameOf(p.workoutId)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-danger text-sm">{error}</p>}
        </div>

        <div className="px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] border-t border-line flex gap-2">
          <button type="button" onClick={onClose} className="h-12 px-5 rounded-xl border border-line-strong text-fg-2 font-bold">ביטול</button>
          <button type="button" onClick={save} disabled={!plan.length || saving} className="flex-1 h-12 rounded-xl bg-accent text-on-accent font-extrabold disabled:opacity-40">
            {saving ? 'משבץ…' : plan.length ? `שבץ ${plan.length} אימונים` : 'בחר ימים'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
