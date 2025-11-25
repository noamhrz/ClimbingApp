// components/calendar/DayListView.tsx
// ENHANCED DAY VIEW with fast navigation

'use client'

import { useEffect } from 'react'
import moment from 'moment-timezone'

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
  onNavigate: (newDate: Date) => void
  onBackToMonth: () => void
}

export default function DayListView({ events, date, onEventClick, onNavigate, onBackToMonth }: Props) {
  const dayEvents = events
    .filter(event => {
      const eventDate = moment(event.start).format('YYYY-MM-DD')
      const selectedDate = moment(date).format('YYYY-MM-DD')
      return eventDate === selectedDate
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const getEventColor = (event: CalendarEvent) => {
    const now = new Date()
    const eventEnd = new Date(event.end)
    
    // אירוע שהושלם - תמיד ירוק
    if (event.completed) return '#10b981' // Green
    
    // אירוע דילודינג - ציאן
    if (event.Deloading) return '#06b6d4' // Cyan
    
    // אירוע שעבר ולא הושלם - אדום (MISSED)
    if (eventEnd < now && !event.completed) return '#ef4444' // Red
    
    // אירוע עתידי - כחול (pending)
    return '#3b82f6' // Blue
  }

  const goToPrevDay = () => {
    const newDate = moment(date).subtract(1, 'day').toDate()
    onNavigate(newDate)
  }

  const goToNextDay = () => {
    const newDate = moment(date).add(1, 'day').toDate()
    onNavigate(newDate)
  }

  const goToToday = () => {
    onNavigate(new Date())
  }

  const isToday = moment(date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
      }
      
      if (e.key === 'ArrowRight') goToNextDay()
      if (e.key === 'ArrowLeft') goToPrevDay()
      if (e.key === 'm' || e.key === 'M') onBackToMonth()
      if (e.key === 't' || e.key === 'T') goToToday()
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [date])

  // Swipe support for mobile
  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      
      const diffX = touchStartX - touchEndX
      const diffY = touchStartY - touchEndY

      // Horizontal swipe (more than vertical)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          goToNextDay() // Swipe left = next day
        } else {
          goToPrevDay() // Swipe right = prev day
        }
      }
      
      // Vertical swipe down = back to month
      if (diffY < -50 && Math.abs(diffY) > Math.abs(diffX)) {
        onBackToMonth()
      }
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [date])

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Floating Navigation Buttons */}
      <div className="fixed bottom-32 right-6 z-40 flex flex-col gap-2">
        <button
          onClick={goToPrevDay}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
          title="יום קודם (←)"
        >
          →
        </button>
        <button
          onClick={goToNextDay}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
          title="יום הבא (→)"
        >
          ←
        </button>
        <button
          onClick={onBackToMonth}
          className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
          title="חזרה לחודש (M)"
        >
          🗓️
        </button>
        {!isToday && (
          <button
            onClick={goToToday}
            className="w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
            title="קפיצה להיום (T)"
          >
            🏠
          </button>
        )}
      </div>

      {/* Header with Navigation */}
      <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevDay}
            className="p-3 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            title="יום קודם"
          >
            <span className="text-3xl">→</span>
          </button>
          
          <div className="text-center">
            <div className={`text-5xl font-bold mb-2 ${isToday ? 'text-yellow-600' : 'text-gray-900'}`}>
              {moment(date).format('D')}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {moment(date).format('dddd')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {moment(date).format('MMMM YYYY')}
            </p>
            {isToday && (
              <div className="mt-2 inline-block px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                היום
              </div>
            )}
          </div>
          
          <button
            onClick={goToNextDay}
            className="p-3 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
            title="יום הבא"
          >
            <span className="text-3xl">←</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={onBackToMonth}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors text-sm font-medium"
          >
            🗓️ חזרה לחודש
          </button>
          {!isToday && (
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium"
            >
              🏠 קפיצה להיום
            </button>
          )}
        </div>

        {/* Events Count */}
        <div className="text-center mt-4">
          <div className="inline-flex items-center gap-3 flex-wrap justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              <span>📋</span>
              <span>{dayEvents.length} אימונים</span>
            </span>
            {dayEvents.filter(e => e.completed).length > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <span>✅</span>
                <span>{dayEvents.filter(e => e.completed).length} הושלמו</span>
              </span>
            )}
            {dayEvents.filter(e => !e.completed && new Date(e.end) < new Date()).length > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                <span>❌</span>
                <span>{dayEvents.filter(e => !e.completed && new Date(e.end) < new Date()).length} פספסו</span>
              </span>
            )}
            {dayEvents.filter(e => !e.completed && new Date(e.end) >= new Date()).length > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                <span>⏳</span>
                <span>{dayEvents.filter(e => !e.completed && new Date(e.end) >= new Date()).length} ממתינים</span>
              </span>
            )}
          </div>
        </div>

        {/* Keyboard Hints */}
        <div className="text-center mt-3 text-xs text-gray-400">
          💡 קיצורי מקלדת: ← → (ימים) | M (חודש) | T (היום)
        </div>
      </div>

      {/* Events List */}
      <div className="p-6">
        {dayEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">🏖️</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">יום מנוחה</h3>
            <p className="text-gray-500">אין אימונים מתוכננים היום</p>
            <p className="text-gray-400 text-sm mt-2">תהנה מהיום החופשי! 😊</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {dayEvents.map((event, index) => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="group relative bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer border-r-8 active:bg-gray-100 hover:translate-x-[-4px]"
                style={{ borderRightColor: getEventColor(event) }}
              >
                {/* Event Number Badge */}
                <div
                  className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  style={{ backgroundColor: getEventColor(event) }}
                >
                  {index + 1}
                </div>

                {/* Event Content */}
                <div className="space-y-3 pr-4">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900">
                    {event.title}
                  </h3>

                  {/* Time */}
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 border">
                    <span className="text-2xl">🕐</span>
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                      <span>{moment(event.start).format('HH:mm')}</span>
                      <span className="text-gray-400">→</span>
                      <span>{moment(event.end).format('HH:mm')}</span>
                    </div>
                    <span className="text-sm text-gray-500 mr-auto">
                      ({moment(event.end).diff(moment(event.start), 'minutes')} דק')
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-2 flex-wrap">
                    {event.completed && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-bold">
                        <span className="text-lg">✅</span>
                        <span>הושלם</span>
                      </span>
                    )}
                    {event.Deloading && !event.completed && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 text-cyan-800 rounded-lg text-sm font-bold">
                        <span className="text-lg">🔵</span>
                        <span>דילודינג {event.DeloadingPercentage}%</span>
                      </span>
                    )}
                    {!event.completed && !event.Deloading && new Date(event.end) < new Date() && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-bold">
                        <span className="text-lg">❌</span>
                        <span>פספס</span>
                      </span>
                    )}
                    {!event.completed && !event.Deloading && new Date(event.end) >= new Date() && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-bold">
                        <span className="text-lg">⏳</span>
                        <span>ממתין</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Click Indicator */}
                <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium">
                    👆 לחץ להתחלה
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {dayEvents.length > 0 && (
        <div className="border-t p-6 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">סיכום היום</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-gray-700 mb-1">{dayEvents.length}</div>
                <div className="text-sm text-gray-600">סה"כ</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {dayEvents.filter(e => e.completed).length}
                </div>
                <div className="text-sm text-gray-600">הושלמו</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {dayEvents.filter(e => !e.completed && new Date(e.end) < new Date()).length}
                </div>
                <div className="text-sm text-gray-600">פספסו</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {dayEvents.filter(e => !e.completed && new Date(e.end) >= new Date()).length}
                </div>
                <div className="text-sm text-gray-600">ממתינים</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Swipe Hint */}
      <div className="lg:hidden text-center py-4 text-xs text-gray-400">
        💡 החלק ימינה/שמאלה למעבר בין ימים | החלק למטה לחודש
      </div>
    </div>
  )
}