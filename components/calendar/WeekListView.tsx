'use client'

// Week view: one week at a glance, between the day list and the month grid.
// Desktop: 7 columns (Sunday on the right, RTL). Phone: the 7 days stacked.
// Tap a workout → same handler as everywhere (menu / bonus mode); tap a day header → that day.
import moment from 'moment-timezone'
import { LuChevronLeft, LuChevronRight, LuCircleCheck, LuStar } from 'react-icons/lu'
import { getEventColor } from './DayListView'

interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  completed: boolean
  color: string
  WorkoutID: number
  Deloading?: boolean
  Order?: number | null
  EstimatedTotalTime?: number | null
  ActualMinutes?: number | null
  free?: boolean
  bonus?: boolean
}

interface Props {
  events: CalendarEvent[]
  date: Date
  isDesktop?: boolean
  onEventClick: (event: CalendarEvent) => void
  onNavigate: (d: Date) => void
  /** tap on a day header / empty day */
  onDayClick: (d: Date) => void
  /** "pick a day" mode for adding a workout */
  selecting?: boolean
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export default function WeekListView({ events, date, isDesktop, onEventClick, onNavigate, onDayClick, selecting }: Props) {
  const start = moment(date).startOf('week')
  const days = Array.from({ length: 7 }, (_, i) => start.clone().add(i, 'days'))
  const today = moment()

  const byDay = days.map(d =>
    events
      .filter(e => moment(e.start).isSame(d, 'day'))
      .sort((a, b) => (a.Order ?? 999) - (b.Order ?? 999) || a.start.getTime() - b.start.getTime()),
  )
  const weekEvents = byDay.flat()
  const main = weekEvents.filter(e => !e.bonus && !e.free)
  const done = main.filter(e => e.completed).length
  const extra = weekEvents.filter(e => (e.bonus || e.free) && e.completed).length
  const minutes = weekEvents.reduce((s, e) => s + (e.completed ? (e.ActualMinutes ?? e.EstimatedTotalTime ?? 0) : 0), 0)

  const end = start.clone().add(6, 'days')
  const label = start.month() === end.month()
    ? `${start.format('D')}–${end.format('D/M/YYYY')}`
    : `${start.format('D/M')}–${end.format('D/M/YYYY')}`
  const isThisWeek = today.isSame(start, 'week')

  const chip = (e: CalendarEvent) => (
    <button
      key={e.id}
      type="button"
      onClick={ev => { ev.stopPropagation(); onEventClick(e) }}
      className="w-full text-right rounded-lg px-2.5 py-2 text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-transform flex items-start gap-1.5 min-h-10"
      style={{ backgroundColor: getEventColor(e as Parameters<typeof getEventColor>[0]) }}
    >
      {e.completed && <LuCircleCheck aria-hidden className="w-4 h-4 shrink-0 mt-0.5" />}
      {e.bonus && <LuStar aria-hidden className="w-4 h-4 shrink-0 mt-0.5 fill-white" />}
      <span className="min-w-0 break-words leading-snug">{e.title}</span>
    </button>
  )

  return (
    <div className="space-y-3">
      {/* header: → previous week, ← next week (same as the day view) */}
      <div className="flex items-center gap-2">
        <button type="button" aria-label="שבוע קודם" onClick={() => onNavigate(start.clone().subtract(1, 'week').toDate())}
          className="w-11 h-11 rounded-full border border-line-strong bg-surface hover:bg-raised flex items-center justify-center shrink-0">
          <LuChevronRight aria-hidden className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div className="font-bold text-fg tabular-nums" dir="ltr">{label}</div>
          <div className="text-xs text-muted tabular-nums">
            {main.length > 0 ? `${done}/${main.length} אימונים בוצעו` : 'אין אימונים מתוכננים'}
            {extra > 0 && ` · +${extra} בונוס/חופשי`}
            {minutes > 0 && ` · ${minutes} דק'`}
          </div>
        </div>
        <button type="button" aria-label="שבוע הבא" onClick={() => onNavigate(start.clone().add(1, 'week').toDate())}
          className="w-11 h-11 rounded-full border border-line-strong bg-surface hover:bg-raised flex items-center justify-center shrink-0">
          <LuChevronLeft aria-hidden className="w-5 h-5" />
        </button>
      </div>
      {!isThisWeek && (
        <div className="text-center -mt-1">
          <button type="button" onClick={() => onNavigate(new Date())} className="text-sm font-semibold text-accent hover:underline">חזרה לשבוע הנוכחי</button>
        </div>
      )}

      {isDesktop ? (
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            const isToday = d.isSame(today, 'day')
            return (
              <div
                key={i}
                onClick={() => onDayClick(d.toDate())}
                className={`min-h-[320px] rounded-xl border p-2 flex flex-col gap-2 cursor-pointer transition-colors ${
                  isToday ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:bg-raised'
                } ${selecting ? 'hover:ring-2 hover:ring-accent' : ''}`}
              >
                <div className="text-center pb-1 border-b border-line">
                  <div className={`text-xs ${isToday ? 'text-accent font-bold' : 'text-muted'}`}>{DAY_NAMES[i]}</div>
                  <div className={`text-lg font-bold tabular-nums ${isToday ? 'text-accent' : 'text-fg'}`}>{d.format('D/M')}</div>
                </div>
                {byDay[i].map(chip)}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {days.map((d, i) => {
            const isToday = d.isSame(today, 'day')
            const list = byDay[i]
            return (
              <div
                key={i}
                onClick={() => onDayClick(d.toDate())}
                className={`rounded-xl border p-2.5 flex gap-3 cursor-pointer ${
                  isToday ? 'border-accent bg-accent/5' : 'border-line bg-surface'
                } ${selecting ? 'ring-1 ring-accent/40' : ''}`}
              >
                <div className="w-12 shrink-0 text-center pt-0.5">
                  <div className={`text-xs ${isToday ? 'text-accent font-bold' : 'text-muted'}`}>{DAY_NAMES[i]}</div>
                  <div className={`text-lg font-bold tabular-nums leading-tight ${isToday ? 'text-accent' : 'text-fg'}`}>{d.format('D/M')}</div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
                  {list.length ? list.map(chip) : <span className="text-sm text-muted py-2">מנוחה</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
