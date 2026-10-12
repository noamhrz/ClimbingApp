'use client'

// The workout editor's exercise list, phone and desktop.
// Blocks of compact exercise rows with explicit actions: move up/down (also across blocks),
// delete with undo, tap a row to edit it in a sheet (big steppers), duplicate.
// Phone: adding opens a full-screen picker. Desktop: the picker is a side panel that is always
// open (adds to the highlighted block), rows have inline number fields and can be dragged.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuChevronDown, LuChevronUp, LuCopy, LuGripVertical, LuTrash2 } from 'react-icons/lu'
import { Exercise, WorkoutExerciseWithDetails, DEFAULT_WORKOUT_EXERCISE } from '@/types/workouts'
import { calculateWorkoutExercisesTime, formatRestTime } from '@/lib/workout-calculations'
import NumberStepper from '@/components/workout-flow/NumberStepper'
import ExercisePicker from './ExercisePicker'
import { InlineNum, useIsDesktop } from './editor-bits'

type Ex = WorkoutExerciseWithDetails
type Model = Ex[][]   // blocks in order, each with its exercises in order

interface Props {
  exercises: Ex[]
  blocks: number[]                       // all block numbers in order (incl. empty ones)
  onChange: (exercises: Ex[], emptyBlocks: number[]) => void
}

let tmpId = -1_000_000_000
const newId = () => --tmpId

const toModel = (exs: Ex[], blocks: number[]): Model =>
  blocks.map(b => exs.filter(e => e.Block === b).sort((a, c) => a.Order - c.Order))

// Renumber blocks 1..n and orders 1..k
function fromModel(m: Model): [Ex[], number[]] {
  const exs = m.flatMap((items, bi) => items.map((e, i) => ({ ...e, Block: bi + 1, Order: i + 1 })))
  const empty = m.map((items, bi) => (items.length ? 0 : bi + 1)).filter(Boolean)
  return [exs, empty]
}

const fmtDur = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} דק׳` : `${s} שנ׳`)
const spec = (e: Ex) => [
  `${e.Sets} סטים`,
  e.Exercise.isDuration ? fmtDur(e.Duration ?? DEFAULT_WORKOUT_EXERCISE.Duration) : `${e.Reps} חזרות`,
  e.Rest ? `מנוחה ${formatRestTime(e.Rest)}` : '',
].filter(Boolean)

const blankRow = (exercise: Exercise): Ex => ({
  WorkoutExerciseID: newId(),
  WorkoutID: 0,
  ExerciseID: exercise.ExerciseID,
  Sets: DEFAULT_WORKOUT_EXERCISE.Sets,
  Reps: exercise.isDuration ? 1 : DEFAULT_WORKOUT_EXERCISE.Reps,
  Duration: exercise.isDuration ? DEFAULT_WORKOUT_EXERCISE.Duration : null,
  Rest: DEFAULT_WORKOUT_EXERCISE.Rest,
  Order: 0,
  Block: 0,
  Exercise: exercise,
})

export default function ExerciseEditor({ exercises, blocks, onChange }: Props) {
  const model = toModel(exercises, blocks)
  const [editId, setEditId] = useState<number | null>(null)
  const [pickFor, setPickFor] = useState<number | null>(null)   // phone: block index the full-screen picker adds to
  const [target, setTarget] = useState<number | null>(null)     // desktop: block the side panel adds to (null = last)
  const [focusSig, setFocusSig] = useState(0)                   // bump to focus the panel's search
  const [dragId, setDragId] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<string | null>(null)     // `${bi}:${index}` of the drop marker
  const isDesktop = useIsDesktop()
  const [flash, setFlash] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commit = (m: Model) => { const [exs, empty] = fromModel(m); onChange(exs, empty) }
  const showToast = (text: string, undo?: () => void) => {
    setToast({ text, undo })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }
  const withUndo = (text: string) => {
    const snapExs = exercises, snapBlocks = blocks
    showToast(text, () => onChange(snapExs, snapBlocks.filter(b => !snapExs.some(e => e.Block === b))))
  }

  const locate = (id: number): [number, number] => {
    for (let bi = 0; bi < model.length; bi++) {
      const i = model[bi].findIndex(e => e.WorkoutExerciseID === id)
      if (i !== -1) return [bi, i]
    }
    return [-1, -1]
  }

  const move = (id: number, dir: -1 | 1) => {
    const m = model.map(b => [...b])
    const [bi, i] = locate(id)
    const [e] = m[bi].splice(i, 1)
    if (dir < 0 && i > 0) m[bi].splice(i - 1, 0, e)
    else if (dir > 0 && i < model[bi].length - 1) m[bi].splice(i + 1, 0, e)
    else if (dir < 0 && bi > 0) m[bi - 1].push(e)              // up past the top → end of previous block
    else if (dir > 0 && bi < m.length - 1) m[bi + 1].unshift(e) // down past the bottom → start of next block
    else return
    setFlash(id)
    commit(m)
  }

  const remove = (id: number) => {
    const [bi, i] = locate(id)
    const name = model[bi][i].Exercise.Name
    withUndo(`${name} נמחק`)
    commit(model.map((b, x) => (x === bi ? b.filter(e => e.WorkoutExerciseID !== id) : b)))
    setEditId(null)
  }

  const duplicate = (id: number) => {
    const [bi, i] = locate(id)
    const copy = { ...model[bi][i], WorkoutExerciseID: newId() }
    commit(model.map((b, x) => (x === bi ? [...b.slice(0, i + 1), copy, ...b.slice(i + 1)] : b)))
    setEditId(null)
    setFlash(copy.WorkoutExerciseID)
    showToast('התרגיל שוכפל')
  }

  const update = (id: number, patch: Partial<Ex>) =>
    commit(model.map(b => b.map(e => (e.WorkoutExerciseID === id ? { ...e, ...patch } : e))))

  const moveToBlock = (id: number, target: number) => {
    const [bi, i] = locate(id)
    if (bi === target) return
    const e = model[bi][i]
    commit(model.map((b, x) => (x === bi ? b.filter(r => r.WorkoutExerciseID !== id) : x === target ? [...b, e] : b)))
    setFlash(id)
    showToast(`הועבר לבלוק ${target + 1}`)
  }

  const dupBlock = (bi: number) => {
    const copy = model[bi].map(e => ({ ...e, WorkoutExerciseID: newId() }))
    commit([...model.slice(0, bi + 1), copy, ...model.slice(bi + 1)])
    showToast(`בלוק ${bi + 1} שוכפל`)
  }

  const delBlock = (bi: number) => {
    const n = model[bi].length
    withUndo(`בלוק ${bi + 1} נמחק${n ? ` (${n} תרגילים)` : ''}`)
    commit(model.filter((_, x) => x !== bi))
  }

  const openAdd = (bi: number) => {
    if (isDesktop) { setTarget(bi); setFocusSig(n => n + 1) } else setPickFor(bi)
  }

  const addBlock = () => {
    commit([...model, []])
    openAdd(model.length)
  }

  // desktop drag: drop the dragged row into block bi before position index
  const dropInto = (bi: number, index: number) => {
    if (dragId == null) return
    const [fb, fi] = locate(dragId)
    if (fb === -1) return
    const m = model.map(b => [...b])
    const [e] = m[fb].splice(fi, 1)
    m[bi].splice(fb === bi && fi < index ? index - 1 : index, 0, e)
    setFlash(dragId)
    commit(m)
  }
  const endDrag = () => { setDragId(null); setDropAt(null) }

  const addToBlock = (bi: number, ex: Exercise) => {
    const m = model.length ? model.map(b => [...b]) : [[]]
    const target = Math.min(bi, m.length - 1)
    m[target].push(blankRow(ex))
    commit(m)
  }

  // clear the row highlight after its animation
  useEffect(() => {
    if (flash == null) return
    const t = setTimeout(() => setFlash(null), 1000)
    return () => clearTimeout(t)
  }, [flash])

  const total = Math.ceil(calculateWorkoutExercisesTime(exercises) / 60)
  const tgt = model.length ? Math.min(target ?? model.length - 1, model.length - 1) : 0
  const editing = editId != null ? exercises.find(e => e.WorkoutExerciseID === editId) : undefined
  const editBlock = editing ? locate(editing.WorkoutExerciseID)[0] : -1

  const mini = 'h-9 min-w-9 px-2 rounded-[10px] border border-line-strong bg-raised text-fg-2 grid place-items-center disabled:opacity-30'

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-6 md:items-start">
    <div className="flex flex-col gap-3.5">
      <p className="text-sm text-muted">
        {exercises.length} תרגילים · זמן משוער <b className="text-fg text-base">{total}</b> דק׳
        <span className="hidden md:inline"> · אפשר לגרור שורות כדי לסדר</span>
      </p>

      {model.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center flex flex-col items-center gap-3">
          <p className="text-fg-3 font-medium">עדיין אין תרגילים באימון</p>
          <button type="button" onClick={addBlock} className="h-12 px-6 rounded-xl bg-accent text-on-accent font-extrabold">+ הוספת תרגילים</button>
        </div>
      )}

      {model.map((items, bi) => (
        <section
          key={bi}
          aria-label={`בלוק ${bi + 1}`}
          onDragOver={ev => { if (dragId != null) { ev.preventDefault(); if (!dropAt?.startsWith(`${bi}:`)) setDropAt(`${bi}:${items.length}`) } }}
          onDrop={ev => { ev.preventDefault(); const [b, i] = (dropAt ?? `${bi}:${items.length}`).split(':').map(Number); dropInto(b, i); endDrag() }}
          className={`rounded-2xl border bg-surface overflow-hidden ${isDesktop && bi === tgt ? 'border-accent/70 ring-2 ring-accent/30' : 'border-line'}`}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
            <span className="text-[13px] font-extrabold text-accent bg-accent/15 rounded-full px-2.5 py-0.5">בלוק {bi + 1}</span>
            <span className="flex-1 text-[15px] text-muted">{items.length} תרגילים</span>
            <button type="button" onClick={() => dupBlock(bi)} aria-label={`שכפל בלוק ${bi + 1}`} className={mini}><LuCopy aria-hidden className="w-4 h-4" /></button>
            <button type="button" onClick={() => delBlock(bi)} aria-label={`מחק בלוק ${bi + 1}`} className={`${mini} text-danger`}><LuTrash2 aria-hidden className="w-[18px] h-[18px]" /></button>
          </div>

          {items.length === 0 && <p className={`px-3 py-3.5 text-sm text-faint ${dropAt === `${bi}:0` ? 'bg-accent/10' : ''}`}>{isDesktop ? 'אין תרגילים בבלוק. אפשר לגרור לכאן או להוסיף מהרשימה' : 'אין תרגילים בבלוק'}</p>}

          {items.map((e, i) => (
            <div
              key={e.WorkoutExerciseID}
              draggable={isDesktop}
              onDragStart={ev => { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(e.WorkoutExerciseID)); setDragId(e.WorkoutExerciseID) }}
              onDragEnd={endDrag}
              onDragOver={ev => {
                if (dragId == null) return
                ev.preventDefault(); ev.stopPropagation()
                const r = ev.currentTarget.getBoundingClientRect()
                const key = `${bi}:${ev.clientY < r.top + r.height / 2 ? i : i + 1}`
                if (key !== dropAt) setDropAt(key)
              }}
              className={`relative flex items-center gap-2 px-3 py-2.5 border-b border-line transition-colors duration-700 ${flash === e.WorkoutExerciseID ? 'bg-accent/20' : ''} ${dragId === e.WorkoutExerciseID ? 'opacity-40' : ''}`}
            >
              {dropAt === `${bi}:${i}` && dragId != null && <span aria-hidden className="absolute inset-x-2 -top-px h-[3px] rounded-full bg-accent" />}
              {dropAt === `${bi}:${i + 1}` && i === items.length - 1 && dragId != null && <span aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-accent" />}
              <LuGripVertical aria-hidden className="hidden md:block w-5 h-5 text-faint cursor-grab shrink-0" />
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => move(e.WorkoutExerciseID, -1)} disabled={i === 0 && bi === 0} aria-label={`הזז למעלה: ${e.Exercise.Name}`} className={`${mini} h-[26px]`}>
                  <LuChevronUp aria-hidden className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => move(e.WorkoutExerciseID, 1)} disabled={i === items.length - 1 && bi === model.length - 1} aria-label={`הזז למטה: ${e.Exercise.Name}`} className={`${mini} h-[26px]`}>
                  <LuChevronDown aria-hidden className="w-4 h-4" />
                </button>
              </div>
              <button type="button" onClick={() => setEditId(e.WorkoutExerciseID)} className="flex-1 min-w-0 text-right py-1">
                <span className="block text-base font-bold leading-snug line-clamp-2 md:hover:text-accent">{e.Exercise.Name}</span>
                <span className="flex flex-wrap gap-x-1.5 text-sm text-muted mt-0.5 md:hidden">
                  {spec(e).map((s, k) => <span key={k}>{k > 0 && '· '}{s}</span>)}
                </span>
                <span className="hidden md:block text-[13px] text-muted mt-0.5">{e.Exercise.Category}{e.Exercise.IsSingleHand ? ' · יד אחת' : ''}</span>
              </button>
              {isDesktop && (
                <div className="flex items-end gap-2 shrink-0">
                  <InlineNum label="סטים" value={e.Sets} min={1} onChange={v => update(e.WorkoutExerciseID, { Sets: v })} />
                  {e.Exercise.isDuration
                    ? <InlineNum label="שניות" value={e.Duration ?? DEFAULT_WORKOUT_EXERCISE.Duration} min={1} onChange={v => update(e.WorkoutExerciseID, { Duration: v, Reps: 1 })} />
                    : <InlineNum label="חזרות" value={e.Reps} min={1} onChange={v => update(e.WorkoutExerciseID, { Reps: v })} />}
                  <InlineNum label={`מנוחה${e.Rest >= 60 ? ` ${formatRestTime(e.Rest)}` : ''}`} value={e.Rest} onChange={v => update(e.WorkoutExerciseID, { Rest: v })} />
                </div>
              )}
              <button type="button" onClick={() => remove(e.WorkoutExerciseID)} aria-label={`מחק ${e.Exercise.Name}`} className={`${mini} text-danger`}>
                <LuTrash2 aria-hidden className="w-[18px] h-[18px]" />
              </button>
            </div>
          ))}

          <button type="button" onClick={() => openAdd(bi)} className={`w-full h-12 border-t border-dashed border-line-strong -mt-px text-accent text-[15px] font-extrabold ${isDesktop && bi === tgt ? 'bg-accent/10' : ''}`}>
            {isDesktop && bi === tgt ? `מוסיף לבלוק ${bi + 1} מהרשימה ←` : `+ הוספת תרגילים לבלוק ${bi + 1}`}
          </button>
        </section>
      ))}

      {model.length > 0 && (
        <button type="button" onClick={addBlock} className="h-[50px] rounded-2xl border border-dashed border-line-strong text-fg-3 text-[15px] font-extrabold">
          + בלוק חדש
        </button>
      )}

      {editing && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/55 flex items-end md:items-center justify-center" onClick={ev => { if (ev.target === ev.currentTarget) setEditId(null) }} onKeyDown={ev => { if (ev.key === 'Escape') setEditId(null) }}>
          <div role="dialog" data-flow aria-modal="true" aria-labelledby="ex-edit-title" className="w-full max-w-[520px] max-h-[92vh] overflow-y-auto overscroll-contain bg-raised border-t md:border border-line-strong rounded-t-[20px] md:rounded-[20px] px-4 pt-2.5 pb-[calc(16px+env(safe-area-inset-bottom))] flex flex-col gap-4 text-fg">
            <div className="w-10 h-1 rounded-full bg-line-strong mx-auto md:hidden" />
            <div>
              <h2 id="ex-edit-title" className="text-xl font-extrabold">{editing.Exercise.Name}</h2>
              <p className="text-sm text-muted">{editing.Exercise.Category}{editing.Exercise.IsSingleHand ? ' · יד אחת' : ''}</p>
            </div>
            <NumberStepper id="ed-sets" label="סטים" value={editing.Sets} step={1} min={1} onChange={v => update(editing.WorkoutExerciseID, { Sets: Math.max(1, v ?? 1) })} />
            {editing.Exercise.isDuration ? (
              <NumberStepper id="ed-dur" label="זמן" unit="(שניות)" value={editing.Duration ?? DEFAULT_WORKOUT_EXERCISE.Duration} step={5} min={1} onChange={v => update(editing.WorkoutExerciseID, { Duration: v ?? 0, Reps: 1 })} />
            ) : (
              <NumberStepper id="ed-reps" label="חזרות" value={editing.Reps} step={1} min={1} onChange={v => update(editing.WorkoutExerciseID, { Reps: v ?? 0 })} />
            )}
            <NumberStepper id="ed-rest" label="מנוחה בין סטים" unit={`(שניות${editing.Rest >= 60 ? ` · ${formatRestTime(editing.Rest)}` : ''})`} value={editing.Rest} step={15} min={0} onChange={v => update(editing.WorkoutExerciseID, { Rest: v ?? 0 })} />
            {model.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[15px] font-bold text-fg-2">בלוק</span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="העבר לבלוק">
                  {model.map((_, bi) => (
                    <button key={bi} type="button" aria-pressed={bi === editBlock} onClick={() => moveToBlock(editing.WorkoutExerciseID, bi)}
                      className={`h-10 px-4 rounded-full border text-sm font-bold ${bi === editBlock ? 'bg-accent border-accent text-on-accent' : 'border-line-strong bg-surface text-fg-2'}`}>
                      בלוק {bi + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => remove(editing.WorkoutExerciseID)} aria-label="מחיקת התרגיל" className="h-[50px] px-4 rounded-[14px] border border-danger/50 text-danger"><LuTrash2 aria-hidden className="w-5 h-5" /></button>
              <button type="button" onClick={() => duplicate(editing.WorkoutExerciseID)} aria-label="שכפול התרגיל" className="h-[50px] px-4 rounded-[14px] border border-line-strong bg-surface text-fg"><LuCopy aria-hidden className="w-5 h-5" /></button>
              <button type="button" onClick={() => setEditId(null)} className="flex-1 h-[50px] rounded-[14px] bg-accent text-on-accent font-extrabold text-base">סיום</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {pickFor != null && !isDesktop && (
        <ExercisePicker
          blockLabel={`בלוק ${Math.min(pickFor, Math.max(model.length - 1, 0)) + 1}`}
          onAdd={ex => addToBlock(pickFor, ex)}
          onClose={n => { setPickFor(null); if (n) showToast(`נוספו ${n} תרגילים`) }}
        />
      )}

    </div>

      {isDesktop && (
        <aside className="sticky self-start" style={{ top: 'calc(var(--app-header-height, 0px) + 1rem)' }}>
          <ExercisePicker
            panel
            focusSig={focusSig}
            blockLabel={`בלוק ${tgt + 1}`}
            targets={Array.from({ length: Math.max(model.length, 1) }, (_, i) => `בלוק ${i + 1}`)}
            target={tgt}
            onTarget={setTarget}
            onAdd={ex => addToBlock(tgt, ex)}
            onClose={() => {}}
          />
        </aside>
      )}

      {toast && createPortal(
        <div role="status" className="fixed z-[120] left-1/2 -translate-x-1/2 bottom-[calc(140px+env(safe-area-inset-bottom))] bg-fg text-bg rounded-full ps-4 pe-1.5 py-1.5 flex items-center gap-3 text-[15px] font-bold whitespace-nowrap shadow-lg">
          <span>{toast.text}</span>
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo?.(); setToast(null) }} className="h-9 px-4 rounded-full bg-bg text-fg font-extrabold">ביטול</button>
          )}
          {!toast.undo && <span className="w-1" />}
        </div>,
        document.body,
      )}
    </div>
  )
}
