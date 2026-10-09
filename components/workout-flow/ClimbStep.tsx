'use client'

// Quick climbing log: pick type + grade, each tap adds one route
// (flash / attempt 2 / 3 / 4 / 5+ / not sent). Named routes and edits in a bottom sheet.
// Produces the same ClimbingRoute[] the workout page already saves (one ClimbingLog row per route).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuMapPin, LuZap } from 'react-icons/lu'
import { BoardType, BoulderGrade, ClimbingLocation, ClimbingRoute, LeadGrade } from '@/types/climbing'
import { generateTempId, getGradeDisplay } from '@/lib/climbing-helpers'
import Hint from './Hint'

type CType = ClimbingRoute['climbType']

const TYPES: { key: CType; label: string; color: string; bg: string; ring: string }[] = [
  { key: 'Boulder', label: 'בולדר', color: 'bg-accent', bg: 'bg-accent text-on-accent border-accent', ring: 'ring-accent' },
  { key: 'Board', label: 'בורד', color: 'bg-warning', bg: 'bg-warning text-bg border-warning', ring: 'ring-warning' },
  { key: 'Lead', label: 'הובלה', color: 'bg-info', bg: 'bg-info text-bg border-info', ring: 'ring-info' },
]
const typeOf = (k: CType) => TYPES.find(t => t.key === k)!

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
  onAddLocation: () => void
  defaultGrades: Partial<Record<CType, number>>
  defaultType?: CType
}

interface Grade { id: number; label: string }

export default function ClimbStep(props: Props) {
  const { routes, onRoutesChange, boulderGrades, leadGrades, boardTypes, selectedBoardType, onBoardTypeChange,
    locations, selectedLocation, onLocationChange, onAddLocation, defaultGrades } = props

  const [type, setType] = useState<CType>(props.defaultType ?? 'Boulder')
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
    const what = !successful ? 'לא נסגר' : attempts === 1 ? 'פלאש' : attempts >= 5 ? `${attempts} ניסיונות` : `ניסיון ${attempts}`
    showToast(`${gradeLabel} ${what}${routeName ? ` · ${routeName}` : ''}`, () => onRoutesChange(next.filter(x => x.id !== r.id)))
  }

  // edit / named-route sheet
  const [sheet, setSheet] = useState<{ route: ClimbingRoute | null; draft: { routeName: string; attempts: number; successful: boolean } } | null>(null)
  const openNew = () => setSheet({ route: null, draft: { routeName: '', attempts: 1, successful: true } })
  const openEdit = (r: ClimbingRoute) => setSheet({ route: r, draft: { routeName: r.routeName || '', attempts: r.attempts || 1, successful: r.successful } })
  const saveSheet = () => {
    if (!sheet) return
    const d = sheet.draft
    if (sheet.route) onRoutesChange(routes.map(r => (r.id === sheet.route!.id ? { ...r, ...d, routeName: d.routeName.trim() } : r)))
    else add(d.attempts, d.successful, d.routeName.trim())
    setSheet(null)
  }
  const deleteSheet = () => {
    if (!sheet?.route) return
    const old = sheet.route, before = routes
    onRoutesChange(routes.filter(r => r.id !== old.id))
    setSheet(null)
    showToast('המסלול נמחק', () => onRoutesChange(before))
  }

  // session list grouped by type + grade (hardest first)
  const groups = (() => {
    const order = (r: ClimbingRoute) => gradesOf(r.climbType).findIndex(g => g.id === r.gradeID)
    const m = new Map<string, ClimbingRoute[]>()
    for (const r of routes) {
      const k = `${r.climbType}|${r.gradeID}`
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return [...m.values()].sort((a, b) =>
      a[0].climbType === b[0].climbType
        ? order(b[0]) - order(a[0])
        : TYPES.findIndex(t => t.key === a[0].climbType) - TYPES.findIndex(t => t.key === b[0].climbType))
  })()

  const countAt = (id: number) => routes.filter(r => r.climbType === type && r.gradeID === id).length
  const labelOf = (r: ClimbingRoute) => gradesOf(r.climbType).find(g => g.id === r.gradeID)?.label ?? r.gradeDisplay
  const t = typeOf(type)
  const missingLocation = routes.length > 0 && !selectedLocation

  const PAD: { attempts: number; sent: boolean; title: string; sub: string; cls: string }[] = [
    { attempts: 1, sent: true, title: 'פלאש', sub: 'ניסיון ראשון', cls: 'bg-success/15 border-success text-success' },
    { attempts: 2, sent: true, title: 'ניסיון 2', sub: 'נסגר', cls: 'bg-raised border-line-strong text-fg' },
    { attempts: 3, sent: true, title: 'ניסיון 3', sub: 'נסגר', cls: 'bg-raised border-line-strong text-fg' },
    { attempts: 4, sent: true, title: 'ניסיון 4', sub: 'נסגר', cls: 'bg-raised border-line-strong text-fg' },
    { attempts: 5, sent: true, title: '5+', sub: 'נסגר', cls: 'bg-raised border-line-strong text-fg' },
    { attempts: 1, sent: false, title: 'לא נסגר', sub: 'ניסיתי', cls: 'bg-raised border-danger/60 text-danger' },
  ]

  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="text-2xl font-extrabold">רישום טיפוס</h2>
        <label className={`flex items-center gap-1.5 h-11 px-3 rounded-xl border bg-surface max-w-[60%] ${missingLocation ? 'border-danger text-danger' : 'border-line-strong text-fg'}`}>
          <LuMapPin aria-hidden className="w-[18px] h-[18px] shrink-0" />
          <select
            aria-label="מיקום"
            value={selectedLocation ?? ''}
            onChange={e => {
              if (e.target.value === '__new') { onAddLocation(); return }
              onLocationChange(Number(e.target.value) || null)
            }}
            className="appearance-none bg-transparent border-0 text-[15px] font-bold min-w-0 truncate focus:outline-none"
          >
            <option value="">בחר מיקום</option>
            {locations.map(l => <option key={l.LocationID} value={l.LocationID}>{l.LocationName}</option>)}
            <option value="__new">+ מיקום חדש…</option>
          </select>
        </label>
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
        <div ref={strip} className="flex gap-2 overflow-x-auto px-4 pt-2 pb-2 [scrollbar-width:none]" role="group" aria-label="דירוג">
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

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-extrabold">{gradeLabel} · איך היה?</h3>
          <span className="text-[13px] text-muted">כל לחיצה מוסיפה מסלול</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PAD.map(p => (
            <button
              key={p.title}
              type="button"
              onClick={() => add(p.attempts, p.sent)}
              className={`h-[68px] rounded-2xl border flex flex-col items-center justify-center active:scale-95 ${p.cls}`}
            >
              <strong className="text-[19px] font-extrabold" dir={p.title === '5+' ? 'ltr' : undefined}>{p.title}</strong>
              <small className="text-xs text-muted">{p.sub}</small>
            </button>
          ))}
        </div>
      </section>

      <Hint id="climb-tap">בוחרים דירוג, וכל לחיצה מוסיפה מסלול אחד. לחצת בטעות? ״ביטול״ בהודעה שקופצת למטה.</Hint>

      <button type="button" onClick={openNew} className="h-[46px] rounded-xl border border-dashed border-line-strong text-fg-3 text-[15px] font-bold">
        + מסלול עם שם (פרויקט, מסלול הובלה)
      </button>

      <section>
        <h3 className="text-[13px] font-bold text-muted mb-2">האימון הזה</h3>
        {groups.length === 0 ? (
          <p className="border border-dashed border-line-strong rounded-2xl p-4 text-center text-muted text-[15px]">
            עוד אין מסלולים. בחר דירוג ולחץ איך היה.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Hint id="climb-edit">לחיצה על מסלול ברשימה פותחת עריכה: שם, מספר ניסיונות, נסגר או לא, ומחיקה.</Hint>
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
                        {!r.successful ? '✗' : r.attempts === 1 ? <LuZap aria-label="פלאש" className="w-4 h-4" /> : r.attempts}
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
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[80] bg-fg text-bg rounded-full ps-4 pe-1.5 py-1.5 flex items-center gap-2.5 text-[15px] font-bold whitespace-nowrap shadow-lg">
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
              {sheet.route ? 'עריכת מסלול' : 'מסלול עם שם'} · {typeOf(sheet.route?.climbType ?? type).label} {sheet.route ? labelOf(sheet.route) : gradeLabel}
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
