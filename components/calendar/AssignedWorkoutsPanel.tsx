'use client'

// Desktop calendar side panel (coach/admin): the active trainee's assigned workouts.
// Drag a workout onto a calendar day to schedule it, or "+" to add it to the day being viewed.
// "ניהול הקצאה" opens a sheet to assign / unassign workouts without leaving the calendar.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabaseClient'
import { LuCheck, LuGripVertical, LuListChecks, LuPlus, LuSearch, LuX } from 'react-icons/lu'

export interface PanelWorkout { id: number; name: string; category?: string }

interface Props {
  email: string
  name?: string
  workouts: PanelWorkout[]                         // assigned to this trainee
  onAssignedChange: () => void                     // reload the assigned list
  onDragStart: (w: PanelWorkout) => void
  onDragEnd: () => void
  addLabel?: string                                // e.g. "להיום" — shows a "+" on each row when set
  onAdd?: (w: PanelWorkout) => void
}

const norm = (s: string) => s.toLowerCase().replace(/["'׳״\-–_.]/g, '').trim()

export default function AssignedWorkoutsPanel({ email, name, workouts, onAssignedChange, onDragStart, onDragEnd, addLabel, onAdd }: Props) {
  const [q, setQ] = useState('')
  const [manage, setManage] = useState(false)
  const shown = q.trim() ? workouts.filter(w => norm(w.name).includes(norm(q)) || norm(w.category ?? '').includes(norm(q))) : workouts
  const sorted = [...shown].sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '', 'he') || a.name.localeCompare(b.name, 'he'))

  return (
    <aside className="sticky self-start rounded-xl border border-line bg-surface flex flex-col overflow-hidden" style={{ top: 'calc(var(--app-header-height, 0px) + 1rem)', maxHeight: 'calc(100vh - var(--app-header-height, 0px) - 2rem)' }}>
      <div className="p-3 border-b border-line flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">אימונים מוקצים</h2>
            <p className="text-xs text-muted truncate">{name ?? email} · {workouts.length}</p>
          </div>
          <button type="button" onClick={() => setManage(true)} className="h-9 px-3 rounded-lg border border-accent text-accent text-sm font-bold inline-flex items-center gap-1.5 shrink-0 hover:bg-accent/10">
            <LuListChecks aria-hidden className="w-4 h-4" />ניהול הקצאה
          </button>
        </div>
        {workouts.length > 6 && (
          <label className="flex items-center gap-2 h-9 rounded-lg border border-line-strong bg-raised px-2.5 focus-within:border-accent">
            <LuSearch aria-hidden className="w-4 h-4 text-muted" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש" aria-label="חיפוש אימון מוקצה" className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none focus-visible:outline-none" />
          </label>
        )}
        <p className="text-xs text-muted">{addLabel ? `גרור ליום או לחץ + להוספה ${addLabel}` : 'גרור אימון ליום בלוח'}</p>
      </div>

      <ul className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {workouts.length === 0 && (
          <li className="p-3 text-sm text-muted text-center">
            אין אימונים מוקצים.
            <button type="button" onClick={() => setManage(true)} className="block mx-auto mt-2 text-accent font-bold underline">להקצות אימונים</button>
          </li>
        )}
        {sorted.map(w => (
          <li
            key={w.id}
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', w.name); onDragStart(w) }}
            onDragEnd={onDragEnd}
            className="group flex items-center gap-2 rounded-lg border border-line bg-raised px-2 py-2 cursor-grab active:cursor-grabbing hover:border-accent/60"
          >
            <LuGripVertical aria-hidden className="w-4 h-4 text-faint shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold truncate">{w.name}</span>
              {w.category && <span className="block text-[11px] text-muted truncate">{w.category}</span>}
            </span>
            {onAdd && (
              <button type="button" onClick={() => onAdd(w)} aria-label={`הוסף ${w.name} ${addLabel ?? ''}`} title={`הוסף ${addLabel ?? ''}`} className="w-8 h-8 rounded-lg border border-line-strong text-accent grid place-items-center shrink-0 hover:bg-accent/10">
                <LuPlus aria-hidden className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {manage && <ManageSheet email={email} name={name} assigned={new Set(workouts.map(w => w.id))} onChanged={onAssignedChange} onClose={() => setManage(false)} />}
    </aside>
  )
}

// ── Assign / unassign sheet ──────────────────────────────────────────────────

interface LibWorkout { WorkoutID: number; Name: string; Category: string | null }

function ManageSheet({ email, name, assigned, onChanged, onClose }: {
  email: string
  name?: string
  assigned: Set<number>
  onChanged: () => void
  onClose: () => void
}) {
  const [lib, setLib] = useState<LibWorkout[] | null>(null)
  const [mine, setMine] = useState<Set<number>>(assigned)
  const [busy, setBusy] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [onlyMine, setOnlyMine] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase.from('Workouts').select('WorkoutID, Name, Category').eq('IsActive', true).order('Name').then(({ data }) => {
      if (!cancelled) setLib((data ?? []) as LibWorkout[])
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggle = async (w: LibWorkout) => {
    const on = mine.has(w.WorkoutID)
    if (on && !confirm(`להסיר את "${w.Name}" מהאימונים של ${name ?? email}?\nאימונים שכבר בלוח נשארים.`)) return
    setBusy(w.WorkoutID); setError('')
    const { error: e } = on
      ? await supabase.from('WorkoutsForUser').delete().eq('Email', email).eq('WorkoutID', w.WorkoutID)
      : await supabase.from('WorkoutsForUser').insert({ Email: email, WorkoutID: w.WorkoutID, IsKeyWorkout: false, Notes: '' })
    setBusy(null)
    if (e) { setError(e.message); return }
    setMine(prev => { const n = new Set(prev); if (on) n.delete(w.WorkoutID); else n.add(w.WorkoutID); return n })
    onChanged()
  }

  const cats = [...new Set((lib ?? []).map(w => w.Category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'he'))
  const term = norm(q)
  const shown = (lib ?? [])
    .filter(w => !onlyMine || mine.has(w.WorkoutID))
    .filter(w => cat === 'all' || w.Category === cat)
    .filter(w => !term || norm(w.Name).includes(term))
    .sort((a, b) => Number(mine.has(b.WorkoutID)) - Number(mine.has(a.WorkoutID)) || a.Name.localeCompare(b.Name, 'he'))
  const chip = (on: boolean) => `h-8 px-3 rounded-full border text-[13px] font-bold whitespace-nowrap ${on ? 'bg-accent border-accent text-on-accent' : 'border-line-strong text-fg-2 hover:border-accent'}`

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" data-flow aria-modal="true" aria-labelledby="manage-title" dir="rtl" className="w-full max-w-[600px] h-[85vh] bg-raised border border-line-strong rounded-[20px] flex flex-col text-fg">
        <div className="px-4 pt-4 pb-3 border-b border-line flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 id="manage-title" className="text-xl font-extrabold">ניהול הקצאה</h2>
              <p className="text-sm text-muted truncate">{name ?? email} · {mine.size} אימונים מוקצים</p>
            </div>
            <button type="button" onClick={onClose} aria-label="סגירה" className="w-10 h-10 rounded-xl grid place-items-center text-fg-2 hover:bg-surface"><LuX aria-hidden className="w-5 h-5" /></button>
          </div>
          <label className="flex items-center gap-2 h-11 rounded-xl border-2 border-line-strong bg-surface px-3 focus-within:border-accent">
            <LuSearch aria-hidden className="w-4 h-4 text-muted" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש אימון" aria-label="חיפוש אימון" className="flex-1 min-w-0 bg-transparent focus:outline-none focus-visible:outline-none" />
          </label>
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="סינון">
            <button type="button" aria-pressed={onlyMine} onClick={() => setOnlyMine(v => !v)} className={chip(onlyMine)}>רק מוקצים</button>
            <button type="button" aria-pressed={cat === 'all'} onClick={() => setCat('all')} className={chip(cat === 'all')}>הכל</button>
            {cats.map(c => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto overscroll-contain p-2">
          {!lib && <li className="p-6 text-center text-muted">טוען אימונים…</li>}
          {lib && shown.length === 0 && <li className="p-6 text-center text-muted">לא נמצא אימון.</li>}
          {shown.map(w => {
            const on = mine.has(w.WorkoutID)
            return (
              <li key={w.WorkoutID}>
                <button type="button" aria-pressed={on} disabled={busy === w.WorkoutID} onClick={() => toggle(w)}
                  className={`w-full min-h-12 px-3 rounded-xl flex items-center gap-3 text-right disabled:opacity-50 ${on ? 'bg-accent/10' : 'hover:bg-surface'}`}>
                  <span className={`w-6 h-6 rounded-md border-2 grid place-items-center shrink-0 ${on ? 'bg-accent border-accent text-on-accent' : 'border-line-strong'}`}>
                    {on && <LuCheck aria-hidden className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold truncate">{w.Name}</span>
                    {w.Category && <span className="block text-xs text-muted">{w.Category}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {error && <p className="px-4 text-danger text-sm">{error}</p>}
        <div className="px-4 py-3 border-t border-line flex justify-end">
          <button type="button" onClick={onClose} className="h-11 px-6 rounded-xl bg-accent text-on-accent font-extrabold">סיום</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
