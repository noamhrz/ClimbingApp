'use client'

// Assign the workout being edited to trainees, right from the editor.
// Already-assigned trainees are marked; new ones get a WorkoutsForUser row
// (same shape as the assignment screen), with an optional personal note.
// After assigning, each trainee can be scheduled into the calendar directly.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { LuCalendarPlus, LuCheck, LuSearch, LuUserPlus, LuX } from 'react-icons/lu'
import ScheduleSheet from './ScheduleSheet'

interface Props {
  isOpen: boolean
  onClose: () => void
  workoutId: number
  workoutName: string
}

export default function AssignToSheet({ isOpen, onClose, workoutId, workoutName }: Props) {
  const { trainees, currentUser } = useAuth()
  const [assigned, setAssigned] = useState<Set<string> | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string[]>([])            // emails assigned in this session
  const [schedule, setSchedule] = useState<{ email: string; name: string } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    supabase.from('WorkoutsForUser').select('Email').eq('WorkoutID', workoutId).then(({ data }) => {
      if (!cancelled) setAssigned(new Set((data ?? []).map(r => r.Email as string)))
    })
    return () => { cancelled = true }
  }, [isOpen, workoutId])

  if (!isOpen) return null

  const people = [...trainees]
    .filter(t => (t as { Status?: string }).Status !== 'Inactive')
    .sort((a, b) => (a.Email === currentUser?.Email ? 1 : 0) - (b.Email === currentUser?.Email ? 1 : 0) || a.Name.localeCompare(b.Name, 'he'))
  const shown = q.trim() ? people.filter(t => t.Name.includes(q.trim()) || t.Email.includes(q.trim())) : people
  const nameOf = (email: string) => people.find(p => p.Email === email)?.Name ?? email

  const togglePick = (email: string) => setPicked(prev => {
    const n = new Set(prev)
    if (n.has(email)) n.delete(email); else n.add(email)
    return n
  })

  const save = async () => {
    if (!picked.size) return
    setSaving(true); setError('')
    const rows = [...picked].map(Email => ({ Email, WorkoutID: workoutId, IsKeyWorkout: false, Notes: note.trim() }))
    const { error: e } = await supabase.from('WorkoutsForUser').insert(rows)
    setSaving(false)
    if (e) { setError(e.message); return }
    setAssigned(prev => new Set([...(prev ?? []), ...picked]))
    setDone(d => [...d, ...picked])
    setPicked(new Set())
    setNote('')
  }

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end md:items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
          <div role="dialog" data-flow aria-modal="true" aria-labelledby="assign-title" className="w-full max-w-[560px] max-h-[94vh] bg-raised border border-line-strong rounded-t-[20px] md:rounded-[20px] flex flex-col text-fg" dir="rtl">
            <div className="px-4 pt-3 pb-3 border-b border-line flex items-center gap-3">
              <LuUserPlus aria-hidden className="w-6 h-6 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 id="assign-title" className="text-xl font-extrabold">הקצאה למתאמנים</h2>
                <p className="text-sm text-muted truncate">{workoutName}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="סגירה" className="w-10 h-10 rounded-xl grid place-items-center text-fg-2"><LuX aria-hidden className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-3">
              {done.length > 0 && (
                <div className="rounded-xl border border-success/50 bg-success/10 p-3 flex flex-col gap-2">
                  <p className="font-extrabold text-success">הוקצה ל-{done.length === 1 ? nameOf(done[0]) : `${done.length} מתאמנים`}. לשבץ בקלנדר?</p>
                  {done.map(email => (
                    <button key={email} type="button" onClick={() => setSchedule({ email, name: nameOf(email) })} className="h-11 rounded-xl bg-surface border border-line-strong flex items-center justify-between px-3 font-bold">
                      <span className="truncate">{nameOf(email)}</span>
                      <span className="flex items-center gap-1.5 text-accent text-sm"><LuCalendarPlus aria-hidden className="w-4 h-4" />שיבוץ שבועי</span>
                    </button>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 h-11 rounded-xl border-2 border-line-strong bg-surface px-3 focus-within:border-accent">
                <LuSearch aria-hidden className="w-4 h-4 text-muted" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש מתאמן" aria-label="חיפוש מתאמן" className="flex-1 min-w-0 bg-transparent text-fg focus:outline-none" />
              </label>

              <ul className="flex flex-col gap-1">
                {shown.map(t => {
                  const has = assigned?.has(t.Email)
                  const on = picked.has(t.Email)
                  return (
                    <li key={t.Email}>
                      <button
                        type="button"
                        disabled={has || assigned === null}
                        aria-pressed={on}
                        onClick={() => togglePick(t.Email)}
                        className={`w-full min-h-12 px-3 rounded-xl flex items-center gap-3 text-right ${on ? 'bg-accent/15' : 'hover:bg-surface'} disabled:opacity-60`}
                      >
                        <span className={`w-6 h-6 rounded-md border-2 grid place-items-center shrink-0 ${on ? 'bg-accent border-accent text-on-accent' : has ? 'border-success text-success' : 'border-line-strong'}`}>
                          {(on || has) && <LuCheck aria-hidden className="w-4 h-4" />}
                        </span>
                        <span className="flex-1 min-w-0 truncate font-bold">{t.Name}{t.Email === currentUser?.Email ? ' (אני)' : ''}</span>
                        {has && <span className="text-xs text-success font-bold shrink-0">כבר מוקצה</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>

              {picked.size > 0 && (
                <label className="flex flex-col gap-1.5 text-sm font-bold text-fg-2">
                  הערה אישית (לא חובה)
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="מופיעה למתאמן בראש האימון" className="rounded-xl border-2 border-line-strong bg-surface text-fg px-3 py-2 text-base font-normal resize-none focus:outline-none focus:border-accent" />
                </label>
              )}
              {error && <p className="text-danger text-sm">{error}</p>}
            </div>

            <div className="px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] border-t border-line flex gap-2">
              <button type="button" onClick={onClose} className="h-12 px-5 rounded-xl border border-line-strong text-fg-2 font-bold">סגירה</button>
              <button type="button" onClick={save} disabled={!picked.size || saving} className="flex-1 h-12 rounded-xl bg-accent text-on-accent font-extrabold disabled:opacity-40">
                {saving ? 'מקצה…' : picked.size ? `הקצה ל-${picked.size} ${picked.size === 1 ? 'מתאמן' : 'מתאמנים'}` : 'בחר מתאמנים'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {schedule && (
        <ScheduleSheet
          isOpen
          onClose={() => setSchedule(null)}
          email={schedule.email}
          name={schedule.name}
          preselect={[workoutId]}
          onSuccess={n => { setDone(d => d.filter(e => e !== schedule.email)); if (n) alert(`שובצו ${n} אימונים ל${schedule.name}`) }}
        />
      )}
    </>
  )
}
