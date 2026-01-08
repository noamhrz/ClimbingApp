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
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<number[]>([]) // CHANGED: Array
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize date when modal opens
  useEffect(() => {
    if (isOpen) {
      const dateToUse = initialDate || new Date()
      setSelectedDate(moment(dateToUse).format('YYYY-MM-DD'))
      setSelectedWorkoutIds([]) // CHANGED: Reset to empty array
      setSelectedTime('morning')
    }
  }, [isOpen, initialDate])

  // CHANGED: Toggle workout selection
  const toggleWorkoutSelection = (workoutId: number) => {
    setSelectedWorkoutIds(prev => {
      if (prev.includes(workoutId)) {
        // Remove if already selected
        return prev.filter(id => id !== workoutId)
      } else {
        // Add if not selected
        return [...prev, workoutId]
      }
    })
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✅ FIXED: handleSubmit with EstimatedTotalTime
  // ═══════════════════════════════════════════════════════════════════
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // CHANGED: Check for multiple workouts
    if (!selectedDate || selectedWorkoutIds.length === 0) {
      alert('אנא בחר תאריך ולפחות אימון אחד')
      return
    }

    setIsSubmitting(true)

    try {
      // ✅ FIX: Fetch EstimatedTotalTime for selected workouts
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('Workouts')
        .select('WorkoutID, EstimatedTotalTime')
        .in('WorkoutID', selectedWorkoutIds)

      if (workoutsError) {
        console.error('❌ Error fetching workout durations:', workoutsError)
        alert('שגיאה בטעינת פרטי אימונים')
        setIsSubmitting(false)
        return
      }

      // Create duration map
      const durationMap = new Map(
        (workoutsData || []).map(w => [w.WorkoutID, w.EstimatedTotalTime || 60])
      )

      // Calculate time based on selection
      const baseDate = moment.tz(selectedDate, 'Asia/Jerusalem')
      let hour = 9 // morning default
      
      if (selectedTime === 'afternoon') hour = 14
      else if (selectedTime === 'evening') hour = 18

      // ✅ FIX: Create multiple calendar entries with correct duration
      const calendarEntries = selectedWorkoutIds.map(workoutId => {
        const startTime = baseDate.hour(hour).minute(0).second(0).toDate()
        
        // ✅ Use EstimatedTotalTime instead of hardcoded +1 hour
        const durationMinutes = durationMap.get(workoutId) || 60
        const endTime = moment(startTime).add(durationMinutes, 'minutes').toDate()

        return {
          Email: email,
          WorkoutID: workoutId,
          StartTime: startTime,
          EndTime: endTime,
          Completed: false,
          Deloading: false,
          Color: '#3b82f6',
        }
      })

      const { error } = await supabase.from('Calendar').insert(calendarEntries)

      if (error) {
        console.error('❌ Error adding workouts:', error)
        alert(`שגיאה בהוספת אימונים: ${error.message}`)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err)
      alert('שגיאה בהוספת אימונים')
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
                  ➕ הוספת אימונים ללוח
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

                {/* Step 2: Time Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🕐 זמן אימון (יחול על כל האימונים)
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

                {/* Step 3: Multi-Workout Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🏋️ בחר אימונים (ניתן לבחור כמה שרוצים)
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {availableWorkouts.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        אין אימונים זמינים
                      </div>
                    ) : (
                      availableWorkouts.map((workout) => {
                        const isSelected = selectedWorkoutIds.includes(workout.id)
                        
                        return (
                          <button
                            key={workout.id}
                            type="button"
                            onClick={() => toggleWorkoutSelection(workout.id)}
                            className={`w-full text-right px-4 py-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500 text-white'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {workout.name}
                              </span>
                              <span className="text-2xl">
                                {getCategoryEmoji(workout.category)}
                              </span>
                            </div>
                            {workout.category && (
                              <div className={`text-sm mt-1 ${
                                isSelected ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {workout.category}
                              </div>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                  
                  {/* Counter */}
                  {selectedWorkoutIds.length > 0 && (
                    <div className="mt-3 text-center">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                        <span>✅</span>
                        <span>נבחרו {selectedWorkoutIds.length} אימונים</span>
                      </span>
                    </div>
                  )}
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
                    disabled={isSubmitting || selectedWorkoutIds.length === 0}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting 
                      ? 'מוסיף...' 
                      : selectedWorkoutIds.length > 1 
                        ? `הוסף ${selectedWorkoutIds.length} אימונים`
                        : 'אישור'
                    }
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