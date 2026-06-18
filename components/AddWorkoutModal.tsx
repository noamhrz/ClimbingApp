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
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<number[]>([])
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingExisting, setIsLoadingExisting] = useState(false)
  const [orderedWorkouts, setOrderedWorkouts] = useState<{id: number, name: string}[]>([])
  const [draggedId, setDraggedId] = useState<number | null>(null)
  // workoutId → calendarId for entries already saved on this day
  const [existingCalendarMap, setExistingCalendarMap] = useState<Map<number, number>>(new Map())

  const loadExistingForDate = async (dateStr: string) => {
    if (!dateStr || !email) return
    setIsLoadingExisting(true)
    try {
      const base = moment.tz(dateStr, 'Asia/Jerusalem')
      const dayStart = base.clone().startOf('day').toISOString()
      const dayEnd = base.clone().endOf('day').toISOString()

      const { data, error } = await supabase
        .from('Calendar')
        .select('CalendarID, WorkoutID, Order')
        .eq('Email', email)
        .gte('StartTime', dayStart)
        .lte('StartTime', dayEnd)
        .order('Order', { ascending: true })

      if (error || !data || data.length === 0) {
        setExistingCalendarMap(new Map())
        setSelectedWorkoutIds([])
        setOrderedWorkouts([])
        return
      }

      const calMap = new Map<number, number>()
      const ids: number[] = []
      const ordered: { id: number; name: string }[] = []

      for (const row of data) {
        calMap.set(row.WorkoutID, row.CalendarID)
        ids.push(row.WorkoutID)
        const workout = availableWorkouts.find(w => w.id === row.WorkoutID)
        ordered.push({ id: row.WorkoutID, name: workout?.name || `אימון #${row.WorkoutID}` })
      }

      setExistingCalendarMap(calMap)
      setSelectedWorkoutIds(ids)
      setOrderedWorkouts(ordered)
    } finally {
      setIsLoadingExisting(false)
    }
  }

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      const dateToUse = initialDate || new Date()
      const dateStr = moment(dateToUse).format('YYYY-MM-DD')
      setSelectedDate(dateStr)
      setSelectedTime('morning')
      setDraggedId(null)
      loadExistingForDate(dateStr)
    }
  }, [isOpen, initialDate])

  // Reload when user picks a different date
  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr)
    setExistingCalendarMap(new Map())
    setSelectedWorkoutIds([])
    setOrderedWorkouts([])
    loadExistingForDate(dateStr)
  }

  const toggleWorkoutSelection = (workoutId: number) => {
    setSelectedWorkoutIds(prev => {
      if (prev.includes(workoutId)) return prev.filter(id => id !== workoutId)
      return [...prev, workoutId]
    })
    setOrderedWorkouts(prev => {
      const exists = prev.some(w => w.id === workoutId)
      if (exists) return prev.filter(w => w.id !== workoutId)
      const workout = availableWorkouts.find(w => w.id === workoutId)
      return [...prev, { id: workoutId, name: workout?.name || '' }]
    })
  }

  const handleDragStart = (id: number) => setDraggedId(id)

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    if (draggedId === null || draggedId === targetId) return
    setOrderedWorkouts(prev => {
      const from = prev.findIndex(w => w.id === draggedId)
      const to = prev.findIndex(w => w.id === targetId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const handleDragEnd = () => setDraggedId(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDate || selectedWorkoutIds.length === 0) {
      alert('אנא בחר תאריך ולפחות אימון אחד')
      return
    }

    setIsSubmitting(true)

    try {
      const baseDate = moment.tz(selectedDate, 'Asia/Jerusalem')
      let hour = 9
      if (selectedTime === 'afternoon') hour = 14
      else if (selectedTime === 'evening') hour = 18

      // Fetch durations only for newly-added workouts
      const newWorkoutIds = orderedWorkouts
        .filter(w => !existingCalendarMap.has(w.id))
        .map(w => w.id)

      let durationMap = new Map<number, number>()
      if (newWorkoutIds.length > 0) {
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('Workouts')
          .select('WorkoutID, EstimatedTotalTime')
          .in('WorkoutID', newWorkoutIds)

        if (workoutsError) {
          console.error('Error fetching workout durations:', workoutsError)
          alert('שגיאה בטעינת פרטי אימונים')
          setIsSubmitting(false)
          return
        }
        durationMap = new Map(
          (workoutsData || []).map(w => [w.WorkoutID, w.EstimatedTotalTime || 60])
        )
      }

      // Split into updates (existing) and inserts (new), preserving full orderedWorkouts order
      const updates: { calendarId: number; order: number }[] = []
      const inserts: object[] = []

      orderedWorkouts.forEach((workout, index) => {
        const order = index + 1
        const calendarId = existingCalendarMap.get(workout.id)

        if (calendarId !== undefined) {
          updates.push({ calendarId, order })
        } else {
          const startTime = baseDate.clone().hour(hour).minute(0).second(0).toDate()
          const durationMinutes = durationMap.get(workout.id) || 60
          const endTime = moment(startTime).add(durationMinutes, 'minutes').toDate()
          inserts.push({
            Email: email,
            WorkoutID: workout.id,
            StartTime: startTime,
            EndTime: endTime,
            Completed: false,
            Deloading: false,
            Color: '#3b82f6',
            Order: order,
          })
        }
      })

      // Also delete entries for workouts that were deselected (existed before but removed)
      const deselectedCalendarIds: number[] = []
      for (const [workoutId, calendarId] of existingCalendarMap.entries()) {
        if (!selectedWorkoutIds.includes(workoutId)) {
          deselectedCalendarIds.push(calendarId)
        }
      }

      const ops: Promise<any>[] = []

      if (deselectedCalendarIds.length > 0) {
        ops.push(
          supabase
            .from('Calendar')
            .delete()
            .in('CalendarID', deselectedCalendarIds)
        )
      }

      for (const upd of updates) {
        ops.push(
          supabase
            .from('Calendar')
            .update({ Order: upd.order })
            .eq('CalendarID', upd.calendarId)
        )
      }

      if (inserts.length > 0) {
        ops.push(supabase.from('Calendar').insert(inserts))
      }

      const results = await Promise.all(ops)
      const failed = results.find(r => r.error)
      if (failed?.error) {
        console.error('Error saving workouts:', failed.error)
        alert(`שגיאה בשמירת אימונים: ${failed.error.message}`)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('שגיאה בשמירת אימונים')
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

  const isExistingWorkout = (id: number) => existingCalendarMap.has(id)

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
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
              style={{ maxHeight: 'calc(100vh - 2rem)' }}
              dir="rtl"
            >
              {/* Header — fixed */}
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white text-center">
                  ➕ הוספת אימונים ללוח
                </h2>
              </div>

              {/* Scrollable content */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto flex-1 p-6 space-y-6">

                  {/* Step 1: Date Picker */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📅 תאריך אימון
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                    {isLoadingExisting && (
                      <div className="mt-2 text-xs text-gray-400 text-center">טוען אימונים קיימים...</div>
                    )}
                    {!isLoadingExisting && existingCalendarMap.size > 0 && (
                      <div className="mt-2 text-xs text-blue-600 text-center">
                        נמצאו {existingCalendarMap.size} אימונים קיימים ביום זה
                      </div>
                    )}
                  </div>

                  {/* Step 2: Time Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🕐 זמן אימון (יחול על אימונים חדשים בלבד)
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
                    <div className="space-y-2 border border-gray-200 rounded-lg p-2">
                      {availableWorkouts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          אין אימונים זמינים
                        </div>
                      ) : (
                        availableWorkouts.map((workout) => {
                          const isSelected = selectedWorkoutIds.includes(workout.id)
                          const isExisting = isExistingWorkout(workout.id)
                          return (
                            <button
                              key={workout.id}
                              type="button"
                              onClick={() => toggleWorkoutSelection(workout.id)}
                              className={`w-full text-right px-4 py-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? isExisting
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-blue-500 bg-blue-500 text-white'
                                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{workout.name}</span>
                                  {isExisting && isSelected && (
                                    <span className="text-xs bg-white/30 px-1.5 py-0.5 rounded">קיים</span>
                                  )}
                                </div>
                                <span className="text-2xl">{getCategoryEmoji(workout.category)}</span>
                              </div>
                              {workout.category && (
                                <div className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
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
                      <div className="mt-3 text-center flex gap-2 justify-center flex-wrap">
                        {existingCalendarMap.size > 0 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                            <span>📌</span>
                            <span>{[...existingCalendarMap.keys()].filter(id => selectedWorkoutIds.includes(id)).length} קיימים</span>
                          </span>
                        )}
                        {selectedWorkoutIds.filter(id => !existingCalendarMap.has(id)).length > 0 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                            <span>✨</span>
                            <span>{selectedWorkoutIds.filter(id => !existingCalendarMap.has(id)).length} חדשים</span>
                          </span>
                        )}
                        {[...existingCalendarMap.keys()].filter(id => !selectedWorkoutIds.includes(id)).length > 0 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                            <span>🗑️</span>
                            <span>{[...existingCalendarMap.keys()].filter(id => !selectedWorkoutIds.includes(id)).length} יוסרו</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 4: Day Order */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📋 סדר ביום — אפשר לגרור לשינוי
                    </label>
                    {orderedWorkouts.length === 0 ? (
                      <div className="text-center py-5 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        בחר אימונים למעלה כדי לראות את הסדר
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orderedWorkouts.map((workout, index) => (
                          <div
                            key={workout.id}
                            draggable
                            onDragStart={() => handleDragStart(workout.id)}
                            onDragOver={(e) => handleDragOver(e, workout.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg select-none transition-all ${
                              draggedId === workout.id
                                ? 'border-blue-400 bg-blue-50 opacity-60'
                                : 'border-gray-200 bg-white cursor-grab active:cursor-grabbing'
                            }`}
                          >
                            <span className="text-gray-400 text-xl leading-none">≡</span>
                            <span className="text-blue-600 font-bold text-sm w-6">{index + 1}.</span>
                            <span className="font-medium text-gray-800 flex-1">{workout.name}</span>
                            {isExistingWorkout(workout.id) && (
                              <span className="text-xs text-green-600 font-medium">📌</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Actions — fixed at bottom */}
                <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t border-gray-100">
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
                      ? 'שומר...'
                      : selectedWorkoutIds.length > 1
                        ? `שמור ${selectedWorkoutIds.length} אימונים`
                        : 'שמור'
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
