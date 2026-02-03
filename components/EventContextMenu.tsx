// components/EventContextMenu.tsx
// ✅ FIXED: Always centered on screen + Shows event date

'use client'

import { useEffect } from 'react'
import moment from 'moment'

interface EventContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onEdit: () => void
  onDelete: () => void
  onStartNow: () => void
  onClose: () => void
  eventTitle: string
  isCompleted: boolean
  eventDate?: Date | string // ✨ NEW: Event date
}

export default function EventContextMenu({
  isOpen,
  position,
  onEdit,
  onDelete,
  onStartNow,
  onClose,
  eventTitle,
  isCompleted,
  eventDate
}: EventContextMenuProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById('context-menu')
      if (menu && !menu.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // ✅ Format date if provided - with debug
  console.log('EventContextMenu - eventDate:', eventDate)
  const formattedDate = eventDate 
    ? moment(eventDate).format('dddd, DD/MM/YYYY • HH:mm')
    : null
  console.log('EventContextMenu - formattedDate:', formattedDate)

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* ✅ FIXED: Always centered modal */}
      <div
        id="context-menu"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-11/12 max-w-sm animate-in zoom-in-95 duration-200"
        role="menu"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Title + Date */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
            {/* Workout title - FIRST */}
            <h3 className="font-bold text-white text-xl text-center mb-2">
              {eventTitle}
            </h3>
            
            {/* ✅ Date below title */}
            {formattedDate ? (
              <p className="text-blue-100 text-base text-center font-medium">
                📅 {formattedDate}
              </p>
            ) : (
              <p className="text-red-300 text-sm text-center">
                ⚠️ אין מידע על תאריך
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-3 space-y-2">
            {/* Start/View Button */}
            <button
              onClick={() => {
                onClose()
                onStartNow()
              }}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all active:scale-95 ${
                isCompleted
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              {isCompleted ? '✅ צפה באימון' : '▶️ התחל אימון'}
            </button>

            {/* Edit Date Button */}
            <button
              onClick={() => {
                onClose()
                onEdit()
              }}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-all active:scale-95"
            >
              📅 הזז תאריך
            </button>

            {/* Delete Button */}
            <button
              onClick={() => {
                onClose()
                onDelete()
              }}
              className="w-full py-3 px-4 bg-red-100 hover:bg-red-200 rounded-xl font-medium text-red-700 transition-all active:scale-95"
            >
              🗑️ מחק אימון
            </button>

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-white hover:bg-gray-50 rounded-xl font-medium text-gray-500 transition-all active:scale-95 border border-gray-200"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </>
  )
}