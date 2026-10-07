// components/EventComponent.tsx
// Simple: title tooltip + subtle hover effect

'use client'

import { useRef } from 'react'

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
}

interface EventComponentProps {
  event: CalendarEvent
  onDelete: (id: number) => void
  onLongPress?: (event: CalendarEvent, position: { x: number; y: number }) => void
  isAdmin?: boolean
  isMobile?: boolean
}

export default function EventComponent({
  event,
  onDelete,
  onLongPress,
  isAdmin = false,
  isMobile = false,
}: EventComponentProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    
    longPressTimer.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect()
      onLongPress?.(event, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const getEventColor = () => {
    if (event.Deloading) {
      return event.completed ? '#9BD3AC' : '#A9CBDC'
    }
    
    const now = new Date()
    const eventDate = new Date(event.start)
    const isToday = eventDate.toDateString() === now.toDateString()
    
    if (event.completed) return '#5FB37A'
    if (isToday) return '#E3B341'
    if (eventDate < now) return '#E06A5F'
    return '#E0763A'
  }

  return (
    <div
      className="relative h-full w-full pointer-events-none"
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="h-full w-full px-1 py-1 pointer-events-auto cursor-pointer overflow-hidden transition-all duration-200 hover:brightness-110 "
        style={{
          backgroundColor: getEventColor(),
          color: '#14110E',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        title={event.title}
      >
        <div className="font-bold text-xs text-center leading-tight truncate">
          {event.title}
        </div>

        {event.Deloading && event.DeloadingPercentage && (
          <div className="absolute top-0 right-0 bg-accent text-on-accent text-[10px] px-1 rounded-bl">
            {event.DeloadingPercentage}%
          </div>
        )}
      </div>
    </div>
  )
}