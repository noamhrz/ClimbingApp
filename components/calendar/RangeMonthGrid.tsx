'use client'

// Phone: a compact month grid for marking a range (the whole month fits on screen).
// Each day shows its number and a dot per workout; tap the start day, then the end day.

import moment from 'moment-timezone'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

interface GridEvent { start: Date; completed?: boolean | null; Deloading?: boolean | null; free?: boolean }

interface Props {
  month: Date
  onMonth: (d: Date) => void
  events: GridEvent[]
  from: string | null
  to: string | null
  preview: Set<string>
  onTap: (day: string) => void
}

const DOW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export default function RangeMonthGrid({ month, onMonth, events, from, to, preview, onTap }: Props) {
  const m = moment(month)
  const first = m.clone().startOf('month').startOf('week')
  const last = m.clone().endOf('month').endOf('week')
  const days: moment.Moment[] = []
  for (const d = first.clone(); d.isSameOrBefore(last, 'day'); d.add(1, 'day')) days.push(d.clone())

  const byDay = new Map<string, GridEvent[]>()
  events.forEach(e => {
    const k = moment(e.start).format('YYYY-MM-DD')
    byDay.set(k, [...(byDay.get(k) ?? []), e])
  })
  const lo = from, hi = to ?? from
  const today = moment().format('YYYY-MM-DD')

  return (
    <div data-flow className="bg-surface rounded-xl border border-line p-2" dir="rtl">
      <div className="flex items-center justify-between px-1 pb-2">
        <button type="button" onClick={() => onMonth(m.clone().subtract(1, 'month').toDate())} aria-label="חודש קודם" className="w-11 h-11 grid place-items-center rounded-xl text-fg-2">
          <LuChevronRight aria-hidden className="w-6 h-6" />
        </button>
        <b className="text-lg">{MONTHS[m.month()]} {m.year()}</b>
        <button type="button" onClick={() => onMonth(m.clone().add(1, 'month').toDate())} aria-label="חודש הבא" className="w-11 h-11 grid place-items-center rounded-xl text-fg-2">
          <LuChevronLeft aria-hidden className="w-6 h-6" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted font-bold pb-1">
        {DOW.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const k = d.format('YYYY-MM-DD')
          const evs = byDay.get(k) ?? []
          const inRange = !!(lo && hi && k >= lo && k <= hi)
          const edge = k === lo || k === hi
          const out = d.month() !== m.month()
          const prev = preview.has(k)
          return (
            <button
              key={k}
              type="button"
              onClick={() => onTap(k)}
              aria-label={`${d.format('DD/MM')}${evs.length ? `, ${evs.length} אימונים` : ''}`}
              aria-pressed={inRange}
              className={`relative h-11 rounded-lg flex flex-col items-center justify-start pt-1 gap-0.5 border transition-colors ${
                edge ? 'border-accent bg-accent text-on-accent'
                : inRange ? 'border-accent/40 bg-accent/20 text-fg'
                : prev ? 'border-info/60 bg-info/15 text-fg'
                : 'border-transparent bg-bg text-fg-2'
              } ${out && !inRange ? 'opacity-45' : ''}`}
            >
              <span className={`text-[15px] font-bold tabular-nums leading-none ${k === today && !edge ? 'underline underline-offset-4 decoration-accent' : ''}`}>{d.date()}</span>
              {evs.length > 0 && (
                <span className="flex gap-0.5 flex-wrap justify-center max-w-[90%]" aria-hidden>
                  {evs.slice(0, 4).map((e, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                      edge ? 'bg-on-accent' : e.free ? 'bg-free' : e.completed ? 'bg-success' : e.Deloading ? 'bg-info' : 'bg-accent'
                    }`} />
                  ))}
                  {evs.length > 4 && <span className="text-[9px] leading-none font-bold">+</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3 justify-center pt-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent" />מתוכנן</span>
        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" />בוצע</span>
        <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-info" />דילודינג</span>
        {preview.size > 0 && <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded border border-info/60 bg-info/15" />יעד השכפול</span>}
      </div>
    </div>
  )
}
