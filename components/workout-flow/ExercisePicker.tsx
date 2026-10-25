// components/workout-flow/ExercisePicker.tsx
// Pick exercises from the full list for a free session: the trainee's recent exercises first
// (with when and what they did last), then search + category filter over all active exercises.
// The order of picking is the order of the session.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { fmtDuration } from '@/components/workout-flow/ExerciseStep'
import { LuCheck, LuSearch, LuX } from 'react-icons/lu'

export interface PickedExercise {
  ExerciseID: number
  Name: string
  Category: string | null
  Description: string | null
  IsSingleHand: boolean
  isDuration: boolean
  ImageURL: string | null
  VideoURL: string | null
}

interface Recent { date: string; text: string }

const RECENT_MAX = 8

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d <= 0) return 'היום'
  if (d === 1) return 'אתמול'
  if (d < 7) return `לפני ${d} ימים`
  if (d < 14) return 'לפני שבוע'
  if (d < 60) return `לפני ${Math.round(d / 7)} שבועות`
  return `לפני ${Math.round(d / 30)} חודשים`
}

function lastText(r: { RepsDone: number | null; DurationSec: number | null; WeightKG: number | null }): string {
  const main = r.DurationSec ? fmtDuration(r.DurationSec) : r.RepsDone ? `${r.RepsDone} חזרות` : ''
  const w = r.WeightKG ? `${r.WeightKG > 0 ? '+' : ''}${r.WeightKG} ק״ג` : ''
  return [main, w].filter(Boolean).join(' · ')
}

export default function ExercisePicker({ email, title = 'בחירת תרגילים', actionLabel, onDone, onCancel }: {
  email: string
  title?: string
  /** button text for n picked, e.g. n => `התחל סשן · ${n}` */
  actionLabel: (n: number) => string
  onDone: (picked: PickedExercise[]) => void
  onCancel: () => void
}) {
  const [all, setAll] = useState<PickedExercise[]>([])
  const [recent, setRecent] = useState<Map<number, Recent>>(new Map())
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [picked, setPicked] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: exs }, { data: logs }] = await Promise.all([
        supabase
          .from('Exercises')
          .select('ExerciseID, Name, Category, Description, IsSingleHand, isDuration, ImageURL, VideoURL, is_dynamic, Status')
          .eq('Status', 'Active')
          .order('Name'),
        supabase
          .from('ExerciseLogs')
          .select('ExerciseID, CreatedAt, RepsDone, DurationSec, WeightKG')
          .eq('Email', email)
          .eq('Completed', true)
          .order('CreatedAt', { ascending: false })
          .limit(600),
      ])
      if (cancelled) return
      // dynamic exercises are level placeholders, not something you can do directly
      setAll(((exs ?? []) as (PickedExercise & { is_dynamic?: boolean })[]).filter(x => !x.is_dynamic))
      const m = new Map<number, Recent>()
      for (const l of logs ?? []) {
        if (m.has(l.ExerciseID) || !l.CreatedAt) continue
        m.set(l.ExerciseID, { date: daysAgo(l.CreatedAt), text: lastText(l) })
      }
      setRecent(m)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [email])

  const byId = useMemo(() => new Map(all.map(x => [x.ExerciseID, x])), [all])
  const categories = useMemo(
    () => [...new Set(all.map(x => x.Category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'he')),
    [all],
  )
  const q = query.trim().toLowerCase()
  const matches = (x: PickedExercise) =>
    (category === 'all' || x.Category === category) &&
    (!q || x.Name.toLowerCase().includes(q) || (x.Category ?? '').toLowerCase().includes(q))
  const recentList = [...recent.keys()].map(id => byId.get(id)).filter((x): x is PickedExercise => !!x && matches(x)).slice(0, RECENT_MAX)
  const recentIds = new Set(recentList.map(x => x.ExerciseID))
  const rest = all.filter(x => matches(x) && !recentIds.has(x.ExerciseID))

  const toggle = (id: number) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))

  const Row = ({ x }: { x: PickedExercise }) => {
    const n = picked.indexOf(x.ExerciseID) + 1
    const r = recent.get(x.ExerciseID)
    return (
      <button
        type="button"
        onClick={() => toggle(x.ExerciseID)}
        aria-pressed={n > 0}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-start transition-colors ${n ? 'border-free bg-free/10' : 'border-line bg-surface hover:border-line-strong'}`}
      >
        <span className={`w-7 h-7 rounded-lg border-2 shrink-0 flex items-center justify-center text-sm font-bold ${n ? 'bg-free border-free text-on-accent' : 'border-line-strong'}`}>
          {n || ''}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-fg truncate">{x.Name}</span>
          {x.Category && <span className="block text-xs text-muted">{x.Category}</span>}
        </span>
        {r && (
          <span className="text-xs text-muted text-end shrink-0 max-w-[45%]">
            {r.date}
            {r.text && <><br /><bdi dir="ltr">{r.text}</bdi></>}
          </span>
        )}
      </button>
    )
  }

  return (
    // full-screen layer above everything (also above the workout flow, when adding mid-session)
    <div className="fixed inset-0 z-[80] bg-bg text-fg flex flex-col pt-[env(safe-area-inset-top)]" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <header className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-line">
        <h1 id="picker-title" className="text-xl font-bold text-fg">{title}</h1>
        <button type="button" onClick={onCancel} className="min-h-11 px-3 text-muted inline-flex items-center gap-1">
          <LuX aria-hidden className="w-4 h-4" />ביטול
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full px-4 py-3 flex flex-col gap-3">

      <label className="relative block">
        <span className="sr-only">חיפוש תרגיל</span>
        <LuSearch aria-hidden className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted" />
        <input
          id="exercise-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חיפוש תרגיל…"
          className="w-full h-12 ps-9 pe-3 rounded-xl border border-line-strong bg-raised text-fg text-base focus:outline-none focus:border-free"
        />
      </label>

      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="קטגוריות">
          {['all', ...categories].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`h-8 px-3 rounded-full border text-sm whitespace-nowrap ${category === c ? 'border-free text-free bg-free/10 font-bold' : 'border-line-strong text-fg-2'}`}
            >
              {c === 'all' ? 'הכול' : c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted text-center py-8">טוען תרגילים…</p>
      ) : (
        <>
          {recentList.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-bold tracking-wide text-muted">עשית לאחרונה</h2>
              {recentList.map(x => <Row key={x.ExerciseID} x={x} />)}
            </section>
          )}
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-bold tracking-wide text-muted">{recentList.length ? 'כל התרגילים' : 'תרגילים'}</h2>
            {rest.length === 0 && recentList.length === 0 ? (
              <p className="text-muted text-center py-6">לא נמצאו תרגילים</p>
            ) : rest.map(x => <Row key={x.ExerciseID} x={x} />)}
          </section>
        </>
      )}

      </div>
      </div>
      <footer className="px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] border-t border-line bg-raised">
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={() => onDone(picked.map(id => byId.get(id)!).filter(Boolean))}
          className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 h-12 rounded-xl bg-free text-on-accent font-bold disabled:opacity-40"
        >
          <LuCheck aria-hidden className="w-5 h-5" />
          {picked.length ? actionLabel(picked.length) : 'בחרו לפחות תרגיל אחד'}
        </button>
      </footer>
    </div>
  )
}
