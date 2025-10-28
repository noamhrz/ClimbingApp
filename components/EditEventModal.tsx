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

    const baseDate = moment.tz(selectedDate, 'Asia/Jerusalem')
    let hour = 9
    if (selectedTime === 'afternoon') hour = 14
    else if (selectedTime === 'evening') hour = 18

    const newDate = baseDate.hour(hour).minute(0).second(0).toDate()
    onSave(newDate, selectedTime)
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-2xl font-bold text-white text-center">
                  📅 שינוי תאריך וזמן
                </h2>
                <p className="text-blue-100 text-center text-sm mt-1">
                  {eventTitle}
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 תאריך חדש
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Time Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🕐 זמן
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTime('morning')}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
                        selectedTime === 'morning'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">🌅</div>
                      <div className="text-sm font-medium">בוקר</div>
                      <div className="text-xs text-gray-500">09:00</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTime('afternoon')}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
                        selectedTime === 'afternoon'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">☀️</div>
                      <div className="text-sm font-medium">צהריים</div>
                      <div className="text-xs text-gray-500">14:00</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTime('evening')}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
                        selectedTime === 'evening'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">🌙</div>
                      <div className="text-sm font-medium">ערב</div>
                      <div className="text-xs text-gray-500">18:00</div>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!selectedDate}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
