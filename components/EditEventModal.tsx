'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import moment from 'moment-timezone'

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newDate: Date, newTime: 'morning' | 'afternoon' | 'evening') => void
  eventTitle: string
  currentDate: Date
}

export default function EditEventModal({
  isOpen,
  onClose,
  onSave,
  eventTitle,
  currentDate,
}: EditEventModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'evening'>('morning')

  // Initialize with current event date and time
  useEffect(() => {
    if (isOpen && currentDate) {
      setSelectedDate(moment(currentDate).format('YYYY-MM-DD'))
      const hour = moment(currentDate).hour()
      if (hour >= 6 && hour < 12) setSelectedTime('morning')
      else if (hour >= 12 && hour < 18) setSelectedTime('afternoon')
      else setSelectedTime('evening')
    }
  }, [isOpen, currentDate])

  const handleSave = () => {
    if (!selectedDate) return

    const originalDate = moment(currentDate)
    const newDate = moment.tz(selectedDate, 'Asia/Jerusalem')
    
    const getTimeOfDay = (date: Date): 'morning' | 'afternoon' | 'evening' => {
      const hour = moment(date).hour()
      if (hour >= 6 && hour < 12) return 'morning'
      if (hour >= 12 && hour < 18) return 'afternoon'
      return 'evening'
    }

    let finalDate
    if (selectedTime !== getTimeOfDay(currentDate)) {
      let hour = 9
      if (selectedTime === 'afternoon') hour = 14
      else if (selectedTime === 'evening') hour = 18
      finalDate = newDate.hour(hour).minute(0).second(0).toDate()
    } else {
      finalDate = newDate.hour(originalDate.hour()).minute(originalDate.minute()).second(0).toDate()
    }

    onSave(finalDate, selectedTime)
    onClose()
  }

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
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-raised border border-line-strong rounded-2xl w-full max-w-md overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-surface border border-line">
                <h2 className="text-2xl font-bold text-fg text-center">
                  📅 שינוי תאריך וזמן
                </h2>
                <p className="text-fg-2 text-center text-sm mt-1">
                  {eventTitle}
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-semibold text-fg-2 mb-2">
                    📅 תאריך חדש
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Time Selector */}
                <div>
                  <label className="block text-sm font-semibold text-fg-2 mb-2">
                    🕐 זמן
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTime('morning')}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
 selectedTime === 'morning'
 ? 'border-accent bg-accent/15 text-accent'
 : 'border-line hover:border-accent/90'
 }`}
                    >
                      <div className="text-2xl mb-1">🌅</div>
                      <div className="text-sm font-medium">בוקר</div>
                      <div className="text-xs text-muted">09:00</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTime('afternoon')}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
 selectedTime === 'afternoon'
 ? 'border-accent bg-accent/15 text-accent'
 : 'border-line hover:border-accent/90'
 }`}
                    >
                      <div className="text-2xl mb-1">☀️</div>
                      <div className="text-sm font-medium">צהריים</div>
                      <div className="text-xs text-muted">14:00</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTime('evening')}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
 selectedTime === 'evening'
 ? 'border-accent bg-accent/15 text-accent'
 : 'border-line hover:border-accent/90'
 }`}
                    >
                      <div className="text-2xl mb-1">🌙</div>
                      <div className="text-sm font-medium">ערב</div>
                      <div className="text-xs text-muted">18:00</div>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border-2 border-line text-fg-2 font-semibold rounded-lg hover:bg-surface transition-all"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!selectedDate}
                    className="flex-1 px-6 py-3 bg-accent text-on-accent font-semibold rounded-lg hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    שמור שינויים
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
