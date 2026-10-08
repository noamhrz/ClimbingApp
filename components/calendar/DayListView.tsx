'use client'

import { useState, useEffect } from 'react'
import moment from 'moment-timezone'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LuCircleCheck, LuBatteryLow, LuCircleX, LuHourglass, LuTimer, LuList, LuCalendar, LuHouse, LuSunMedium, LuClock } from 'react-icons/lu'

interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  completed: boolean
  color: string
  WorkoutID: number
  Deloading?: boolean
  DeloadingPercentage?: number | null
  StartTime?: string | Date
  Order?: number | null
  EstimatedTotalTime?: number | null
}

interface Props {
  events: CalendarEvent[]
  date: Date
  onEventClick: (event: CalendarEvent) => void
  onNavigate: (newDate: Date) => void
  onBackToMonth: () => void
  onReorder?: (orderedIds: number[]) => void
  pendingIds?: Set<number>
  isDesktop?: boolean
}

function getEventColor(event: CalendarEvent): string {
  const now = new Date()
  if (event.completed) return '#5FB37A'
  if (event.Deloading) return '#7FB0C9'
  if (new Date(event.end) < now) return '#E06A5F'
  return '#E0763A'
}

function EventCardBody({ event, index }: { event: CalendarEvent; index: number }) {
  const color = getEventColor(event)
  return (
    <>
      <div
        className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-on-accent font-bold text-lg shadow-lg"
        style={{ backgroundColor: color }}
      >
        {index + 1}
      </div>
      <div className="space-y-3 pr-4">
        <h3 className="text-xl font-bold text-fg">{event.title}</h3>
        <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2 border w-fit">
          <LuTimer aria-hidden className="w-5 h-5 shrink-0" />
          <span className="text-base font-semibold text-fg-2">
            {event.EstimatedTotalTime != null
              ? event.EstimatedTotalTime
              : Math.abs(moment(event.end).diff(moment(event.start), 'minutes'))} דק'
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {event.completed && (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-success/15 text-success rounded-lg text-sm font-bold">
              <LuCircleCheck aria-hidden className="w-5 h-5 shrink-0" /><span>הושלם</span>
            </span>
          )}
          {event.Deloading && !event.completed && (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-info/10 text-info rounded-lg text-sm font-bold">
              <LuBatteryLow aria-hidden className="w-5 h-5 shrink-0" /><span>דילודינג {event.DeloadingPercentage}%</span>
            </span>
          )}
          {!event.completed && !event.Deloading && new Date(event.end) < new Date() && (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-danger/15 text-danger rounded-lg text-sm font-bold">
              <LuCircleX aria-hidden className="w-5 h-5 shrink-0" /><span>פספס</span>
            </span>
          )}
          {!event.completed && !event.Deloading && new Date(event.end) >= new Date() && (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent rounded-lg text-sm font-bold">
              <LuHourglass aria-hidden className="w-5 h-5 shrink-0" /><span>ממתין</span>
            </span>
          )}
        </div>
      </div>
    </>
  )
}

function SortableEventCard({
  event,
  index,
  onEventClick,
  isPending,
}: {
  event: CalendarEvent
  index: number
  onEventClick: (event: CalendarEvent) => void
  isPending: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: event.id })
  const color = getEventColor(event)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderRightColor: color,
      }}
      className={`group relative bg-surface rounded-xl p-6 pl-10 border-r-8 transition-shadow cursor-pointer
 ${isDragging ? 'opacity-50 shadow-xl z-50' : ''}
 ${isPending ? 'border-dashed opacity-80' : ''}
 `}
      onClick={() => onEventClick(event)}
    >
      <div
        className="absolute top-1/2 -translate-y-1/2 left-2 w-6 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-faint hover:text-muted select-none touch-none"
        {...listeners}
        {...attributes}
        onClick={e => e.stopPropagation()}
      >
        <span className="text-lg">⠿</span>
      </div>

      <EventCardBody event={event} index={index} />

      <div className="absolute top-4 left-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="px-3 py-1 bg-accent text-on-accent rounded-lg text-xs font-medium">
          לחץ להתחלה
        </div>
      </div>
    </div>
  )
}

export default function DayListView({
  events,
  date,
  onEventClick,
  onNavigate,
  onBackToMonth,
  onReorder,
  pendingIds,
  isDesktop,
}: Props) {
  const [sortedEvents, setSortedEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    const selectedDate = moment(date).format('YYYY-MM-DD')
    const filtered = events
      .filter(e => moment(e.start).format('YYYY-MM-DD') === selectedDate)
      .sort((a, b) => {
        const aOrder = a.Order ?? 0
        const bOrder = b.Order ?? 0
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.start.getTime() - b.start.getTime()
      })
    setSortedEvents(filtered)
  }, [events, date])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent
    if (!over || active.id === over.id) return
    const oldIndex = sortedEvents.findIndex(e => e.id === active.id)
    const newIndex = sortedEvents.findIndex(e => e.id === over.id)
    const reordered = arrayMove(sortedEvents, oldIndex, newIndex)
    setSortedEvents(reordered)
    onReorder?.(reordered.map(e => e.id))
  }

  const goToPrevDay = () => onNavigate(moment(date).subtract(1, 'day').toDate())
  const goToNextDay = () => onNavigate(moment(date).add(1, 'day').toDate())
  const goToToday = () => onNavigate(new Date())
  const isToday = moment(date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') e.preventDefault()
      if (e.key === 'ArrowRight') goToNextDay()
      if (e.key === 'ArrowLeft') goToPrevDay()
      if (e.key === 'm' || e.key === 'M') onBackToMonth()
      if (e.key === 't' || e.key === 'T') goToToday()
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [date])

  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }
    const handleTouchEnd = (e: TouchEvent) => {
      const diffX = touchStartX - e.changedTouches[0].clientX
      const diffY = touchStartY - e.changedTouches[0].clientY
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) goToPrevDay()
        else goToNextDay()
      }
      if (diffY < -50 && Math.abs(diffY) > Math.abs(diffX)) onBackToMonth()
    }
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [date])

  return (
    <div className="bg-surface rounded-xl ">
      {/* Floating Navigation Buttons */}
      <div className="fixed bottom-32 right-6 z-40 flex flex-col gap-2">
        <button
          onClick={goToPrevDay}
          className="w-14 h-14 bg-accent hover:bg-accent-hover text-on-accent rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
          title="יום קודם (←)"
        >
          →
        </button>
        <button
          onClick={goToNextDay}
          className="w-14 h-14 bg-accent hover:bg-accent-hover text-on-accent rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
          title="יום הבא (→)"
        >
          ←
        </button>
        <button
          onClick={onBackToMonth}
          className="w-14 h-14 bg-info hover:bg-info text-on-accent rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
          title="חזרה לחודש (M)"
          aria-label="חזרה לחודש"
        >
          <LuCalendar aria-hidden className="w-6 h-6" />
        </button>
        {!isToday && (
          <button
            onClick={goToToday}
            className="w-14 h-14 bg-success hover:bg-success/90 text-on-accent rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
            title="קפיצה להיום (T)"
            aria-label="קפיצה להיום"
          >
            <LuHouse aria-hidden className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Header with Navigation */}
      <div className="sticky top-0 bg-surface border-b px-6 py-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevDay}
            className="p-3 hover:bg-surface rounded-lg transition-colors active:bg-raised"
          >
            <span className="text-3xl">→</span>
          </button>

          <div className="text-center">
            <div className={`text-5xl font-bold mb-2 ${isToday ? 'text-warning' : 'text-fg'}`}>
              {moment(date).format('D')}
            </div>
            <h2 className="text-2xl font-bold text-fg">{moment(date).format('dddd')}</h2>
            <p className="text-sm text-muted mt-1">{moment(date).format('MMMM YYYY')}</p>
            {isToday && (
              <div className="mt-2 inline-block px-3 py-1 bg-warning text-on-accent rounded-full text-xs font-bold">
                היום
              </div>
            )}
          </div>

          <button
            onClick={goToNextDay}
            className="p-3 hover:bg-surface rounded-lg transition-colors active:bg-raised"
          >
            <span className="text-3xl">←</span>
          </button>
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={onBackToMonth}
            className="inline-flex items-center gap-1.5 min-h-11 px-4 bg-info/10 hover:bg-info/20 text-info rounded-full transition-colors text-sm font-medium"
          >
            <LuCalendar aria-hidden className="w-4 h-4 shrink-0" />חזרה לחודש
          </button>
          {!isToday && (
            <button
              onClick={goToToday}
              className="inline-flex items-center gap-1.5 min-h-11 px-4 bg-success/15 hover:bg-success/25 text-success rounded-full transition-colors text-sm font-medium"
            >
              <LuHouse aria-hidden className="w-4 h-4 shrink-0" />קפיצה להיום
            </button>
          )}
        </div>

        <div className="text-center mt-4">
          <div className="inline-flex items-center gap-3 flex-wrap justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface text-fg-2 rounded-full text-sm font-medium">
              <LuList aria-hidden className="w-4 h-4 shrink-0" />
              <span>{sortedEvents.length} אימונים</span>
            </span>
            {sortedEvents.length > 0 && (() => {
              const totalMinutes = sortedEvents.reduce((sum, e) =>
                sum + (e.EstimatedTotalTime != null
                  ? e.EstimatedTotalTime
                  : Math.abs(moment(e.end).diff(moment(e.start), 'minutes'))), 0)
              const hours = Math.floor(totalMinutes / 60)
              const mins = totalMinutes % 60
              const label = hours > 0
                ? (mins > 0 ? `${hours}ש' ${mins}ד'` : `${hours}ש'`)
                : `${mins} דק'`
              return (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-info/10 text-info rounded-full text-sm font-medium">
                  <LuTimer aria-hidden className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </span>
              )
            })()}
            {sortedEvents.filter(e => e.completed).length > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-success/15 text-success rounded-full text-sm font-medium">
                <LuCircleCheck aria-hidden className="w-4 h-4 shrink-0" />
                <span>{sortedEvents.filter(e => e.completed).length} הושלמו</span>
              </span>
            )}
            {sortedEvents.filter(e => !e.completed && new Date(e.end) < new Date()).length > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-danger/15 text-danger rounded-full text-sm font-medium">
                <LuCircleX aria-hidden className="w-4 h-4 shrink-0" />
                <span>{sortedEvents.filter(e => !e.completed && new Date(e.end) < new Date()).length} פספסו</span>
              </span>
            )}
            {sortedEvents.filter(e => !e.completed && new Date(e.end) >= new Date()).length > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent rounded-full text-sm font-medium">
                <LuHourglass aria-hidden className="w-4 h-4 shrink-0" />
                <span>{sortedEvents.filter(e => !e.completed && new Date(e.end) >= new Date()).length} ממתינים</span>
              </span>
            )}
          </div>
        </div>

        <div className="text-center mt-3 text-xs text-faint">
          {isDesktop
            ? '💡 קיצורי מקלדת: ← → (ימים) | M (חודש) | T (היום) | גרור אימונים לשינוי סדר'
            : '💡 קיצורי מקלדת: ← → (ימים) | M (חודש) | T (היום)'}
        </div>
      </div>

      {/* Events List */}
      <div className="p-6">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-16">
            <LuSunMedium aria-hidden className="w-20 h-20 mx-auto mb-6 text-warning" strokeWidth={1.25} />
            <h3 className="text-2xl font-bold text-fg-2 mb-2">יום מנוחה</h3>
            <p className="text-muted">אין אימונים מתוכננים היום</p>
            <p className="text-faint text-sm mt-2">תהנה מהיום החופשי! 😊</p>
          </div>
        ) : isDesktop && onReorder ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedEvents.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4 max-w-3xl mx-auto">
                {sortedEvents.map((event, index) => (
                  <SortableEventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onEventClick={onEventClick}
                    isPending={pendingIds?.has(event.id) ?? false}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {sortedEvents.map((event, index) => {
              const color = getEventColor(event)
              const isPending = pendingIds?.has(event.id) ?? false
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`group relative bg-surface rounded-xl p-6 transition-all cursor-pointer border-r-8 active:bg-surface hover:translate-x-[-4px] ${isPending ? 'border-dashed opacity-80' : ''}`}
                  style={{ borderRightColor: color }}
                >
                  <div
                    className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-on-accent font-bold text-lg shadow-lg"
                    style={{ backgroundColor: color }}
                  >
                    {index + 1}
                  </div>
                  <div className="space-y-3 pr-4">
                    <h3 className="text-xl font-bold text-fg">{event.title}</h3>
                    <div className="flex items-center gap-3 bg-surface rounded-lg p-3 border">
                      <LuClock aria-hidden className="w-6 h-6 shrink-0 text-muted" />
                      <div className="flex items-center gap-2 text-lg font-semibold text-fg-2">
                        <span>{moment(event.start).format('HH:mm')}</span>
                        <span className="text-faint">→</span>
                        <span>{moment(event.end).format('HH:mm')}</span>
                      </div>
                      <span className="text-sm text-muted mr-auto">
                        ({Math.abs(moment(event.end).diff(moment(event.start), 'minutes'))} דק')
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {event.completed && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-success/15 text-success rounded-lg text-sm font-bold">
                          <LuCircleCheck aria-hidden className="w-5 h-5 shrink-0" /><span>הושלם</span>
                        </span>
                      )}
                      {event.Deloading && !event.completed && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-info/10 text-info rounded-lg text-sm font-bold">
                          <LuBatteryLow aria-hidden className="w-5 h-5 shrink-0" /><span>דילודינג {event.DeloadingPercentage}%</span>
                        </span>
                      )}
                      {!event.completed && !event.Deloading && new Date(event.end) < new Date() && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-danger/15 text-danger rounded-lg text-sm font-bold">
                          <LuCircleX aria-hidden className="w-5 h-5 shrink-0" /><span>פספס</span>
                        </span>
                      )}
                      {!event.completed && !event.Deloading && new Date(event.end) >= new Date() && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent rounded-lg text-sm font-bold">
                          <LuHourglass aria-hidden className="w-5 h-5 shrink-0" /><span>ממתין</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-3 py-1 bg-accent text-on-accent rounded-lg text-xs font-medium">
                      לחץ להתחלה
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {sortedEvents.length > 0 && (
        <div className="border-t p-6 bg-surface">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-fg-2 mb-4 text-center">סיכום היום</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-surface rounded-lg ">
                <div className="text-3xl font-bold text-fg-2 mb-1">{sortedEvents.length}</div>
                <div className="text-sm text-fg-3">סה"כ</div>
              </div>
              <div className="text-center p-4 bg-surface rounded-lg ">
                <div className="text-3xl font-bold text-success mb-1">
                  {sortedEvents.filter(e => e.completed).length}
                </div>
                <div className="text-sm text-fg-3">הושלמו</div>
              </div>
              <div className="text-center p-4 bg-surface rounded-lg ">
                <div className="text-3xl font-bold text-danger mb-1">
                  {sortedEvents.filter(e => !e.completed && new Date(e.end) < new Date()).length}
                </div>
                <div className="text-sm text-fg-3">פספסו</div>
              </div>
              <div className="text-center p-4 bg-surface rounded-lg ">
                <div className="text-3xl font-bold text-accent mb-1">
                  {sortedEvents.filter(e => !e.completed && new Date(e.end) >= new Date()).length}
                </div>
                <div className="text-sm text-fg-3">ממתינים</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden text-center py-4 text-xs text-faint">
        💡 החלק ימינה/שמאלה למעבר בין ימים | החלק למטה לחודש
      </div>
    </div>
  )
}
