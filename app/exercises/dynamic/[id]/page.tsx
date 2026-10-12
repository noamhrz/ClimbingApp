'use client'

// Dynamic exercise editor: which exercises a trainee gets at each roadmap level.
// All levels on one screen. Desktop: the exercise library stays open on the side — tap adds to
// the highlighted level, or drag an exercise straight into any level; rows drag between levels.
// "+ new exercise" from the library. An empty level can start as a copy of the previous one.
// Phone: the library opens full screen per level; rows move with ↑/↓ (also across levels).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Exercise } from '@/types/exercises'
import { Exercise as LibExercise } from '@/types/workouts'
import { RoadmapCategory, RoadmapLevel } from '@/types/dynamic-exercise'
import ExercisePicker from '@/components/workouts/ExercisePicker'
import { InlineNum, useIsDesktop } from '@/components/workouts/editor-bits'
import { LuArrowRight, LuChevronDown, LuChevronUp, LuCopy, LuGripVertical, LuPlus, LuPuzzle, LuSave, LuTrash2, LuTriangleAlert } from 'react-icons/lu'

interface LocalItem {
  id: number
  ExerciseID: number
  Sets: number
  Reps: number
  Duration: number | null
  Rest: number
  Order: number
  exercise: Exercise
}
type Items = Record<number, LocalItem[]>   // by LevelID

// -1 is truthy, so level checks keep working for the virtual level 0
const VIRTUAL_LEVEL0_ID = -1
let tmpId = -2_000_000_000
const newId = () => --tmpId

const newItem = (exercise: Exercise): LocalItem => ({
  id: newId(),
  ExerciseID: exercise.ExerciseID,
  Sets: 3,
  Reps: exercise.isDuration ? 1 : 8,
  Duration: exercise.isDuration ? 30 : null,
  Rest: 90,
  Order: 0,
  exercise,
})
const renumber = (list: LocalItem[]) => list.map((i, k) => ({ ...i, Order: k + 1 }))
const levelLabel = (l: RoadmapLevel) => l.Name ? `${l.LevelNumber} · ${l.Name}` : `רמה ${l.LevelNumber}`

type Drag = { kind: 'lib'; ex: Exercise } | { kind: 'item'; id: number } | null

export default function DynamicExerciseEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  const exerciseId = Number(id)
  const isDesktop = useIsDesktop()

  const [dynamicExercise, setDynamicExercise] = useState<Exercise | null>(null)
  const [categories, setCategories] = useState<RoadmapCategory[]>([])
  const [levels, setLevels] = useState<RoadmapLevel[]>([])
  const [items, setItemsRaw] = useState<Items>({})
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [target, setTarget] = useState(0)                       // desktop: index of the level the library adds to
  const [focusSig, setFocusSig] = useState(0)
  const [pickFor, setPickFor] = useState<number | null>(null)  // phone: LevelID the full-screen library adds to
  const [flash, setFlash] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<string | null>(null)    // `${levelId}:${index}`
  const drag = useRef<Drag>(null)
  const [dragId, setDragId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setItems = (next: Items | ((p: Items) => Items)) => { setItemsRaw(next); setDirty(true) }
  const showToast = (text: string, undo?: () => void) => {
    setToast({ text, undo })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [{ data: exData }, { data: cats }] = await Promise.all([
          supabase.from('Exercises').select('*').eq('ExerciseID', exerciseId).single(),
          supabase.from('RoadmapCategories').select('*').order('Order'),
        ])
        if (cancelled) return
        if (!exData || !exData.is_dynamic) { router.push('/exercises'); return }
        setDynamicExercise(exData)
        setCategories(cats || [])
        if (exData.RoadmapCategoryID) setLevels(await loadLevels(exData.RoadmapCategoryID))

        const { data: rows } = await supabase
          .from('dynamic_exercise_items')
          .select('*, exercise:ExerciseID(*)')
          .eq('DynamicExerciseID', exerciseId)
          .order('Order')
        const grouped: Items = {}
        for (const r of (rows ?? []) as (LocalItem & { DynamicExerciseItemID: number; LevelID: number })[]) {
          (grouped[r.LevelID] ??= []).push({
            id: r.DynamicExerciseItemID, ExerciseID: r.ExerciseID, Sets: r.Sets, Reps: r.Reps,
            Duration: r.Duration, Rest: r.Rest, Order: r.Order, exercise: r.exercise,
          })
        }
        for (const k of Object.keys(grouped)) grouped[Number(k)].sort((a, b) => a.Order - b.Order)
        if (!cancelled) setItemsRaw(grouped)
      } catch (err) {
        console.error('Error loading dynamic exercise:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [exerciseId, router])

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  useEffect(() => {
    if (flash == null) return
    const t = setTimeout(() => setFlash(null), 1000)
    return () => clearTimeout(t)
  }, [flash])

  // ── level 0 (created on demand) ───────────────────────────────────────────
  const createLevel0ViaApi = async (catId: number): Promise<RoadmapLevel | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    try {
      const res = await fetch('/api/admin/roadmap/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ CategoryID: catId, LevelNumber: 0, Name: 'טרם התחיל' }),
      })
      return res.ok ? res.json() : null
    } catch { return null }
  }

  async function loadLevels(catId: number): Promise<RoadmapLevel[]> {
    const { data: lvls } = await supabase.from('RoadmapLevels').select('*').eq('CategoryID', catId).order('LevelNumber')
    const list: RoadmapLevel[] = lvls || []
    if (list.some(l => l.LevelNumber === 0)) return list
    const created = await createLevel0ViaApi(catId)
    if (created) return [...list, created].sort((a, b) => a.LevelNumber - b.LevelNumber)
    return [{ LevelID: VIRTUAL_LEVEL0_ID, CategoryID: catId, LevelNumber: 0, Name: 'טרם התחיל' }, ...list]
  }

  const resolveVirtualLevel0 = async (catId: number): Promise<number | null> => {
    const { data: existing } = await supabase.from('RoadmapLevels').select('LevelID').eq('CategoryID', catId).eq('LevelNumber', 0).maybeSingle()
    if (existing) return existing.LevelID
    return (await createLevel0ViaApi(catId))?.LevelID ?? null
  }

  // ── edits ─────────────────────────────────────────────────────────────────
  const list = (lid: number) => items[lid] ?? []
  const locate = (itemId: number): [number, number] => {
    for (const l of levels) {
      const i = list(l.LevelID).findIndex(x => x.id === itemId)
      if (i !== -1) return [l.LevelID, i]
    }
    return [0, -1]
  }

  const addTo = (lid: number, ex: Exercise, at?: number) => {
    const it = newItem(ex)
    setItems(p => {
      const cur = [...(p[lid] ?? [])]
      cur.splice(at ?? cur.length, 0, it)
      return { ...p, [lid]: renumber(cur) }
    })
    setFlash(it.id)
  }

  const update = (lid: number, itemId: number, patch: Partial<LocalItem>) =>
    setItems(p => ({ ...p, [lid]: (p[lid] ?? []).map(x => (x.id === itemId ? { ...x, ...patch } : x)) }))

  const remove = (lid: number, itemId: number) => {
    const snap = items
    const name = list(lid).find(x => x.id === itemId)?.exercise.Name ?? 'התרגיל'
    setItems(p => ({ ...p, [lid]: renumber((p[lid] ?? []).filter(x => x.id !== itemId)) }))
    showToast(`${name} הוסר`, () => setItems(snap))
  }

  const duplicate = (lid: number, itemId: number) => {
    const i = list(lid).findIndex(x => x.id === itemId)
    const copy = { ...list(lid)[i], id: newId() }
    setItems(p => { const cur = [...(p[lid] ?? [])]; cur.splice(i + 1, 0, copy); return { ...p, [lid]: renumber(cur) } })
    setFlash(copy.id)
  }

  // move an item to (level, index) — used by drag and by ↑/↓
  const moveTo = (itemId: number, toLid: number, toIndex: number) => {
    const [fromLid, fi] = locate(itemId)
    if (fi === -1) return
    setItems(p => {
      const from = [...(p[fromLid] ?? [])]
      const [it] = from.splice(fi, 1)
      const to = fromLid === toLid ? from : [...(p[toLid] ?? [])]
      to.splice(fromLid === toLid && fi < toIndex ? toIndex - 1 : toIndex, 0, it)
      return { ...p, [fromLid]: renumber(from), [toLid]: renumber(to) }
    })
    setFlash(itemId)
  }

  const step = (itemId: number, dir: -1 | 1) => {
    const [lid, i] = locate(itemId)
    const li = levels.findIndex(l => l.LevelID === lid)
    const n = list(lid).length
    if (dir < 0 && i > 0) moveTo(itemId, lid, i - 1)
    else if (dir > 0 && i < n - 1) moveTo(itemId, lid, i + 2)
    else if (dir < 0 && li > 0) { const prev = levels[li - 1].LevelID; moveTo(itemId, prev, list(prev).length) }
    else if (dir > 0 && li < levels.length - 1) moveTo(itemId, levels[li + 1].LevelID, 0)
  }

  const copyFromPrevious = (li: number) => {
    const prev = levels.slice(0, li).reverse().find(l => list(l.LevelID).length > 0)
    if (!prev) return
    const lid = levels[li].LevelID
    setItems(p => ({ ...p, [lid]: renumber(list(prev.LevelID).map(x => ({ ...x, id: newId() }))) }))
    showToast(`הועתקו ${list(prev.LevelID).length} תרגילים מרמה ${prev.LevelNumber}. עכשיו אפשר להעלות עומס`)
  }

  const clearLevel = (lid: number, label: string) => {
    const snap = items
    setItems(p => ({ ...p, [lid]: [] }))
    showToast(`${label} נוקתה`, () => setItems(snap))
  }

  // ── drag (desktop) ────────────────────────────────────────────────────────
  const onRowDragOver = (e: React.DragEvent, lid: number, i: number) => {
    if (!drag.current) return
    e.preventDefault(); e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const key = `${lid}:${e.clientY < r.top + r.height / 2 ? i : i + 1}`
    if (key !== dropAt) setDropAt(key)
  }
  const onLevelDragOver = (e: React.DragEvent, lid: number) => {
    if (!drag.current) return
    e.preventDefault()
    if (!dropAt?.startsWith(`${lid}:`)) setDropAt(`${lid}:${list(lid).length}`)
  }
  const onLevelDrop = (e: React.DragEvent, lid: number) => {
    e.preventDefault()
    const d = drag.current
    const [l, i] = (dropAt ?? `${lid}:${list(lid).length}`).split(':').map(Number)
    drag.current = null; setDragId(null); setDropAt(null)
    if (!d) return
    if (d.kind === 'lib') addTo(l, d.ex, i)
    else moveTo(d.id, l, i)
    setTarget(levels.findIndex(x => x.LevelID === l))
  }
  const endDrag = () => { drag.current = null; setDragId(null); setDropAt(null) }

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const catId = dynamicExercise?.RoadmapCategoryID
      let realLevel0Id: number | null = null
      if (catId && list(VIRTUAL_LEVEL0_ID).length > 0) {
        realLevel0Id = await resolveVirtualLevel0(catId)
        if (!realLevel0Id) {
          alert('רמה 0 לא קיימת ב-DB. הרץ את ה-SQL migration ב-Supabase כדי ליצור אותה, ואז שמור שוב.')
          return
        }
      }
      const rows: object[] = []
      for (const [levelId, its] of Object.entries(items)) {
        const lid = Number(levelId) === VIRTUAL_LEVEL0_ID ? realLevel0Id : Number(levelId)
        if (lid === null) continue
        for (const it of its) rows.push({ DynamicExerciseID: exerciseId, LevelID: lid, ExerciseID: it.ExerciseID, Sets: it.Sets, Reps: it.Reps, Duration: it.Duration, Rest: it.Rest, Order: it.Order })
      }
      const { error: delErr } = await supabase.from('dynamic_exercise_items').delete().eq('DynamicExerciseID', exerciseId)
      if (delErr) throw delErr
      if (rows.length) {
        const { error: insErr } = await supabase.from('dynamic_exercise_items').insert(rows)
        if (insErr) throw insErr
      }
      setDirty(false)
      showToast('נשמר')
    } catch (err) {
      console.error('Error saving dynamic exercise:', err)
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const leave = () => {
    if (dirty && !confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?')) return
    router.push('/exercises/dynamic')
  }

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    )
  }
  if (!dynamicExercise) return null

  const cat = categories.find(c => c.CategoryID === dynamicExercise.RoadmapCategoryID)
  const tgt = Math.min(target, Math.max(levels.length - 1, 0))
  const mini = 'h-8 min-w-8 px-1.5 rounded-lg border border-line-strong bg-raised text-fg-2 grid place-items-center disabled:opacity-30'
  const total = Object.values(items).reduce((n, l) => n + l.length, 0)

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 md:p-6">
      {/* header */}
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={leave} aria-label="חזרה" className="w-10 h-10 rounded-xl border border-line grid place-items-center text-fg-2 shrink-0">
          <LuArrowRight aria-hidden className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="text-xs text-muted flex items-center gap-1"><LuPuzzle aria-hidden className="w-3.5 h-3.5" />תרגיל דינמי{cat ? ` · ${cat.Icon ?? ''} ${cat.Name}` : ''}</p>
          <h1 className="text-xl md:text-2xl font-extrabold truncate">{dynamicExercise.Name}</h1>
        </div>
      </div>

      {!dynamicExercise.RoadmapCategoryID && (
        <div className="bg-warning/15 border border-warning rounded-xl p-4 mb-4 text-sm text-warning flex gap-2">
          <LuTriangleAlert aria-hidden className="w-5 h-5 shrink-0" />לתרגיל הזה אין קטגוריית רודמאפ. ערוך אותו מדף התרגילים כדי להוסיף קטגוריה.
        </div>
      )}

      {levels.length > 0 && (
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-6 md:items-start">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">{levels.length} רמות · {total} תרגילים<span className="hidden md:inline"> · לחיצה על כותרת רמה בוחרת לאן להוסיף, ואפשר לגרור תרגילים מהרשימה או בין רמות</span></p>

            {levels.map((l, li) => {
              const its = list(l.LevelID)
              const isTarget = isDesktop && li === tgt
              const prevWithItems = levels.slice(0, li).reverse().find(x => list(x.LevelID).length > 0)
              return (
                <section
                  key={l.LevelID}
                  aria-label={levelLabel(l)}
                  onDragOver={e => onLevelDragOver(e, l.LevelID)}
                  onDrop={e => onLevelDrop(e, l.LevelID)}
                  className={`rounded-2xl border bg-surface overflow-hidden ${isTarget ? 'border-accent/70 ring-2 ring-accent/30' : 'border-line'}`}
                >
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
                    <button type="button" onClick={() => { setTarget(li); setFocusSig(n => n + 1) }} className="flex-1 min-w-0 flex items-center gap-2 text-right">
                      <span className={`text-[13px] font-extrabold rounded-full px-2.5 py-0.5 shrink-0 ${its.length ? 'text-accent bg-accent/15' : 'text-muted bg-raised'}`}>רמה {l.LevelNumber}</span>
                      <span className="text-[15px] font-bold truncate">{l.Name}</span>
                      <span className="text-sm text-muted shrink-0">· {its.length}</span>
                    </button>
                    {its.length > 0 && (
                      <button type="button" onClick={() => clearLevel(l.LevelID, `רמה ${l.LevelNumber}`)} aria-label={`נקה רמה ${l.LevelNumber}`} className={`${mini} text-danger`}><LuTrash2 aria-hidden className="w-4 h-4" /></button>
                    )}
                  </div>

                  {its.length === 0 && (
                    <div className={`px-3 py-3 flex flex-wrap items-center gap-2 text-sm text-faint ${dropAt === `${l.LevelID}:0` ? 'bg-accent/10' : ''}`}>
                      <span className="flex-1 min-w-[10rem]">{isDesktop ? 'ריק. גרור לכאן תרגיל או הוסף מהרשימה' : 'אין תרגילים ברמה'}</span>
                      {prevWithItems && (
                        <button type="button" onClick={() => copyFromPrevious(li)} className="h-9 px-3 rounded-lg border border-accent text-accent font-bold inline-flex items-center gap-1.5">
                          <LuCopy aria-hidden className="w-4 h-4" />העתק מרמה {prevWithItems.LevelNumber}
                        </button>
                      )}
                    </div>
                  )}

                  {its.map((it, i) => (
                    <div
                      key={it.id}
                      draggable={isDesktop}
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', it.exercise.Name); drag.current = { kind: 'item', id: it.id }; setDragId(it.id) }}
                      onDragEnd={endDrag}
                      onDragOver={e => onRowDragOver(e, l.LevelID, i)}
                      className={`relative flex items-center gap-2 px-3 py-2 border-b border-line last:border-b-0 transition-colors duration-700 ${flash === it.id ? 'bg-accent/20' : ''} ${dragId === it.id ? 'opacity-40' : ''}`}
                    >
                      {dropAt === `${l.LevelID}:${i}` && <span aria-hidden className="absolute inset-x-2 -top-px h-[3px] rounded-full bg-accent" />}
                      {dropAt === `${l.LevelID}:${i + 1}` && i === its.length - 1 && <span aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-accent" />}
                      <LuGripVertical aria-hidden className="hidden md:block w-5 h-5 text-faint cursor-grab shrink-0" />
                      <div className="flex flex-col gap-0.5 md:hidden">
                        <button type="button" onClick={() => step(it.id, -1)} disabled={i === 0 && li === 0} aria-label={`הזז למעלה: ${it.exercise.Name}`} className={`${mini} h-6`}><LuChevronUp aria-hidden className="w-4 h-4" /></button>
                        <button type="button" onClick={() => step(it.id, 1)} disabled={i === its.length - 1 && li === levels.length - 1} aria-label={`הזז למטה: ${it.exercise.Name}`} className={`${mini} h-6`}><LuChevronDown aria-hidden className="w-4 h-4" /></button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[15px] font-bold leading-snug line-clamp-2">{it.exercise.Name}</span>
                        <span className="text-xs text-muted">{it.exercise.Category}{it.exercise.IsSingleHand ? ' · יד אחת' : ''}</span>
                      </div>
                      <div className="flex items-end gap-1.5 shrink-0">
                        <InlineNum label="סטים" value={it.Sets} min={1} onChange={v => update(l.LevelID, it.id, { Sets: v })} />
                        {it.exercise.isDuration
                          ? <InlineNum label="שניות" value={it.Duration ?? 30} min={1} onChange={v => update(l.LevelID, it.id, { Duration: v, Reps: 1 })} />
                          : <InlineNum label="חזרות" value={it.Reps} min={1} onChange={v => update(l.LevelID, it.id, { Reps: v })} />}
                        <InlineNum label="מנוחה" value={it.Rest} onChange={v => update(l.LevelID, it.id, { Rest: v })} />
                      </div>
                      <div className="flex flex-col md:flex-row gap-1 shrink-0">
                        <button type="button" onClick={() => duplicate(l.LevelID, it.id)} aria-label={`שכפל ${it.exercise.Name}`} className={`${mini} hidden md:grid`}><LuCopy aria-hidden className="w-4 h-4" /></button>
                        <button type="button" onClick={() => remove(l.LevelID, it.id)} aria-label={`הסר ${it.exercise.Name}`} className={`${mini} text-danger`}><LuTrash2 aria-hidden className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}

                  {isDesktop ? (
                    !isTarget && its.length > 0 && (
                      <button type="button" onClick={() => { setTarget(li); setFocusSig(n => n + 1) }} className="w-full h-10 border-t border-dashed border-line-strong text-accent text-sm font-bold">
                        + הוספה לרמה {l.LevelNumber}
                      </button>
                    )
                  ) : (
                    <button type="button" onClick={() => setPickFor(l.LevelID)} className="w-full h-11 border-t border-dashed border-line-strong text-accent text-sm font-extrabold inline-flex items-center justify-center gap-1">
                      <LuPlus aria-hidden className="w-4 h-4" />הוספת תרגילים לרמה {l.LevelNumber}
                    </button>
                  )}
                </section>
              )
            })}
          </div>

          {isDesktop && (
            <aside className="sticky self-start" style={{ top: 'calc(var(--app-header-height, 0px) + 1rem)' }}>
              <ExercisePicker
                panel
                focusSig={focusSig}
                blockLabel={`רמה ${levels[tgt]?.LevelNumber ?? ''}`}
                targets={levels.map(l => `רמה ${l.LevelNumber}`)}
                target={tgt}
                onTarget={setTarget}
                resetKey={tgt}
                filter={ex => !(ex as LibExercise & { is_dynamic?: boolean }).is_dynamic}
                onAdd={ex => addTo(levels[tgt].LevelID, ex as unknown as Exercise)}
                onDragItem={ex => { drag.current = ex ? { kind: 'lib', ex: ex as unknown as Exercise } : null; if (!ex) setDropAt(null) }}
                onClose={() => {}}
              />
            </aside>
          )}
        </div>
      )}

      {pickFor != null && !isDesktop && (() => {
        const l = levels.find(x => x.LevelID === pickFor)
        return (
          <ExercisePicker
            blockLabel={`רמה ${l?.LevelNumber ?? ''}`}
            filter={ex => !(ex as LibExercise & { is_dynamic?: boolean }).is_dynamic}
            onAdd={ex => addTo(pickFor, ex as unknown as Exercise)}
            onClose={n => { setPickFor(null); if (n) showToast(`נוספו ${n} תרגילים`) }}
          />
        )
      })()}

      {/* save bar */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-6 z-10 mt-6 flex items-center gap-3 bg-surface border border-line rounded-xl p-2.5 md:p-3">
        <span className={`flex-1 text-sm ${dirty ? 'text-warning font-bold' : 'text-muted'}`}>{dirty ? 'יש שינויים שלא נשמרו' : 'הכול שמור'}</span>
        <button type="button" onClick={leave} className="h-11 px-4 rounded-lg border border-line text-sm font-medium">סגור</button>
        <button type="button" onClick={handleSave} disabled={saving || !dirty || !dynamicExercise.RoadmapCategoryID} className="h-11 px-5 rounded-lg bg-accent text-on-accent text-sm font-extrabold inline-flex items-center gap-1.5 disabled:opacity-50">
          <LuSave aria-hidden className="w-4 h-4" />{saving ? 'שומר…' : 'שמור'}
        </button>
      </div>

      {toast && createPortal(
        <div role="status" className="fixed z-[120] left-1/2 -translate-x-1/2 bottom-[calc(140px+env(safe-area-inset-bottom))] bg-fg text-bg rounded-full ps-4 pe-1.5 py-1.5 flex items-center gap-3 text-[15px] font-bold whitespace-nowrap shadow-lg max-w-[94vw]">
          <span className="truncate">{toast.text}</span>
          {toast.undo
            ? <button type="button" onClick={() => { toast.undo?.(); setToast(null) }} className="h-9 px-4 rounded-full bg-bg text-fg font-extrabold">ביטול</button>
            : <span className="w-1" />}
        </div>,
        document.body,
      )}
    </div>
  )
}
