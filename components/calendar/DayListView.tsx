// components/calendar/DayListView.tsx
// DAY LIST VIEW - Simple vertical list
// FIXED: Added missing 'color' and 'StartTime' to interface

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

export default function DayListView({ events, date, onEventClick, onEventDelete, onEventLongPress }: Props) {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  // Filter events for selected day
  const dayEvents = events
    .filter(event => {
      const eventDate = moment(event.start).format('YYYY-MM-DD')
      const selectedDate = moment(date).format('YYYY-MM-DD')
      return eventDate === selectedDate
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())

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

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {moment(date).format('dddd, D בMMMM YYYY')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {dayEvents.length} אימונים מתוכננים
        </p>
      </div>

      {/* Events List */}
      {dayEvents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏖️</div>
          <p className="text-gray-500 text-lg">אין אימונים מתוכננים היום</p>
          <p className="text-gray-400 text-sm mt-2">יום מנוחה או לחץ על + להוסיף אימון</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((event, index) => (
            <div
              key={event.id}
              onClick={() => onEventClick(event)}
              onTouchStart={(e) => handleTouchStart(event, e)}
              onTouchEnd={handleTouchEnd}
              className="group relative bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all cursor-pointer border-r-4"
              style={{ borderRightColor: getEventColor(event).replace('bg-', '#') }}
            >
              {/* Event Number */}
              <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>

              {/* Event Content */}
              <div className="pr-2">
                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {event.title}
                </h3>

                {/* Time */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span className="text-lg">🕐</span>
                  <span>{moment(event.start).format('HH:mm')}</span>
                  <span className="text-gray-400">→</span>
                  <span>{moment(event.end).format('HH:mm')}</span>
                </div>

                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap">
                  {event.completed && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      ✅ הושלם
                    </span>
                  )}
                  {event.Deloading && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">
                      🔵 דילודינג {event.DeloadingPercentage}%
                    </span>
                  )}
                  {!event.completed && !event.Deloading && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      ⏳ ממתין
                    </span>
                  )}
                </div>
              </div>

              {/* Hover Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEventClick(event)
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                >
                  פתח
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {dayEvents.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{dayEvents.length}</div>
              <div className="text-xs text-gray-600 mt-1">סה"כ אימונים</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {dayEvents.filter(e => e.completed).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">הושלמו</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">
                {dayEvents.filter(e => !e.completed).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">ממתינים</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}