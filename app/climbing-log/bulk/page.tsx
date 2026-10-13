'use client'

// Bulk climbing log entry: a trip ("all my routes in Kalymnos 2005") or a new trainee's climbing history.
// Location, type and dates are set once; each tap on a grade adds a route to the selected group.
// A group's date may be exact, month+year or year only (DatePrecision) for climbs nobody remembers exactly.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { LuArrowRight, LuCheck, LuClipboardPaste, LuCopy, LuMinus, LuPlus, LuX } from 'react-icons/lu'
import { useActiveUserEmail } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { addClimbingLogsBulk, fetchBoardTypes, fetchBoulderGrades, fetchClimbingLocations, fetchLeadGrades } from '@/lib/climbing-log-api'
import LocationPicker from '@/components/workout-flow/LocationPicker'
import { BoardType, ClimbingLocation } from '@/types/climbing'

type CType = 'Lead' | 'Boulder' | 'Board'
type Prec = 'day' | 'month' | 'year'
interface Grade { id: number; label: string }
interface Group { key: number; prec: Prec; date: string } // date: YYYY-MM-DD (1st of month / 1 Jan when approximate)
interface Row { key: number; group: number; type: CType; boardId: number | null; gradeId: number; name: string; ok: boolean; att: number }

const TYPES: { key: CType; label: string }[] = [
  { key: 'Lead', label: 'הובלה' },
  { key: 'Boulder', label: 'בולדר' },
  { key: 'Board', label: 'בורד' },
]
const PRECS: { key: Prec; label: string }[] = [
  { key: 'day', label: 'תאריך מדויק' },
  { key: 'month', label: 'רק חודש ושנה' },
  { key: 'year', label: 'רק שנה' },
]
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const pad2 = (n: number) => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: THIS_YEAR - 1970 + 1 }, (_, i) => THIS_YEAR - i)

const whenText = (g: Group) => {
  const [y, m, d] = g.date.split('-')
  if (g.prec === 'year') return y
  if (g.prec === 'month') return `${MONTHS[+m - 1]} ${y}`
  return `${d}/${m}/${y.slice(2)}`
}
const groupName = (g: Group, i: number) => (g.prec === 'day' ? `יום ${i + 1}` : `קבוצה ${i + 1}`)
const nextDay = (date: string) => {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + 1)
  const s = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  return s > today() ? date : s
}

export default function ClimbBulkLogPage() {
  const router = useRouter()
  const email = useActiveUserEmail()

  const [lead, setLead] = useState<Grade[]>([])
  const [boulder, setBoulder] = useState<Grade[]>([])
  const [boards, setBoards] = useState<BoardType[]>([])
  const [locations, setLocations] = useState<ClimbingLocation[]>([])
  const [loadError, setLoadError] = useState('')

  const [locationId, setLocationId] = useState<number | null>(null)
  const [type, setType] = useState<CType>('Lead')
  const [boardId, setBoardId] = useState<number | null>(null)
  const [groups, setGroups] = useState<Group[]>([{ key: 1, prec: 'day', date: today() }])
  const [sel, setSel] = useState(1)
  const [defOk, setDefOk] = useState(true)
  const [defAtt, setDefAtt] = useState(1)
  const [rows, setRows] = useState<Row[]>([])
  const [lastAdded, setLastAdded] = useState<number | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uid = useRef(1)
  const nextKey = () => ++uid.current

  useEffect(() => {
    let alive = true
    Promise.all([fetchLeadGrades(), fetchBoulderGrades(), fetchBoardTypes(), fetchClimbingLocations()])
      .then(([l, b, bt, loc]) => {
        if (!alive) return
        setLead(l.map(g => ({ id: g.LeadGradeID, label: g.FrenchGrade })))
        setBoulder(b.map(g => ({ id: g.BoulderGradeID, label: g.VGrade })))
        setBoards(bt)
        setLocations(loc)
      })
      .catch(() => { if (alive) setLoadError('שגיאה בטעינת דירוגים ומיקומים. נסה לרענן.') })
    return () => { alive = false }
  }, [])

  // warn before leaving with unsaved routes
  useEffect(() => {
    if (!rows.length) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [rows.length])

  const showToast = (text: string, undo?: () => void) => {
    setToast({ text, undo })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }

  const gradesOf = (t: CType) => (t === 'Lead' ? lead : boulder)
  const grades = gradesOf(type)
  const labelOf = (t: CType, id: number) => gradesOf(t).find(g => g.id === id)?.label ?? '?'
  const group = groups.find(g => g.key === sel) ?? groups[0]
  const groupIdx = groups.findIndex(g => g.key === group.key)
  const location = locations.find(l => l.LocationID === locationId)

  const counts = useMemo(() => {
    const c = new Map<number, number>()
    rows.forEach(r => { if (r.group === group.key && r.type === type) c.set(r.gradeId, (c.get(r.gradeId) ?? 0) + 1) })
    return c
  }, [rows, group.key, type])

  const makeRow = (gradeId: number, extra: Partial<Row> = {}): Row => ({
    key: nextKey(), group: group.key, type, boardId: type === 'Board' ? boardId : null,
    gradeId, name: '', ok: defOk, att: defAtt, ...extra,
  })
  const addGrade = (gradeId: number) => {
    const r = makeRow(gradeId)
    setRows(rs => [...rs, r])
    setLastAdded(r.key)
    setSaved(null)
    try { navigator.vibrate?.(8) } catch { /* not supported */ }
  }
  const dupLast = () => {
    const last = [...rows].reverse().find(r => r.group === group.key)
    if (!last) { showToast('אין עדיין מסלול בקבוצה הזו'); return }
    const r: Row = { ...last, key: nextKey(), name: '' }
    setRows(rs => [...rs, r])
    setLastAdded(r.key)
  }
  const updateRow = (key: number, patch: Partial<Row>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)))
  const removeRow = (key: number) => {
    const snap = rows
    const r = rows.find(x => x.key === key)
    setRows(rs => rs.filter(x => x.key !== key))
    if (r) showToast(`${labelOf(r.type, r.gradeId)} נמחק`, () => setRows(snap))
  }

  // ── groups (days / approximate periods)
  const updateGroup = (patch: Partial<Group>) => setGroups(gs => gs.map(g => (g.key === group.key ? { ...g, ...patch } : g)))
  const setPrec = (prec: Prec) => {
    const [y, m] = group.date.split('-')
    const date = prec === 'year' ? `${y}-01-01` : prec === 'month' ? `${y}-${m}-01` : group.date
    updateGroup({ prec, date })
  }
  const addGroup = () => {
    const last = groups[groups.length - 1]
    const g: Group = { key: nextKey(), prec: last.prec, date: last.prec === 'day' ? nextDay(last.date) : last.date }
    setGroups(gs => [...gs, g])
    setSel(g.key)
  }
  const removeGroup = (key: number) => {
    if (groups.length < 2) return
    const snapG = groups, snapR = rows
    const n = rows.filter(r => r.group === key).length
    const rest = groups.filter(g => g.key !== key)
    setGroups(rest)
    setRows(rs => rs.filter(r => r.group !== key))
    if (sel === key) setSel(rest[rest.length - 1].key)
    showToast(n ? `הקבוצה ו-${n} מסלולים נמחקו` : 'הקבוצה נמחקה', () => { setGroups(snapG); setRows(snapR); setSel(key) })
  }

  // ── quick paste: "6a, 6b+ x2, 7a ✗, 6c 3ני Lucky Luke"
  const parsed = useMemo(() => {
    const all = [...grades].sort((a, b) => b.label.length - a.label.length)
    const out: { gradeId: number; label: string; name: string; ok: boolean; att: number }[] = []
    const bad: string[] = []
    pasteText.split(/[,\n،;]+/).map(s => s.trim()).filter(Boolean).forEach(part => {
      const g = all.find(x => part.toLowerCase().startsWith(x.label.toLowerCase()))
      if (!g) { bad.push(part); return }
      let rest = part.slice(g.label.length)
      let times = 1, ok = defOk, att = defAtt
      rest = rest.replace(/[x×]\s*(\d+)/i, (_, n) => { times = Math.min(30, Math.max(1, +n)); return '' })
      rest = rest.replace(/(\d+)\s*ני(סיונות)?/, (_, n) => { att = Math.max(1, +n); return '' })
      if (/✗|❌|(^|\s)לא(\s|$)/.test(rest)) { ok = false; rest = rest.replace(/✗|❌|(^|\s)לא(?=\s|$)/g, ' ') }
      rest = rest.replace(/[✓✔]/g, '').trim()
      for (let i = 0; i < times; i++) out.push({ gradeId: g.id, label: g.label, name: rest, ok, att })
    })
    return { out, bad }
  }, [pasteText, grades, defOk, defAtt])
  const addPasted = () => {
    const snap = rows
    const add = parsed.out.map(p => makeRow(p.gradeId, { name: p.name, ok: p.ok, att: p.att }))
    setRows(rs => [...rs, ...add])
    setPasteText('')
    setSaved(null)
    showToast(`נוספו ${add.length} מסלולים ל${groupName(group, groupIdx)}`, () => setRows(snap))
  }

  const addLocation = async (name: string) => {
    const n = name.trim()
    if (!n) return
    const { data, error: e } = await supabase
      .from('ClimbingLocations')
      .insert({ LocationName: n, LocationType: 'Outdoor', City: '', Country: '' })
      .select()
      .single()
    if (e || !data) { showToast('שגיאה בהוספת מיקום'); return }
    setLocations(ls => [...ls, data].sort((a, b) => a.LocationName.localeCompare(b.LocationName, 'he')))
    setLocationId(data.LocationID)
  }

  const save = async () => {
    if (!email || !rows.length || saving) return
    setSaving(true)
    setError('')
    try {
      const byKey = new Map(groups.map(g => [g.key, g]))
      const n = await addClimbingLogsBulk(email, rows.map(r => {
        const g = byKey.get(r.group)!
        return {
          ClimbType: r.type,
          GradeID: r.gradeId,
          RouteName: r.name.trim() || null,
          Attempts: r.att,
          Successful: r.ok,
          LogDateTime: `${g.date}T12:00:00`,
          DatePrecision: g.prec === 'day' ? null : g.prec,
          LocationID: locationId,
          BoardTypeID: r.type === 'Board' ? r.boardId : null,
        }
      }))
      setRows([])
      setSaved(n)
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? ''
      setError(/DatePrecision/.test(msg)
        ? 'חסר במסד הנתונים השדה DatePrecision. צריך להריץ את קובץ ה-SQL של הפיצ\'ר הזה ב-Supabase.'
        : `השמירה נכשלה${msg ? `: ${msg}` : ''}. שום מסלול לא אבד, אפשר לנסות שוב.`)
    } finally {
      setSaving(false)
    }
  }

  const back = () => {
    if (rows.length && !confirm('יש מסלולים שלא נשמרו. לצאת בלי לשמור?')) return
    router.push('/climbing-log')
  }

  const totalSent = rows.filter(r => r.ok).length
  const chip = (on: boolean) => `h-10 px-3.5 rounded-full border text-sm font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
    on ? 'border-accent text-fg ring-1 ring-accent bg-raised' : 'border-line-strong text-fg-2 bg-surface'}`
  const seg = (on: boolean) => `h-10 rounded-[10px] font-extrabold text-[15px] ${on ? 'bg-accent text-on-accent' : 'text-fg-2'}`
  const selectCls = 'h-11 rounded-lg bg-bg border border-line-strong px-2.5 text-base text-fg focus:outline-none focus:border-accent'

  if (!email) return <div className="p-6 text-center text-fg-3">אנא התחבר כדי להוסיף מסלולים</div>

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-6 flex flex-col gap-4" dir="rtl">
      <header className="flex items-start gap-3">
        <button type="button" onClick={back} aria-label="חזרה ליומן הטיפוס" className="w-10 h-10 shrink-0 grid place-items-center rounded-xl text-fg-3 hover:text-fg">
          <LuArrowRight aria-hidden className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-balance">הוספת טיול או היסטוריה</h1>
          <p className="text-fg-3 text-[15px] mt-0.5">בוחרים פעם אחת איפה, מה ומתי. לא זוכרים תאריך? מספיק חודש או שנה. אחר כך כל לחיצה על דירוג מוסיפה מסלול.</p>
        </div>
      </header>

      {loadError && <p className="text-danger text-sm">{loadError}</p>}

      {/* session: set once */}
      <section aria-label="פרטי הסשן" className="bg-raised border border-line-strong rounded-2xl p-3 flex flex-col gap-3">
        <LocationPicker
          locations={locations}
          value={locationId}
          onChange={setLocationId}
          onAddNew={addLocation}
          placeholder="איפה טיפסת? (לא חובה)"
          tone="large"
        />

        <div className="grid grid-cols-3 gap-1 bg-surface border border-line rounded-xl p-1" role="group" aria-label="סוג טיפוס">
          {TYPES.map(t => (
            <button key={t.key} type="button" aria-pressed={type === t.key} onClick={() => { setType(t.key); setPasteText('') }} className={seg(type === t.key)}>{t.label}</button>
          ))}
        </div>

        {type === 'Board' && boards.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="סוג בורד">
            {boards.map(b => (
              <button key={b.BoardID} type="button" aria-pressed={boardId === b.BoardID} onClick={() => setBoardId(boardId === b.BoardID ? null : b.BoardID)} className={chip(boardId === b.BoardID)}>{b.BoardName}</button>
            ))}
          </div>
        )}

        {/* groups: days or approximate periods */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="ימים או תקופות">
          {groups.map((g, i) => (
            <button key={g.key} type="button" aria-pressed={g.key === group.key} onClick={() => setSel(g.key)} className={chip(g.key === group.key)}>
              {groupName(g, i)} <small className="text-muted font-semibold tabular-nums">{whenText(g)}</small>
            </button>
          ))}
          <button type="button" onClick={addGroup} className="h-10 px-3.5 rounded-full border border-dashed border-line-strong text-accent text-sm font-bold whitespace-nowrap inline-flex items-center gap-1">
            <LuPlus aria-hidden className="w-4 h-4" />עוד יום או תקופה
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-1 bg-surface border border-line rounded-xl p-1" role="group" aria-label="כמה מדויק התאריך">
            {PRECS.map(p => (
              <button key={p.key} type="button" aria-pressed={group.prec === p.key} onClick={() => setPrec(p.key)} className={`h-9 rounded-[10px] font-bold text-[13px] ${group.prec === p.key ? 'bg-accent text-on-accent' : 'text-fg-2'}`}>{p.label}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {group.prec === 'day' ? (
              <input type="date" aria-label="תאריך" value={group.date} max={today()} onChange={e => e.target.value && updateGroup({ date: e.target.value })} className={selectCls} />
            ) : (
              <>
                {group.prec === 'month' && (
                  <select aria-label="חודש" value={+group.date.split('-')[1]} onChange={e => updateGroup({ date: `${group.date.slice(0, 4)}-${pad2(+e.target.value)}-01` })} className={selectCls}>
                    {MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
                  </select>
                )}
                <select aria-label="שנה" value={+group.date.slice(0, 4)} onChange={e => updateGroup({ date: group.prec === 'year' ? `${e.target.value}-01-01` : `${e.target.value}-${group.date.slice(5, 7)}-01` })} className={selectCls}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {groups.length > 1 && (
              <button type="button" onClick={() => removeGroup(group.key)} className="ms-auto h-9 px-3 rounded-lg text-sm text-muted hover:text-danger">מחק {groupName(group, groupIdx)}</button>
            )}
          </div>
          {group.prec !== 'day' && (
            <p className="text-[13px] text-muted">
              יישמר כתאריך משוער ({whenText(group)}), ולא ייחשב בדוחות החודשיים ובסטטיסטיקה של תקופה.
            </p>
          )}
        </div>

        <div className="flex gap-1.5 items-center flex-wrap text-sm text-muted" role="group" aria-label="ברירת מחדל למסלול חדש">
          <span>מסלול חדש:</span>
          <button type="button" aria-pressed={defOk} onClick={() => setDefOk(true)} className={`h-9 px-3 rounded-full border font-bold ${defOk ? 'bg-success/20 border-success text-fg' : 'border-line-strong text-fg-2 bg-surface'}`}>✓ טופס</button>
          <button type="button" aria-pressed={!defOk} onClick={() => setDefOk(false)} className={`h-9 px-3 rounded-full border font-bold ${!defOk ? 'bg-danger/20 border-danger text-fg' : 'border-line-strong text-fg-2 bg-surface'}`}>✗ לא טופס</button>
          <span className="ms-1">ניסיונות</span>
          <Stepper value={defAtt} onChange={setDefAtt} label="ניסיונות ברירת מחדל" />
        </div>
      </section>

      {/* grade pad */}
      <section aria-label="דירוגים" className="flex flex-col gap-2">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-2">
          {grades.map(g => {
            const n = counts.get(g.id)
            return (
              <button key={g.id} type="button" onClick={() => addGrade(g.id)} aria-label={`הוסף ${g.label}`}
                className="relative h-14 rounded-xl border border-line-strong bg-surface text-lg font-extrabold tabular-nums hover:border-accent active:bg-accent/30 transition-colors">
                {g.label}
                {n ? <span className="absolute -top-2 -start-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-accent text-on-accent text-xs grid place-items-center">{n}</span> : null}
              </button>
            )
          })}
          {!grades.length && !loadError && <p className="col-span-full text-muted text-sm">טוען דירוגים...</p>}
        </div>
        <p className="text-[13px] text-muted">לחיצה = מסלול נוסף ב{groupName(group, groupIdx)}. שם, טופס או לא, וניסיונות אפשר לשנות בשורה עצמה.</p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={dupLast} className="h-10 px-3.5 rounded-xl border border-line-strong bg-surface text-fg-2 text-sm font-bold inline-flex items-center gap-1.5">
            <LuCopy aria-hidden className="w-4 h-4" />שכפל אחרון
          </button>
          <button type="button" onClick={() => setPasteOpen(o => !o)} aria-expanded={pasteOpen} className="h-10 px-3.5 rounded-xl border border-accent text-accent bg-surface text-sm font-bold inline-flex items-center gap-1.5">
            <LuClipboardPaste aria-hidden className="w-4 h-4" />הדבקה מהירה
          </button>
        </div>
      </section>

      {pasteOpen && (
        <section aria-label="הדבקה מהירה" className="bg-surface border border-line rounded-2xl p-3 flex flex-col gap-2">
          <label htmlFor="paste" className="text-xs font-extrabold text-muted">כל מסלול בשורה או מופרד בפסיק ({TYPES.find(t => t.key === type)!.label})</label>
          <textarea id="paste" value={pasteText} onChange={e => setPasteText(e.target.value)} rows={3} dir="auto"
            placeholder={type === 'Lead' ? '6a, 6b+ x2, 7a ✗, 6c Lucky Luke' : 'V3, V4 x3, V5 לא, V6 2ני'}
            className="min-h-[84px] rounded-lg bg-raised border-2 border-line-strong p-2.5 text-base leading-relaxed focus:outline-none focus:border-accent resize-y" />
          <p className="text-[13px] text-muted">x2 = פעמיים · ✗ או &quot;לא&quot; = לא טופס · 3ני = 3 ניסיונות · מה שאחרי הדירוג = שם המסלול</p>
          {(parsed.out.length > 0 || parsed.bad.length > 0) && (
            <p className="text-sm text-fg-2">
              <b className="text-success">{parsed.out.length}</b> מסלולים: {parsed.out.map(p => p.label + (p.ok ? '' : '✗')).join(' · ')}
              {parsed.bad.length > 0 && <><br /><span className="text-danger">לא זוהה: {parsed.bad.join(', ')}</span></>}
            </p>
          )}
          <div>
            <button type="button" disabled={!parsed.out.length} onClick={addPasted} className="btn-primary disabled:opacity-45">הוסף ל{groupName(group, groupIdx)}</button>
          </div>
        </section>
      )}

      {saved !== null && !rows.length && (
        <div role="status" className="bg-success/15 border border-success rounded-2xl p-3 flex items-center gap-3 flex-wrap">
          <LuCheck aria-hidden className="w-5 h-5 text-success" />
          <span className="font-bold">נשמרו {saved} מסלולים ביומן.</span>
          <button type="button" onClick={() => router.push('/climbing-log')} className="ms-auto btn-ghost min-h-10 px-4 text-sm">ליומן הטיפוס</button>
        </div>
      )}

      {/* routes by group */}
      <section aria-label="מסלולים שנוספו" className="flex flex-col gap-3">
        {groups.map((g, i) => {
          const rs = rows.filter(r => r.group === g.key)
          const mixed = new Set(rs.map(r => r.type)).size > 1 || (rs[0] && rs[0].type !== type)
          return (
            <div key={g.key} className={`border rounded-2xl bg-surface overflow-hidden ${g.key === group.key ? 'border-line-strong' : 'border-line'}`}>
              <button type="button" onClick={() => setSel(g.key)} className="w-full flex items-baseline gap-2 px-3 py-2.5 border-b border-line text-start">
                <b className="text-[15px]">{groupName(g, i)}</b>
                <span className="text-muted text-[13px] tabular-nums">{whenText(g)}{location ? ` · ${location.LocationName}` : ''}</span>
                {g.prec !== 'day' && <span className="text-[11px] font-extrabold text-accent border border-accent/55 rounded-full px-2">משוער</span>}
                <span className="ms-auto text-muted text-[13px]">{rs.length} מסלולים · {rs.filter(r => r.ok).length} טופסו</span>
              </button>
              {rs.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted">עוד אין מסלולים כאן. בחר את הקבוצה למעלה ולחץ על דירוג.</p>
              ) : (
                rs.slice().reverse().map(r => (
                  <div key={r.key} className={`grid grid-cols-[3.25rem_minmax(0,1fr)_auto_auto_auto] max-sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] gap-2 items-center px-3 py-2 border-b border-line last:border-b-0 ${r.key === lastAdded ? 'bg-accent/10' : ''}`}>
                    <span className="font-extrabold text-lg tabular-nums leading-tight">
                      {labelOf(r.type, r.gradeId)}
                      {mixed && <small className="block text-[11px] text-muted font-bold">{TYPES.find(t => t.key === r.type)!.label}</small>}
                    </span>
                    <input value={r.name} onChange={e => updateRow(r.key, { name: e.target.value })} placeholder="שם מסלול (לא חובה)" aria-label={`שם המסלול ${labelOf(r.type, r.gradeId)}`}
                      className="min-w-0 h-9 rounded-lg border border-transparent bg-transparent px-2 text-base placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:bg-raised focus:outline-none" />
                    <button type="button" onClick={() => updateRow(r.key, { ok: !r.ok })} aria-label={r.ok ? 'טופס, לחץ לשינוי' : 'לא טופס, לחץ לשינוי'}
                      className={`w-9 h-9 rounded-lg border bg-raised font-extrabold ${r.ok ? 'text-success border-success/60' : 'text-danger border-danger/60'}`}>{r.ok ? '✓' : '✗'}</button>
                    <div className="max-sm:col-start-2 max-sm:row-start-2 max-sm:justify-self-start">
                      <Stepper value={r.att} onChange={v => updateRow(r.key, { att: v })} label="ניסיונות" />
                    </div>
                    <button type="button" onClick={() => removeRow(r.key)} aria-label={`מחק מסלול ${labelOf(r.type, r.gradeId)}`} className="w-8 h-8 grid place-items-center rounded-lg text-faint hover:text-danger max-sm:col-start-4 max-sm:row-start-1">
                      <LuX aria-hidden className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </section>

      {error && <p role="alert" className="text-danger text-sm">{error}</p>}

      {/* save bar, above the coach footer / tab bar */}
      <div className="sticky bottom-[calc(8rem+env(safe-area-inset-bottom))] md:bottom-[5.5rem] z-10 bg-surface border border-line rounded-xl p-2.5 flex items-center gap-3">
        <div className="flex-1 min-w-0 text-sm text-muted">
          <b className="text-fg text-lg tabular-nums">{rows.length}</b> מסלולים · {totalSent} טופסו · {groups.length} {groups.every(g => g.prec === 'day') ? 'ימים' : 'קבוצות'}
          {location ? ` · ${location.LocationName}` : ''}
        </div>
        <button type="button" onClick={save} disabled={!rows.length || saving} className="btn-primary disabled:opacity-45">
          {saving ? 'שומר...' : 'שמור הכול'}
        </button>
      </div>

      {toast && createPortal(
        <div role="status" className="fixed z-[120] left-1/2 -translate-x-1/2 bottom-[calc(13rem+env(safe-area-inset-bottom))] md:bottom-40 bg-fg text-bg rounded-full ps-4 pe-1.5 py-1.5 flex items-center gap-3 text-[15px] font-bold whitespace-nowrap shadow-lg max-w-[94vw]">
          <span className="truncate">{toast.text}</span>
          {toast.undo ? (
            <button type="button" onClick={() => { toast.undo?.(); setToast(null) }} className="h-9 px-4 rounded-full bg-bg text-fg font-extrabold">ביטול</button>
          ) : <span className="w-1" />}
        </div>,
        document.body,
      )}
    </div>
  )
}

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="פחות" className="w-8 h-8 rounded-lg border border-line-strong bg-raised grid place-items-center">
        <LuMinus aria-hidden className="w-4 h-4" />
      </button>
      <span className="min-w-[1.6rem] text-center font-extrabold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="יותר" className="w-8 h-8 rounded-lg border border-line-strong bg-raised grid place-items-center">
        <LuPlus aria-hidden className="w-4 h-4" />
      </button>
    </div>
  )
}
