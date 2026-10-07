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
  onMarkCompleted?: () => void
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
  onMarkCompleted,
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

  const formattedDate = eventDate
    ? moment(eventDate).format('dddd, DD/MM/YYYY • HH:mm')
    : null

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
        <div className="bg-raised border border-line-strong rounded-2xl overflow-hidden shadow-2xl">
          {/* Header with Title + Date */}
          <div className="px-5 py-4 bg-surface border border-line">
            {/* Workout title - FIRST */}
            <h3 className="font-bold text-fg text-xl text-center mb-2">
              {eventTitle}
            </h3>
            
            {/* ✅ Date below title */}
            {formattedDate ? (
              <p className="text-fg-2 text-base text-center font-medium">
                📅 {formattedDate}
              </p>
            ) : (
              <p className="text-danger text-sm text-center">
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
              className={`w-full py-3 px-4 rounded-xl font-semibold text-on-accent transition-all active:scale-95 ${
 isCompleted
 ? 'bg-success'
 : 'bg-accent hover:bg-accent-hover'
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
              className="w-full py-3 px-4 bg-surface hover:bg-raised rounded-xl font-medium text-fg-2 transition-all active:scale-95"
            >
              📅 הזז תאריך
            </button>

            {/* Delete Button */}
            <button
              onClick={() => {
                onClose()
                onDelete()
              }}
              className="w-full py-3 px-4 bg-danger/15 hover:bg-danger/15 rounded-xl font-medium text-danger transition-all active:scale-95"
            >
              🗑️ מחק אימון
            </button>

            {/* Mark Completed from Previous Workout Button */}
            {!isCompleted && onMarkCompleted && (
              <button
                onClick={() => {
                  onClose()
                  onMarkCompleted()
                }}
                className="w-full py-3 px-4 bg-info/10 hover:bg-info/20 rounded-xl font-medium text-info transition-all active:scale-95"
              >
                📋 סמן כבוצע (נתונים מאימון קודם)
              </button>
            )}

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-surface hover:bg-surface/90 rounded-xl font-medium text-muted transition-all active:scale-95 border border-line"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </>
  )
}