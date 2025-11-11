'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import moment from 'moment-timezone'

interface Workout {
  id: number
  name: string
  category?: string
}

interface AddWorkoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  email: string
  availableWorkouts: Workout[]
  initialDate?: Date
}

export default function AddWorkoutModal({
  isOpen,
  onClose,
  onSuccess,
  email,
  availableWorkouts,
  initialDate,
}: AddWorkoutModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize date when modal opens
  useEffect(() => {
    if (isOpen) {
      const dateToUse = initialDate || new Date()
      setSelectedDate(moment(dateToUse).format('YYYY-MM-DD'))
      setSelectedWorkoutId(null)
      setSelectedTime('morning')
    }
  }, [isOpen, initialDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDate || !selectedWorkoutId) {
      alert('אנא בחר תאריך ואימון')
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate time based on selection
      const baseDate = moment.tz(selectedDate, 'Asia/Jerusalem')
      let hour = 9 // morning default
      
      if (selectedTime === 'afternoon') hour = 14
      else if (selectedTime === 'evening') hour = 18

      const startTime = baseDate.hour(hour).minute(0).second(0).toDate()
      const endTime = moment(startTime).add(1, 'hour').toDate()

      const { error } = await supabase.from('Calendar').insert({
        Email: email,
        WorkoutID: selectedWorkoutId,
        StartTime: startTime,
        EndTime: endTime,
        Completed: false,
        Deloading: false,
        Color: '#3b82f6', // Blue for new workouts
      })

      if (error) {
        console.error('❌ Error adding workout:', error)
        alert(`שגיאה בהוספת אימון: ${error.message}`)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err)
      alert('שגיאה בהוספת אימון')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryEmoji = (category?: string) => {
    if (!category) return '🏋️'
    const lower = category.toLowerCase()
    if (lower.includes('strength') || lower.includes('כוח')) return '💪'
    if (lower.includes('endurance') || lower.includes('סיבולת')) return '🏃'
    if (lower.includes('technique') || lower.includes('טכניקה')) return '🧗'
    if (lower.includes('flexibility') || lower.includes('גמישות')) return '🤸'
    return '🏋️'
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
                  ➕ הוספת אימון ללוח
                </h2>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Step 1: Date Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 תאריך אימון
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Step 2: Workout Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🏋️ בחר אימון
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {availableWorkouts.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        אין אימונים זמינים
                      </div>
                    ) : (
                      availableWorkouts.map((workout) => (
                        <button
                          key={workout.id}
                          type="button"
                          onClick={() => setSelectedWorkoutId(workout.id)}
                          className={`w-full text-right px-4 py-3 rounded-lg border-2 transition-all ${
                            selectedWorkoutId === workout.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">
                              {workout.name}
                            </span>
                            <span className="text-2xl">
                              {getCategoryEmoji(workout.category)}
                            </span>
                          </div>
                          {workout.category && (
                            <div className="text-sm text-gray-500 mt-1">
                              {workout.category}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Step 3: Time Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🕐 זמן אימון
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
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedWorkoutId}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'מוסיף...' : 'אישור'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}