'use client'

// Exercise library picker, shared by the workout editor and the dynamic-exercise editor.
// Phone: full screen. Desktop (panel): a side panel that stays open, with target chips
// (block / level) to choose where a tap adds. Items can also be dragged (onDragItem).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuCheck, LuGripVertical, LuPlus, LuSearch, LuX } from 'react-icons/lu'
import { Exercise } from '@/types/workouts'
import { supabase } from '@/lib/supabaseClient'
import NewExerciseForm from './NewExerciseForm'

// ── Picker: full screen on the phone, a side panel on the desktop ────────────

export default function ExercisePicker({ blockLabel, onAdd, onClose, panel = false, focusSig = 0, targets = [], target = 0, onTarget, onDragItem, filter, resetKey }: {
  blockLabel: string                         // where a tap adds, e.g. "בלוק 2" / "רמה 3"
  onAdd: (ex: Exercise) => void
  onClose: (added: number) => void
  panel?: boolean
  focusSig?: number                          // bump to focus the search (panel)
  targets?: string[]                         // panel: chips to switch where taps add
  target?: number
  onTarget?: (i: number) => void
  onDragItem?: (ex: Exercise | null) => void // panel: items become draggable
  filter?: (ex: Exercise) => boolean         // e.g. hide dynamic exercises
  resetKey?: string | number                 // clears the "added" marks when it changes
}) {
  const [lib, setLib] = useState<Exercise[] | null>(null)
  const [usage, setUsage] = useState<Map<number, number>>(new Map())
  const [cat, setCat] = useState<string>('frequent')
  const [q, setQ] = useState('')
  const [added, setAdded] = useState<Map<number, number>>(new Map())
  const [creating, setCreating] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const filterRef = useRef(filter)   // read once on load
  const [seenKey, setSeenKey] = useState(resetKey)
  if (resetKey !== seenKey) { setSeenKey(resetKey); setAdded(new Map()) }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('Exercises').select('*').eq('Status', 'Active').order('Name'),
      supabase.from('WorkoutsExercises').select('ExerciseID').range(0, 9999),
    ]).then(([exs, uses]) => {
      if (cancelled) return
      const counts = new Map<number, number>()
      for (const r of uses.data ?? []) counts.set(r.ExerciseID as number, (counts.get(r.ExerciseID as number) ?? 0) + 1)
      setUsage(counts)
      const keep = filterRef.current
      setLib(((exs.data ?? []) as Exercise[]).filter(e => !keep || keep(e)))
      if (!counts.size) setCat('all')
    })
    return () => { cancelled = true }
  }, [])

  const n = [...added.values()].reduce((a, b) => a + b, 0)
  useEffect(() => {
    if (panel) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(n) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => { if (panel && focusSig) input.current?.focus() }, [panel, focusSig])

  const cats = [...new Set((lib ?? []).map(e => e.Category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'))
  const term = q.trim().toLowerCase()

  let groups: [string, Exercise[]][] = []
  if (lib) {
    if (term) groups = [['תוצאות', lib.filter(e => e.Name.toLowerCase().includes(term) || e.Description?.toLowerCase().includes(term))]]
    else if (cat === 'frequent') groups = [['הכי בשימוש באימונים', [...lib].filter(e => usage.has(e.ExerciseID)).sort((a, b) => (usage.get(b.ExerciseID) ?? 0) - (usage.get(a.ExerciseID) ?? 0)).slice(0, 20)]]
    else if (cat === 'all') groups = cats.map(c => [c, lib.filter(e => e.Category === c)])
    else groups = [[cat, lib.filter(e => e.Category === cat)]]
  }

  const add = (ex: Exercise) => {
    onAdd(ex)
    setAdded(m => new Map(m).set(ex.ExerciseID, (m.get(ex.ExerciseID) ?? 0) + 1))
    try { navigator.vibrate?.(8) } catch { /* not supported */ }
  }
  const chip = (on: boolean) => `h-10 px-3.5 rounded-full border text-sm font-bold whitespace-nowrap shrink-0 ${on ? 'bg-accent border-accent text-on-accent' : 'border-line-strong bg-surface text-fg-2'}`

  const body = (
    <>
      <div className="px-4 pt-3 pb-2 flex flex-col gap-2.5 border-b border-line">
        {panel ? (
          <div className="flex items-center gap-2 flex-wrap">
            <h2 id="pick-title" className="text-lg font-extrabold">הוספת תרגילים</h2>
            {targets.length > 1 ? (
              <div className="flex gap-1 flex-wrap ms-auto" role="group" aria-label="לאיזה בלוק להוסיף">
                {targets.map((label, bi) => (
                  <button key={bi} type="button" aria-pressed={bi === target} onClick={() => onTarget?.(bi)}
                    className={`h-8 px-3 rounded-full border text-[13px] font-bold ${bi === target ? 'bg-accent border-accent text-on-accent' : 'border-line-strong text-fg-2 hover:border-accent'}`}>
                    {label}
                  </button>
                ))}
              </div>
            ) : <span className="ms-auto text-sm text-muted">ל{blockLabel}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <h2 id="pick-title" className="flex-1 text-[19px] font-extrabold">הוספה ל{blockLabel}</h2>
            <button type="button" onClick={() => onClose(n)} aria-label="סגירה" className="w-11 h-11 rounded-xl border border-line bg-surface grid place-items-center text-fg-2"><LuX aria-hidden className="w-5 h-5" /></button>
          </div>
        )}
        <label className="flex items-center gap-2 h-12 rounded-xl border-2 border-line-strong bg-surface px-3 focus-within:border-accent">
          <LuSearch aria-hidden className="w-5 h-5 text-muted shrink-0" />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש תרגיל" aria-label="חיפוש תרגיל" autoComplete="off" enterKeyHint="search" className="flex-1 min-w-0 bg-transparent text-fg text-[17px] focus:outline-none" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="נקה חיפוש" className="text-faint"><LuX aria-hidden className="w-4 h-4" /></button>}
        </label>
        <div className={`flex gap-1.5 pb-1.5 ${panel ? 'flex-wrap' : 'overflow-x-auto -mx-4 px-4 [scrollbar-width:none]'}`} role="group" aria-label="קטגוריות">
          {usage.size > 0 && <button type="button" aria-pressed={cat === 'frequent' && !term} onClick={() => { setCat('frequent'); setQ('') }} className={chip(cat === 'frequent' && !term)}>נפוצים</button>}
          <button type="button" aria-pressed={cat === 'all' && !term} onClick={() => { setCat('all'); setQ('') }} className={chip(cat === 'all' && !term)}>הכל</button>
          {cats.map(c => (
            <button key={c} type="button" aria-pressed={cat === c && !term} onClick={() => { setCat(c); setQ('') }} className={chip(cat === c && !term)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-2 pt-1 pb-4">
        {creating ? (
          <div className="px-2">
            <NewExerciseForm
              initialName={q}
              categories={cats}
              onCancel={() => setCreating(false)}
              onCreated={ex => {
                setLib(l => [...(l ?? []), ex].sort((a, b) => a.Name.localeCompare(b.Name, 'he')))
                setCreating(false)
                setQ('')
                add(ex)
              }}
            />
          </div>
        ) : (
          <button type="button" onClick={() => setCreating(true)} className="mx-2 mt-2 w-[calc(100%-16px)] h-11 rounded-xl border border-dashed border-line-strong text-accent text-[15px] font-bold">
            + תרגיל חדש{q.trim() ? `: ${q.trim()}` : ''}
          </button>
        )}

        {!lib && <p className="px-3 py-6 text-center text-muted">טוען תרגילים…</p>}
        {lib && groups.every(([, items]) => !items.length) && <p className="px-3 py-6 text-center text-muted">לא נמצא תרגיל.</p>}
        {groups.map(([title, items]) => items.length > 0 && (
          <div key={title}>
            <p className="text-xs font-extrabold text-muted px-2 pt-3 pb-1">{title}</p>
            {items.map(ex => {
              const count = added.get(ex.ExerciseID) ?? 0
              return (
                <button key={ex.ExerciseID} type="button" onClick={() => add(ex)}
                  draggable={!!(panel && onDragItem)}
                  onDragStart={panel && onDragItem ? e => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', ex.Name); onDragItem(ex) } : undefined}
                  onDragEnd={panel && onDragItem ? () => setTimeout(() => onDragItem(null), 0) : undefined}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-right active:bg-surface ${panel ? 'min-h-12 hover:bg-raised' : 'min-h-14'} ${panel && onDragItem ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                  {panel && onDragItem && <LuGripVertical aria-hidden className="w-4 h-4 text-faint shrink-0" />}
                  <span className="flex-1 min-w-0">
                    <b className="block text-base truncate">{ex.Name}</b>
                    <small className="text-[13px] text-muted">{ex.Category} · {ex.isDuration ? 'זמן' : 'חזרות'}{ex.IsSingleHand ? ' · יד אחת' : ''}</small>
                  </span>
                  <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 border font-extrabold ${count ? 'bg-success border-success text-bg' : 'bg-raised border-line-strong text-accent'}`}>
                    {count ? (count > 1 ? `×${count}` : <LuCheck aria-hidden className="w-5 h-5" />) : <LuPlus aria-hidden className="w-5 h-5" />}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {panel ? (
        <p className="px-4 py-2.5 border-t border-line text-sm text-muted" aria-live="polite">{n ? `נוספו ${n} תרגילים` : `לחיצה על תרגיל מוסיפה אותו ל${blockLabel}`}</p>
      ) : (
        <div className="px-4 pt-2.5 pb-[calc(14px+env(safe-area-inset-bottom))] border-t border-line flex items-center gap-2.5">
          <span className="flex-1 text-sm text-muted" aria-live="polite">{n ? `נוספו ${n} תרגילים` : 'לחיצה על תרגיל מוסיפה אותו'}</span>
          <button type="button" onClick={() => onClose(n)} className="h-[50px] px-7 rounded-[14px] bg-accent text-on-accent font-extrabold">סיום</button>
        </div>
      )}
    </>
  )

  if (panel) {
    return (
      <section aria-labelledby="pick-title" className="rounded-2xl border border-line bg-surface text-fg flex flex-col overflow-hidden" style={{ height: 'calc(100vh - var(--app-header-height, 0px) - 10rem)' }}>
        {body}
      </section>
    )
  }
  return createPortal(
    <div role="dialog" data-flow aria-modal="true" aria-labelledby="pick-title" className="fixed inset-0 z-[100] bg-bg text-fg flex flex-col">
      {body}
    </div>,
    document.body,
  )
}
