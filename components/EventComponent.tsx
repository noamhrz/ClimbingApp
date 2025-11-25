// components/EventComponent.tsx
// Google Calendar Style - NOT clickable in month view

'use client'

import { useState, useRef, useEffect } from 'react'

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
  event: CalendarEvent
  onDelete: (id: number) => void
  onLongPress: (event: CalendarEvent, position: { x: number; y: number }) => void
  isAdmin: boolean
  isMobile: boolean
}

export default function EventComponent({ event, onDelete, onLongPress, isAdmin, isMobile }: Props) {
  // Get event color based on status with CORRECT LOGIC
  const getEventColor = () => {
    const now = new Date()
    const eventEnd = new Date(event.end)
    
    // אירוע שהושלם - תמיד ירוק
    if (event.completed) {
      return '#10b981' // Green - completed
    }
    
    // אירוע דילודינג - ציאן
    if (event.Deloading) {
      return '#06b6d4' // Cyan - deloading
    }
    
    // אירוע שעבר ולא הושלם - אדום (MISSED)
    if (eventEnd < now && !event.completed) {
      return '#ef4444' // Red - missed
    }
    
    // אירוע עתידי - כחול (pending)
    return '#3b82f6' // Blue - pending
  }

  // Get border color (darker shade)
  const getBorderColor = () => {
    const color = getEventColor()
    switch(color) {
      case '#10b981': return '#047857' // Dark green
      case '#06b6d4': return '#0891b2' // Dark cyan
      case '#ef4444': return '#b91c1c' // Dark red
      case '#3b82f6': return '#1d4ed8' // Dark blue
      default: return '#1d4ed8'
    }
  }

  const backgroundColor = getEventColor()
  const borderColor = getBorderColor()

  return (
    <div
      className="h-full rounded-md overflow-hidden flex flex-col justify-center px-2"
      style={{
        backgroundColor,
        borderRight: `4px solid ${borderColor}`,
        cursor: isMobile ? 'default' : 'pointer',
      }}
    >
      {/* Event Title */}
      <div
        className="text-white font-semibold leading-tight"
        style={{
          fontSize: isMobile ? '11px' : '12px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {event.title}
      </div>

      {/* Status Badges */}
      <div className="flex gap-1 mt-0.5">
        {event.completed && (
          <span className="text-white/90 font-bold" style={{ fontSize: '9px' }}>
            ✓
          </span>
        )}
        {event.Deloading && event.DeloadingPercentage && (
          <span className="text-white/90 font-bold" style={{ fontSize: '9px' }}>
            🔵{event.DeloadingPercentage}%
          </span>
        )}
      </div>
    </div>
  )
}