'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface EventContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onEdit: () => void
  onDelete: () => void
  onStartNow?: () => void  // Start workout or edit completed workout
  onClose: () => void
  eventTitle: string
  isCompleted?: boolean  // 🔧 NEW: To show different text
}

export default function EventContextMenu({
  isOpen,
  position,
  onEdit,
  onDelete,
  onStartNow,
  onClose,
  eventTitle,
  isCompleted = false,
}: EventContextMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-30 z-50"
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.2 }}
            style={{
              position: 'fixed',
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="bg-white rounded-xl shadow-2xl z-50 overflow-hidden min-w-[220px]"
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-blue-600 px-4 py-3">
              <h3 className="text-white font-bold text-sm truncate">
                {eventTitle}
              </h3>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* 🔧 Start/Edit Now Button - Different text based on completed status */}
              {onStartNow && (
                <button
                  onClick={() => {
                    onStartNow()
                    onClose()
                  }}
                  className={`w-full px-4 py-3 text-right transition-colors flex items-center gap-3 ${
                    isCompleted 
                      ? 'hover:bg-blue-50 text-blue-700' 
                      : 'hover:bg-green-50 text-green-700'
                  }`}
                >
                  <span className="text-xl">{isCompleted ? '📝' : '▶️'}</span>
                  <span className="font-medium">
                    {isCompleted ? 'עריכת אימון' : 'התחל אימון'}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  onEdit()
                  onClose()
                }}
                className="w-full px-4 py-3 text-right hover:bg-gray-100 transition-colors flex items-center gap-3"
              >
                <span className="text-xl">📅</span>
                <span className="font-medium">הזז תאריך</span>
              </button>

              <button
                onClick={() => {
                  onDelete()
                  onClose()
                }}
                className="w-full px-4 py-3 text-right hover:bg-red-50 text-red-600 transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🗑️</span>
                <span className="font-medium">מחק אימון</span>
              </button>

              <div className="border-t my-2"></div>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 text-right hover:bg-gray-100 transition-colors flex items-center gap-3"
              >
                <span className="text-xl">❌</span>
                <span className="font-medium text-gray-600">ביטול</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}