import React, { useRef } from 'react'

interface EventComponentProps {
  event: {
    id: number
    title: string
    start: Date
    end: Date
    completed: boolean
    color: string
    WorkoutID?: number
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
  isMobile = false
}: EventComponentProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef({ x: 0, y: 0 })

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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const confirmDelete = confirm('למחוק את האימון הזה?')
    if (confirmDelete) {
      onDelete(event.id)
    }
  }

  return (
    <div 
      className="flex flex-col justify-center items-center h-full w-full cursor-pointer relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Event Title */}
      <span className="font-bold text-xs sm:text-sm text-center truncate w-full px-1 pointer-events-none">
        {event.title}
      </span>
      
      {/* Optional: Category or time info */}
      {/* <span className="text-[10px] text-gray-200 text-center">
        {moment(event.start).format('HH:mm')}
      </span> */}

      {/* Delete Button - Admin Only - Desktop Only */}
      {isAdmin && !isMobile && (
        <button
          className="absolute bottom-1 right-1 text-xs hover:text-red-700 transition-colors z-10 bg-white bg-opacity-80 rounded px-1"
          onClick={handleDelete}
          title="מחק אימון"
        >
          🗑
        </button>
      )}
    </div>
  )
}
