// components/calendar/WeekListView.tsx
// WEEK LIST VIEW - Events grouped by day

'use client'

import moment from 'moment-timezone'
import { useState } from 'react'

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
}

interface Props {
  events: CalendarEvent[]
  date: Date
  onEventClick: (event: CalendarEvent) => void
  onEventDelete: (id: number) => void
  onEventLongPress: (event: CalendarEvent, position: { x: number; y: number }) => void
}

export default function WeekListView({ events, date, onEventClick, onEventDelete, onEventLongPress }: Props) {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  // Get week start and end
  const weekStart = moment(date).startOf('week')
  const weekEnd = moment(date).endOf('week')

  // Group events by day
  const eventsByDay = new Map<string, CalendarEvent[]>()
  
  for (let d = weekStart.clone(); d.isSameOrBefore(weekEnd); d.add(1, 'day')) {
    const dateKey = d.format('YYYY-MM-DD')
    eventsByDay.set(dateKey, [])
  }

  events.forEach(event => {
    const eventDate = moment(event.start)
    if (eventDate.isBetween(weekStart, weekEnd, 'day', '[]')) {
      const dateKey = eventDate.format('YYYY-MM-DD')
      const dayEvents = eventsByDay.get(dateKey) || []
      dayEvents.push(event)
      eventsByDay.set(dateKey, dayEvents)
    }
  })

  // Sort events within each day
  eventsByDay.forEach((dayEvents) => {
    dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
  })

  const handleTouchStart = (event: CalendarEvent, e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      const touch = e.touches[0]
      onEventLongPress(event, { x: touch.clientX, y: touch.clientY })
    }, 500)
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const getEventColor = (event: CalendarEvent) => {
    if (event.completed) return 'bg-green-500'
    if (event.Deloading) return 'bg-cyan-500'
    return 'bg-blue-500'
  }

  const isToday = (dateKey: string) => {
    return dateKey === moment().format('YYYY-MM-DD')
  }

  const totalEvents = events.filter(e => {
    const eventDate = moment(e.start)
    return eventDate.isBetween(weekStart, weekEnd, 'day', '[]')
  }).length

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          שבוע {weekStart.format('D MMM')} - {weekEnd.format('D MMM YYYY')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {totalEvents} אימונים מתוכננים
        </p>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {Array.from(eventsByDay.entries()).map(([dateKey, dayEvents]) => {
          const dayDate = moment(dateKey)
          const today = isToday(dateKey)

          return (
            <div
              key={dateKey}
              className={`rounded-lg border-2 overflow-hidden ${
                today ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Day Header */}
              <div className={`px-4 py-3 ${
                today ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl font-bold ${today ? 'text-gray-900' : 'text-gray-400'}`}>
                      {dayDate.format('D')}
                    </div>
                    <div>
                      <div className={`font-bold ${today ? 'text-gray-900' : 'text-gray-700'}`}>
                        {dayDate.format('dddd')}
                      </div>
                      <div className={`text-xs ${today ? 'text-gray-700' : 'text-gray-500'}`}>
                        {dayDate.format('MMMM YYYY')}
                      </div>
                    </div>
                    {today && (
                      <span className="px-2 py-1 bg-white text-yellow-700 rounded-full text-xs font-bold">
                        היום
                      </span>
                    )}
                  </div>
                  <div className={`text-sm font-medium ${today ? 'text-gray-900' : 'text-gray-600'}`}>
                    {dayEvents.length} אימונים
                  </div>
                </div>
              </div>

              {/* Day Events */}
              {dayEvents.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400">
                  <div className="text-2xl mb-2">🏖️</div>
                  <p className="text-sm">יום מנוחה</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {dayEvents.map((event, index) => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      onTouchStart={(e) => handleTouchStart(event, e)}
                      onTouchEnd={handleTouchEnd}
                      className="group relative bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-all cursor-pointer border-r-4"
                      style={{ borderRightColor: getEventColor(event).replace('bg-', '#') }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Event Number */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 truncate">{event.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                            <span>🕐 {moment(event.start).format('HH:mm')}</span>
                            {event.completed && <span className="text-green-600">✅ הושלם</span>}
                            {event.Deloading && <span className="text-cyan-600">🔵 דילודינג</span>}
                          </div>
                        </div>

                        {/* Quick Action */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventClick(event)
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600"
                          >
                            פתח
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Weekly Summary */}
      {totalEvents > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-bold text-gray-700 mb-3">סיכום שבועי</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xl font-bold text-blue-600">{totalEvents}</div>
              <div className="text-xs text-gray-600 mt-1">סה"כ</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xl font-bold text-green-600">
                {events.filter(e => {
                  const eventDate = moment(e.start)
                  return eventDate.isBetween(weekStart, weekEnd, 'day', '[]') && e.completed
                }).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">הושלמו</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-xl font-bold text-orange-600">
                {events.filter(e => {
                  const eventDate = moment(e.start)
                  return eventDate.isBetween(weekStart, weekEnd, 'day', '[]') && !e.completed
                }).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">ממתינים</div>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3">
              <div className="text-xl font-bold text-cyan-600">
                {events.filter(e => {
                  const eventDate = moment(e.start)
                  return eventDate.isBetween(weekStart, weekEnd, 'day', '[]') && e.Deloading
                }).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">דילודינג</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}