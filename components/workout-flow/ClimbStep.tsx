'use client'

// Quick climbing log: pick type + grade, each tap adds one route
// (flash / attempt 2 / 3 / 4 / 5+ / not sent). Named routes and edits in a bottom sheet.
// Lead is logged per ascent ("go"): clean / topped with N takes / not topped (how far up);
// "+ עלייה נוספת" adds the next go on the same route (shared routeKey).
// Produces the same ClimbingRoute[] the workout page already saves (one ClimbingLog row per route / go).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuZap } from 'react-icons/lu'
import { BoardType, BoulderGrade, ClimbingLocation, ClimbingRoute, LeadGrade } from '@/types/climbing'
import { generateTempId, getGradeDisplay } from '@/lib/climbing-helpers'
import Hint from './Hint'
import LocationPicker from './LocationPicker'

type CType = ClimbingRoute['climbType']

const TYPES: { key: CType; label: string; color: string; bg: string; ring: string }[] = [
  { key: 'Boulder', label: 'בולדר', color: 'bg-accent', bg: 'bg-accent text-on-accent border-accent', ring: 'ring-accent' },
  { key: 'Board', label: 'בורד', color: 'bg-warning', bg: 'bg-warning text-bg border-warning', ring: 'ring-warning' },
  { key: 'Lead', label: 'הובלה', color: 'bg-info', bg: 'bg-info text-bg border-info', ring: 'ring-info' },
]
const typeOf = (k: CType) => TYPES.find(t => t.key === k)!

type LeadOutcome = { kind: 'clean' } | { kind: 'takes'; takes: number } | { kind: 'low'; pct: number }
/** how far up a lead go that didn't top got; half is the usual default */
const HEIGHTS = [
  { pct: 25, label: '¼', name: 'רבע' },
  { pct: 50, label: '½', name: 'חצי' },
  { pct: 75, label: '¾', name: 'שלושה רבעים' },
  { pct: 90, label: 'כמעט', name: 'כמעט טופ' },
]

interface Props {
  routes: ClimbingRoute[]
  onRoutesChange: (r: ClimbingRoute[]) => void
  boulderGrades: BoulderGrade[]
  leadGrades: LeadGrade[]
  boardTypes: BoardType[]
  selectedBoardType: number | null
  onBoardTypeChange: (id: number | null) => void
  locations: ClimbingLocation[]
  selectedLocation: number | null
  onLocationChange: (id: number | null) => void
  onAddLocation: (name?: string) => void
  defaultGrades: Partial<Record<CType, number>>
  defaultType?: CType
}

interface Grade { id: number; label: string }

export default function ClimbStep(props: Props) {
  const { routes, onRoutesChange, boulderGrades, leadGrades, boardTypes, selectedBoardType, onBoardTypeChange,
    locations, selectedLocation, onLocationChange, onAddLocation, defaultGrades } = props

  // the type of the routes already logged in this session wins (coming back to this step keeps it);
  // then the workout's default, which may arrive after the first render
  const [type, setTypeRaw] = useState<CType>(routes[routes.length - 1]?.climbType ?? props.defaultType ?? 'Boulder')
  const [touched, setTouched] = useState(routes.length > 0)
  const setType = (t: CType) => { setTouched(true); setTypeRaw(t) }
  const [seenDefault, setSeenDefault] = useState(props.defaultType)
  if (props.defaultType !== seenDefault) {
    setSeenDefault(props.defaultType)
    if (!touched && props.defaultType) setTypeRaw(props.defaultType)
  }
  const gradesOf = (t: CType): Grade[] => t === 'Lead'
    ? leadGrades.map(g => ({ id: g.LeadGradeID, label: g.FrenchGrade }))
    : boulderGrades.map(g => ({ id: g.BoulderGradeID, label: g.VGrade }))
  const grades = gradesOf(type)
  const fallback = (t: CType) => {
    const list = gradesOf(t)
    const want = t === 'Lead' ? '6b' : t === 'Board' ? 'V3' : 'V4'
    return list.find(g => g.label === want)?.id ?? list[0]?.id ?? null
  }
  const [gradeByType, setGradeByType] = useState<Partial<Record<CType, number | null>>>({})
  const grade = gradeByType[type] ?? defaultGrades[type] ?? fallback(type)
  const gradeLabel = grades.find(g => g.id === grade)?.label ?? ''

  // keep the chosen grade in view
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // scroll only the strip (scrollIntoView would also scroll the page behind the flow)
    const st = strip.current, el = st?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (st && el) {
      const a = el.getBoundingClientRect(), b = st.getBoundingClientRect()
      st.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2) })
    }
  }, [type, grades.length])

  // desktop: drag the grade strip with the mouse, and let the wheel scroll it sideways
  // (touch keeps its native swipe). A drag doesn't count as a click on a grade.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const dragged = useRef(false)
  const onStripDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !strip.current) return
    drag.current = { x: e.clientX, left: strip.current.scrollLeft, moved: false }
    dragged.current = false
  }
  const onStripMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current, st = strip.current
    if (!d || !st) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) > 5) { d.moved = true; st.setPointerCapture(e.pointerId); st.style.cursor = 'grabbing' }
    if (d.moved) st.scrollLeft = d.left - dx
  }
  const onStripUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current, st = strip.current
    drag.current = null
    if (!d || !st) return
    if (d.moved) { dragged.current = true; st.releasePointerCapture?.(e.pointerId); st.style.cursor = '' }
  }
  useEffect(() => {
    const st = strip.current
    if (!st) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || st.scrollWidth <= st.clientWidth) return
      e.preventDefault()
      st.scrollLeft -= e.deltaY // RTL: wheel down moves toward the harder grades (to the left)
    }
    st.addEventListener('wheel', onWheel, { passive: false })
    return () => st.removeEventListener('wheel', onWheel)
  }, [])

  // toast with undo
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (text: string, undo?: () => void) => {
    setToast({ text, undo })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2600)
  }

  const make = (attempts: number, successful: boolean, routeName = ''): ClimbingRoute => ({
    id: generateTempId(), climbType: type, gradeID: grade,
    gradeDisplay: getGradeDisplay(grade, type, boulderGrades, leadGrades),
    routeName, attempts, successful, notes: '',
  })
  const add = (attempts: number, successful: boolean, routeName = '') => {
    if (!grade) return
    const r = make(attempts, successful, routeName)
    const next = [...routes, r]
    onRoutesChange(next)
    try { navigator.vibrate?.(10) } catch { /* not supported */ }
    const what = !successful ? (attempts > 1 ? `לא נסגר · ${attempts} ניסיונות` : 'לא נסגר') : attempts === 1 ? 'פלאש' : attempts >= 5 ? `${attempts} ניסיונות` : `ניסיון ${attempts}`
    showToast(`${gradeLabel} ${what}${routeName ? ` · ${routeName}` : ''}`, () => onRoutesChange(next.filter(x => x.id !== r.id)))
  }

  // ===== Lead: one entry per ascent; "+ עלייה נוספת" continues a route =====
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const leadKey = (r: ClimbingRoute) => r.routeKey || r.id
  const goesOf = (key: string) => routes.filter(r => r.climbType === 'Lead' && leadKey(r) === key)
  const outcomeOf = (r: ClimbingRoute): LeadOutcome =>
    r.successful ? { kind: 'clean' }
    : r.reachedTop ? { kind: 'takes', takes: Math.max(1, r.takes ?? 1) }
    : { kind: 'low', pct: r.heightPct ?? 50 }
  const outcomeFields = (o: LeadOutcome) => ({
    attempts: 1,
    successful: o.kind === 'clean',
    reachedTop: o.kind !== 'low',
    takes: o.kind === 'clean' ? 0 : o.kind === 'takes' ? o.takes : null,
    heightPct: o.kind === 'low' ? o.pct : null,
  })
  const outcomeText = (o: LeadOutcome) =>
    o.kind === 'clean' ? 'נקי'
    : o.kind === 'takes' ? `טופ עם ${o.takes >= 5 ? '5+' : o.takes} ${o.takes === 1 ? 'עצירה' : 'עצירות'}`
    : `לא הגיע לטופ · עד ${HEIGHTS.find(h => h.pct === o.pct)?.name ?? o.pct + '%'}`
  const activeGoes = activeKey ? goesOf(activeKey) : []
  const activeFirst = activeGoes[0]
  const addGo = (o: LeadOutcome, routeName = '') => {
    const gid = activeFirst ? activeFirst.gradeID : grade
    if (!gid) return
    const r: ClimbingRoute = {
      id: generateTempId(), climbType: 'Lead', gradeID: gid,
      gradeDisplay: getGradeDisplay(gid, 'Lead', boulderGrades, leadGrades),
      routeName: activeFirst?.routeName || routeName, notes: '',
      routeKey: activeFirst ? activeKey : generateTempId(),
      goNumber: activeGoes.length + 1,
      ...outcomeFields(o),
    }
    const next = [...routes, r]
    onRoutesChange(next)
    setActiveKey(null)
    try { navigator.vibrate?.(10) } catch { /* not supported */ }
    showToast(`${labelOf(r)} · עלייה ${r.goNumber} · ${outcomeText(o)}`, () => onRoutesChange(next.filter(x => x.id !== r.id)))
  }
  /** goes on one route numbered 1…n again (after a delete) */
  const renumber = (list: ClimbingRoute[], key: string) => {
    let n = 0
    return list.map(r => (r.climbType === 'Lead' && leadKey(r) === key ? { ...r, goNumber: ++n } : r))
  }

  // edit / named-route sheet
  type Draft = { routeName: string; attempts: number; successful: boolean; outcome: LeadOutcome }
  const [sheet, setSheet] = useState<{ route: ClimbingRoute | null; draft: Draft } | null>(null)
  const sheetLead = (sheet?.route?.climbType ?? type) === 'Lead'
  const openNew = () => setSheet({ route: null, draft: { routeName: '', attempts: 1, successful: true, outcome: { kind: 'clean' } } })
  const openEdit = (r: ClimbingRoute) => setSheet({ route: r, draft: { routeName: r.routeName || '', attempts: r.attempts || 1, successful: r.successful, outcome: outcomeOf(r) } })
  const setDraft = (d: Partial<Draft>) => setSheet(s => s && { ...s, draft: { ...s.draft, ...d } })
  const saveSheet = () => {
    if (!sheet) return
    const d = sheet.draft, name = d.routeName.trim()
    if (sheet.route && sheet.route.climbType === 'Lead') {
      const key = leadKey(sheet.route)
      onRoutesChange(routes.map(r =>
        r.id === sheet.route!.id ? { ...r, routeName: name, ...outcomeFields(d.outcome) }
        : r.climbType === 'Lead' && leadKey(r) === key ? { ...r, routeName: name } // the name belongs to the route
        : r))
    } else if (sheet.route) onRoutesChange(routes.map(r => (r.id === sheet.route!.id ? { ...r, routeName: name, attempts: d.attempts, successful: d.successful } : r)))
    else if (type === 'Lead') addGo(d.outcome, name)
    else add(d.attempts, d.successful, name)
    setSheet(null)
  }
  const deleteSheet = () => {
    if (!sheet?.route) return
    const old = sheet.route, before = routes
    const rest = routes.filter(r => r.id !== old.id)
    onRoutesChange(old.climbType === 'Lead' ? renumber(rest, leadKey(old)) : rest)
    setSheet(null)
    showToast(old.climbType === 'Lead' ? 'העלייה נמחקה' : 'המסלול נמחק', () => onRoutesChange(before))
  }

  // session list grouped by type + grade (hardest first)
  const groups = (() => {
    const order = (r: ClimbingRoute) => gradesOf(r.climbType).findIndex(g => g.id === r.gradeID)
    const m = new Map<string, ClimbingRoute[]>()
    for (const r of routes) {
      if (r.climbType === 'Lead') continue
      const k = `${r.climbType}|${r.gradeID}`
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return [...m.values()].sort((a, b) =>
      a[0].climbType === b[0].climbType
        ? order(b[0]) - order(a[0])
        : TYPES.findIndex(t => t.key === a[0].climbType) - TYPES.findIndex(t => t.key === b[0].climbType))
  })()

  // lead: one card per route (its goes in order), newest route first
  const leadRoutes = (() => {
    const m = new Map<string, ClimbingRoute[]>()
    for (const r of routes) if (r.climbType === 'Lead') m.set(leadKey(r), [...(m.get(leadKey(r)) ?? []), r])
    return [...m.entries()].reverse()
  })()
  const countAt = (id: number) => type === 'Lead'
    ? leadRoutes.filter(([, gs]) => gs[0].gradeID === id).length
    : routes.filter(r => r.climbType === type && r.gradeID === id).length
  const labelOf = (r: ClimbingRoute) => gradesOf(r.climbType).find(g => g.id === r.gradeID)?.label ?? r.gradeDisplay
  const t = typeOf(type)
  const missingLocation = routes.length > 0 && !selectedLocation

  // two rows: sent on attempt 1…5+, and not sent after 1…5+ attempts (each attempt counts in the stats)
  const ATTEMPTS = [1, 2, 3, 4, 5]
  const attLabel = (a: number) => (a === 5 ? '5+' : String(a))

  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="text-2xl font-extrabold">רישום טיפוס</h2>
        <LocationPicker
          locations={locations}
          value={selectedLocation}
          onChange={onLocationChange}
          onAddNew={onAddLocation}
          tone={missingLocation ? 'missing' : 'normal'}
        />
      </div>

      <div className="grid grid-cols-3 gap-1 bg-surface border border-line rounded-2xl p-1" role="group" aria-label="סוג טיפוס">
        {TYPES.map(x => (
          <button
            key={x.key}
            type="button"
            aria-pressed={type === x.key}
            onClick={() => setType(x.key)}
            className={`h-[46px] rounded-xl text-base font-extrabold flex items-center justify-center gap-1.5 ${
              type === x.key ? `bg-raised text-fg ring-2 ring-inset ${x.ring}` : 'text-fg-2'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${x.color}`} />{x.label}
          </button>
        ))}
      </div>

      {type === 'Board' && boardTypes.length > 0 && (
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="סוג בורד">
          {boardTypes.map(b => (
            <button
              key={b.BoardID}
              type="button"
              aria-pressed={selectedBoardType === b.BoardID}
              onClick={() => onBoardTypeChange(b.BoardID)}
              className={`h-10 px-3.5 rounded-full border text-sm font-bold ${
                selectedBoardType === b.BoardID ? 'bg-warning border-warning text-bg' : 'bg-surface border-line-strong text-fg-2'
              }`}
            >
              {b.BoardName}
            </button>
          ))}
        </div>
      )}

      <div className="-mx-4">
        <div
          ref={strip}
          data-no-swipe
          onPointerDown={onStripDown}
          onPointerMove={onStripMove}
          onPointerUp={onStripUp}
          onPointerCancel={onStripUp}
          onClickCapture={e => { if (dragged.current) { e.stopPropagation(); e.preventDefault(); dragged.current = false } }}
          className="flex gap-2 overflow-x-auto px-4 pt-2 pb-2 [scrollbar-width:none] md:cursor-grab select-none"
          role="group"
          aria-label="דירוג"
        >
          {grades.map(g => {
            const on = g.id === grade, c = countAt(g.id)
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => setGradeByType(p => ({ ...p, [type]: g.id }))}
                className={`relative shrink-0 min-w-[58px] h-[58px] px-2.5 rounded-2xl border text-xl font-extrabold tabular-nums ${
                  on ? t.bg : 'bg-surface border-line-strong text-fg-2'
                }`}
              >
                {g.label}
                {c > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-fg text-bg text-xs leading-[22px]">{c}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {type === 'Lead' ? (
        <section className="flex flex-col gap-2.5">
          <div className={`flex items-center justify-between gap-2.5 rounded-2xl px-3.5 py-3 border ${activeFirst ? 'border-2 border-accent bg-accent/10' : 'border-line bg-surface'}`}>
            <div className="min-w-0">
              <p className="text-lg font-extrabold">
                {activeFirst ? `עלייה ${activeGoes.length + 1} על ${labelOf(activeFirst)}${activeFirst.routeName ? ` · ${activeFirst.routeName}` : ''}` : `${gradeLabel} · מסלול חדש`}
              </p>
              <p className="text-[13px] text-fg-3">{activeFirst ? 'מה קרה בעלייה הזאת?' : 'כל לחיצה רושמת עלייה'}</p>
            </div>
            {activeFirst && (
              <button type="button" onClick={() => setActiveKey(null)} className="shrink-0 h-10 px-3 rounded-xl border border-line-strong bg-surface text-sm font-bold text-fg-2">מסלול חדש</button>
            )}
          </div>
          <p className="text-[13px] font-bold text-success">נקי: בלי נפילות ובלי טייק</p>
          <button type="button" onClick={() => addGo({ kind: 'clean' })} className="h-[58px] rounded-2xl border border-success bg-success/15 text-success text-lg font-extrabold active:scale-[0.98]">✓ נקי</button>
          <p className="text-[13px] font-bold text-warning mt-1">טופ עם עצירות: כמה טייקים / נפילות?</p>
          <div className="grid grid-cols-5 gap-1.5">
            {ATTEMPTS.map(a => (
              <button
                key={'t' + a}
                type="button"
                aria-label={`הגעתי לטופ עם ${attLabel(a)} ${a === 1 ? 'עצירה' : 'עצירות'}`}
                onClick={() => addGo({ kind: 'takes', takes: a })}
                className="h-[60px] rounded-2xl border border-warning/50 bg-raised text-warning flex flex-col items-center justify-center active:scale-95"
              >
                <strong className="text-[20px] font-extrabold tabular-nums" dir="ltr">{attLabel(a)}</strong>
                <small className="text-[11px] font-bold">{a === 1 ? 'עצירה' : 'עצירות'}</small>
              </button>
            ))}
          </div>
          <p className="text-[13px] font-bold text-danger mt-1">לא הגעתי לטופ: עד איפה?</p>
          <div className="grid grid-cols-4 gap-1.5">
            {HEIGHTS.map(h => (
              <button
                key={h.pct}
                type="button"
                aria-label={`לא הגעתי לטופ, עד ${h.name}`}
                onClick={() => addGo({ kind: 'low', pct: h.pct })}
                className={`h-[60px] rounded-2xl bg-raised text-danger flex flex-col items-center justify-center active:scale-95 ${h.pct === 50 ? 'border-2 border-danger' : 'border border-danger/50'}`}
              >
                <strong className="text-[19px] font-extrabold">{h.label}</strong>
                <small className="text-[11px] font-bold">{h.pct === 50 ? 'חצי · רגיל' : h.name}</small>
              </button>
            ))}
          </div>
        </section>
      ) : (
      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-extrabold">{gradeLabel} · איך היה?</h3>
          <span className="text-[13px] text-muted">כל לחיצה מוסיפה מסלול</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-bold text-success">נסגר בניסיון</p>
          <div className="grid grid-cols-5 gap-1.5">
            {ATTEMPTS.map(a => (
              <button
                key={'s' + a}
                type="button"
                aria-label={a === 1 ? 'פלאש: נסגר בניסיון ראשון' : `נסגר בניסיון ${attLabel(a)}`}
                onClick={() => add(a, true)}
                className={`h-[60px] rounded-2xl border flex flex-col items-center justify-center active:scale-95 ${a === 1 ? 'bg-success/15 border-success text-success' : 'bg-raised border-line-strong text-fg'}`}
              >
                {a === 1 ? <>
                  <LuZap aria-hidden className="w-5 h-5" />
                  <small className="text-[11px] font-bold">פלאש</small>
                </> : <strong className="text-[20px] font-extrabold tabular-nums" dir="ltr">{attLabel(a)}</strong>}
              </button>
            ))}
          </div>
          <p className="text-[13px] font-bold text-danger mt-1.5">לא נסגר אחרי</p>
          <div className="grid grid-cols-5 gap-1.5">
            {ATTEMPTS.map(a => (
              <button
                key={'f' + a}
                type="button"
                aria-label={`לא נסגר אחרי ${attLabel(a)} ${a === 1 ? 'ניסיון' : 'ניסיונות'}`}
                onClick={() => add(a, false)}
                className="h-[60px] rounded-2xl border border-danger/60 bg-raised text-danger flex flex-col items-center justify-center active:scale-95"
              >
                <strong className="text-[20px] font-extrabold tabular-nums" dir="ltr">{attLabel(a)}</strong>
                <small className="text-[11px] font-bold">{a === 1 ? 'ניסיון' : 'ניסיונות'}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      )}

      <Hint id="climb-tap">בוחרים דירוג, וכל לחיצה מוסיפה מסלול אחד. לחצת בטעות? ״ביטול״ בהודעה שקופצת למטה.</Hint>

      <button type="button" onClick={openNew} className="h-[46px] rounded-xl border border-dashed border-line-strong text-fg-3 text-[15px] font-bold">
        {type === 'Lead' ? '+ מסלול הובלה עם שם' : '+ מסלול עם שם (פרויקט, מסלול הובלה)'}
      </button>

      <section>
        <h3 className="text-[13px] font-bold text-muted mb-2">האימון הזה</h3>
        {groups.length === 0 && leadRoutes.length === 0 ? (
          <p className="border border-dashed border-line-strong rounded-2xl p-4 text-center text-muted text-[15px]">
            עוד אין מסלולים. בחר דירוג ולחץ איך היה.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Hint id="climb-edit">לחיצה על מסלול ברשימה פותחת עריכה: שם, מספר ניסיונות, נסגר או לא, ומחיקה.</Hint>
            {leadRoutes.map(([key, gs]) => {
              const g0 = gs[0]
              const cleanAt = gs.findIndex(g => g.successful)
              const tops = gs.filter(g => !g.successful && g.reachedTop).map(g => g.takes ?? 1)
              const status = cleanAt === 0 ? 'און־סייט / פלאש'
                : cleanAt > 0 ? `נסגר בעלייה ${cleanAt + 1}`
                : tops.length ? `הגיע לטופ · הכי טוב: ${Math.min(...tops)} עצירות`
                : 'עוד לא הגיע לטופ'
              const active = key === activeKey
              return (
                <div key={key} className={`rounded-2xl px-3 py-2.5 flex flex-col gap-2 bg-surface ${active ? 'border-2 border-accent' : 'border border-line'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${typeOf('Lead').color}`} />
                    <span className="text-lg font-extrabold">{labelOf(g0)}</span>
                    <span className="flex-1 min-w-0 truncate text-sm text-muted">{g0.routeName || 'הובלה'} · {gs.length} {gs.length === 1 ? 'עלייה' : 'עליות'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {gs.map((g, i) => {
                      const o = outcomeOf(g)
                      const tone = o.kind === 'clean' ? 'text-success' : o.kind === 'takes' ? 'text-warning' : 'text-danger'
                      const dot = o.kind === 'clean' ? 'bg-success' : o.kind === 'takes' ? 'bg-warning' : 'bg-danger'
                      return (
                        <button key={g.id} type="button" onClick={() => openEdit(g)} aria-label={`עריכת עלייה ${i + 1}`} className="flex items-center gap-2 min-h-9 text-start">
                          <span className={`w-6 h-6 shrink-0 rounded-full ${dot} text-bg text-xs font-extrabold grid place-items-center`}>{i + 1}</span>
                          <span className={`text-[15px] font-bold ${tone}`}>{outcomeText(o)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
                    <span className={`text-sm font-extrabold ${cleanAt >= 0 ? 'text-success' : tops.length ? 'text-warning' : 'text-danger'}`}>{status}</span>
                    <button
                      type="button"
                      onClick={() => { setActiveKey(key); setType('Lead'); setGradeByType(p => ({ ...p, Lead: g0.gradeID })) }}
                      className="shrink-0 h-10 px-3 rounded-xl border border-dashed border-accent text-accent text-sm font-extrabold"
                    >
                      + עלייה נוספת
                    </button>
                  </div>
                </div>
              )
            })}
            {groups.map(rs => {
              const r0 = rs[0], tt = typeOf(r0.climbType), sent = rs.filter(r => r.successful).length
              return (
                <div key={`${r0.climbType}|${r0.gradeID}`} className="border border-line bg-surface rounded-2xl px-3 py-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${tt.color}`} />
                    <span className="text-lg font-extrabold min-w-[44px]">{labelOf(r0)}</span>
                    <span className="flex-1 text-sm text-muted">{tt.label} · {rs.length} מסלולים · {sent} נסגרו</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rs.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openEdit(r)}
                        aria-label={`עריכת מסלול ${labelOf(r)}`}
                        className={`h-9 min-w-9 px-2.5 rounded-[10px] border bg-raised text-[15px] font-extrabold inline-flex items-center gap-1 ${
                          !r.successful ? 'border-danger/60 text-danger' : r.attempts === 1 ? 'border-success text-success' : 'border-line-strong text-fg'
                        }`}
                      >
                        {!r.successful ? (r.attempts > 1 ? `✗${r.attempts}` : '✗') : r.attempts === 1 ? <LuZap aria-label="פלאש" className="w-4 h-4" /> : r.attempts}
                        {r.routeName && <span className="font-semibold text-fg-2 max-w-[120px] truncate">{r.routeName}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* undo toast (portal: the step track is transformed, so fixed must live outside it) */}
      {toast && createPortal(
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-[calc(170px+env(safe-area-inset-bottom))] z-[80] bg-fg text-bg rounded-full ps-4 pe-1.5 py-1.5 flex items-center gap-2.5 text-[15px] font-bold whitespace-nowrap shadow-lg">
          <span>{toast.text}</span>
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo!(); setToast(null) }} className="h-9 px-3.5 rounded-full bg-bg text-fg font-extrabold">
              ביטול
            </button>
          )}
        </div>,
        document.body,
      )}

      {/* bottom sheet */}
      {sheet && createPortal(
        <div className="fixed inset-0 z-[90] bg-black/55 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) setSheet(null) }}>
          <div role="dialog" data-flow aria-modal="true" aria-labelledby="climb-sheet-title" className="w-full max-w-[520px] bg-raised border-t border-line-strong rounded-t-[20px] px-4 pt-2.5 pb-[calc(18px+env(safe-area-inset-bottom))] flex flex-col gap-3.5">
            <div className="w-10 h-1 rounded-full bg-line-strong mx-auto" />
            <h2 id="climb-sheet-title" className="text-xl font-extrabold">
              {sheet.route ? (sheetLead ? `עריכת עלייה ${sheet.route.goNumber ?? 1}` : 'עריכת מסלול') : 'מסלול עם שם'} · {typeOf(sheet.route?.climbType ?? type).label} {sheet.route ? labelOf(sheet.route) : gradeLabel}
            </h2>
            <div>
              <label htmlFor="climb-name" className="block text-sm font-bold text-fg-2 mb-1.5">שם המסלול <span className="font-normal text-muted">(לא חובה)</span></label>
              <input
                id="climb-name"
                value={sheet.draft.routeName}
                onChange={e => setSheet(s => s && { ...s, draft: { ...s.draft, routeName: e.target.value } })}
                placeholder="למשל: הגג הצהוב"
                autoComplete="off"
                className="w-full h-[50px] rounded-2xl border-2 border-line-strong bg-surface text-fg text-[17px] px-3 focus:outline-none focus:border-accent"
              />
            </div>
            {sheetLead ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold text-fg-2">מה קרה בעלייה?</p>
                <div className="grid grid-cols-3 gap-1 bg-surface border border-line rounded-2xl p-1" role="group" aria-label="תוצאה">
                  {([['clean', 'נקי', 'bg-success'], ['takes', 'טופ עם עצירות', 'bg-warning'], ['low', 'לא לטופ', 'bg-danger']] as const).map(([k, label, on]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={sheet.draft.outcome.kind === k}
                      onClick={() => setDraft({ outcome: k === 'clean' ? { kind: 'clean' } : k === 'takes' ? { kind: 'takes', takes: 1 } : { kind: 'low', pct: 50 } })}
                      className={`min-h-[46px] rounded-xl text-sm font-extrabold ${sheet.draft.outcome.kind === k ? `${on} text-bg` : 'text-fg-2'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {sheet.draft.outcome.kind === 'takes' && (() => {
                  const tk = (sheet.draft.outcome as { takes: number }).takes
                  return (
                    <div dir="ltr" className="flex gap-2 h-14">
                      <button type="button" aria-label="פחות עצירות" onClick={() => setDraft({ outcome: { kind: 'takes', takes: Math.max(1, tk - 1) } })} className="w-14 rounded-2xl border border-line-strong bg-surface text-2xl font-bold">−</button>
                      <output className="flex-1 grid place-items-center rounded-2xl border-2 border-line-strong bg-surface text-[22px] font-extrabold tabular-nums">{tk} {tk === 1 ? 'עצירה' : 'עצירות'}</output>
                      <button type="button" aria-label="יותר עצירות" onClick={() => setDraft({ outcome: { kind: 'takes', takes: tk + 1 } })} className="w-14 rounded-2xl border border-line-strong bg-surface text-2xl font-bold">+</button>
                    </div>
                  )
                })()}
                {sheet.draft.outcome.kind === 'low' && (
                  <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="עד איפה">
                    {HEIGHTS.map(h => {
                      const on = (sheet.draft.outcome as { pct: number }).pct === h.pct
                      return (
                        <button key={h.pct} type="button" aria-pressed={on} onClick={() => setDraft({ outcome: { kind: 'low', pct: h.pct } })}
                          className={`h-12 rounded-xl border font-extrabold ${on ? 'bg-danger border-danger text-bg' : 'border-line-strong bg-surface text-fg-2'}`}>
                          {h.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (<>
            <div>
              <p className="text-sm font-bold text-fg-2 mb-1.5">ניסיונות</p>
              <div dir="ltr" className="flex gap-2 h-14">
                <button type="button" aria-label="פחות ניסיונות" onClick={() => setSheet(s => s && { ...s, draft: { ...s.draft, attempts: Math.max(1, s.draft.attempts - 1) } })} className="w-14 rounded-2xl border border-line-strong bg-surface text-2xl font-bold">−</button>
                <output className="flex-1 grid place-items-center rounded-2xl border-2 border-line-strong bg-surface text-[28px] font-extrabold tabular-nums">{sheet.draft.attempts}</output>
                <button type="button" aria-label="יותר ניסיונות" onClick={() => setSheet(s => s && { ...s, draft: { ...s.draft, attempts: s.draft.attempts + 1 } })} className="w-14 rounded-2xl border border-line-strong bg-surface text-2xl font-bold">+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-surface border border-line rounded-2xl p-1" role="group" aria-label="תוצאה">
              <button type="button" aria-pressed={sheet.draft.successful} onClick={() => setSheet(s => s && { ...s, draft: { ...s.draft, successful: true } })} className={`h-[46px] rounded-xl font-extrabold ${sheet.draft.successful ? 'bg-success text-bg' : 'text-fg-2'}`}>נסגר</button>
              <button type="button" aria-pressed={!sheet.draft.successful} onClick={() => setSheet(s => s && { ...s, draft: { ...s.draft, successful: false } })} className={`h-[46px] rounded-xl font-extrabold ${!sheet.draft.successful ? 'bg-danger text-bg' : 'text-fg-2'}`}>לא נסגר</button>
            </div>
            </>)}
            <div className="flex gap-2">
              {sheet.route && (
                <button type="button" onClick={deleteSheet} className="h-[54px] px-4 rounded-2xl border border-danger/60 text-danger font-extrabold">מחיקה</button>
              )}
              <button type="button" onClick={saveSheet} className="flex-1 h-[54px] rounded-2xl bg-accent text-on-accent text-lg font-extrabold">
                {sheet.route ? 'שמירה' : 'הוספה'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
