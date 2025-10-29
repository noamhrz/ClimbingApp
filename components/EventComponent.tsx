import React, { useRef } from 'react'
import { getEventColor } from '@/lib/calendarUtils'

interface EventComponentProps {
  event: {
    id: number
    title: string
    start: Date
    end: Date
    completed: boolean
    WorkoutID?: number
    Deloading?: boolean
    DeloadingPercentage?: number | null
    StartTime?: string | Date
  }
  onDelete: (id: number) => void
  onLongPress?: (event: any, position: { x: number; y: number }) => void
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
  const touchStartPos = useRef({ x: 0, y: 0 })

  // Get colors based on event state
  const colors = getEventColor({
    StartTime: event.StartTime || event.start,
    Completed: event.completed,
    Deloading: event.Deloading,
    DeloadingPercentage: event.DeloadingPercentage,
  })

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !onLongPress) return

    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }

    longPressTimer.current = setTimeout(() => {
      // Calculate center of screen for menu position
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      
      onLongPress(event, { x: centerX, y: centerY })
    }, 500) // 500ms long press
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long press if finger moves too much
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y)
    
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }

  return (
    <div 
      className="relative w-full h-full rounded p-1 text-xs font-semibold overflow-hidden"
      style={{ backgroundColor: colors.bg, color: colors.text }}
      onMouseDown={(e) => {
        // Prevent react-big-calendar from thinking this is a slot selection
        e.stopPropagation()
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div className="truncate pointer-events-none">
        {event.title}
      </div>

      {/* ✅ הסרתי את כפתור המחיקה הישיר! */}
      {/* המחיקה תהיה רק דרך Context Menu */}

      {/* Deloading Badge */}
      {event.Deloading && event.DeloadingPercentage && (
        <div className="absolute top-1 right-1 text-[9px] bg-white/70 text-black rounded px-1 py-[1px] pointer-events-none">
          {event.DeloadingPercentage}% 
        </div>
      )}
    </div>
  )
}