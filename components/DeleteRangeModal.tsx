// components/DeleteRangeModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format, parseISO, differenceInDays } from 'date-fns'
import { LuCalendarDays, LuChartColumn, LuCircleCheck, LuCircleX, LuLoaderCircle, LuSearch, LuTrash2, LuTriangleAlert, LuWrench } from 'react-icons/lu'

interface DeleteRangeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  email: string | null
}

interface CalendarEvent {
  CalendarID: number
  StartTime: string
  Completed: boolean
  Workouts?: {
    WorkoutName: string
    WorkoutID: number
  } | null
}

export default function DeleteRangeModal({ isOpen, onClose, onSuccess, email }: DeleteRangeModalProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  // V2: Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'missed'>('all')
  const [workoutFilter, setWorkoutFilter] = useState<number | 'all'>('all')
  const [availableWorkouts, setAvailableWorkouts] = useState<{ id: number; name: string }[]>([])

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      // Set default dates (last 7 days)
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      setStartDate(format(weekAgo, 'yyyy-MM-dd'))
      setEndDate(format(today, 'yyyy-MM-dd'))
      setAllEvents([])
      setShowConfirmation(false)
      setStatusFilter('all')
      setWorkoutFilter('all')
    }
  }, [isOpen])

  // Fetch events in range
  const handleSearch = async () => {
    if (!email || !startDate || !endDate) {
      alert('נא למלא את כל השדות')
      return
    }

    // Validation: start < end
    if (startDate >= endDate) {
      alert('תאריך התחלה חייב להיות לפני תאריך הסיום')
      return
    }

    // Validation: max 90 days
    const daysDiff = differenceInDays(new Date(endDate), new Date(startDate))
    if (daysDiff > 90) {
      alert('ניתן לבחור טווח של עד 90 ימים בלבד')
      return
    }

    setLoading(true)
    try {
      // Step 1: Fetch Calendar entries (without JOIN)
      const { data: calendarData, error: calendarError } = await supabase
        .from('Calendar')
        .select('CalendarID, StartTime, Completed, WorkoutID')
        .eq('Email', email)
        .gte('StartTime', `${startDate}T00:00:00`)
        .lte('StartTime', `${endDate}T23:59:59`)
        .order('StartTime', { ascending: true })

      if (calendarError) throw calendarError
      if (!calendarData || calendarData.length === 0) {
        alert('לא נמצאו אימונים בטווח זה')
        return
      }

      // Step 2: Fetch Workouts
      const workoutIds = [...new Set(calendarData.map((c: any) => c.WorkoutID).filter(Boolean))]
      
      let workoutsMap = new Map()
      if (workoutIds.length > 0) {
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('Workouts')
          .select('WorkoutID, Name')
          .in('WorkoutID', workoutIds)

        if (!workoutsError) {
          // Map Name to WorkoutName for consistency
          workoutsMap = new Map(
            (workoutsData || []).map((w: any) => [
              w.WorkoutID, 
              { WorkoutID: w.WorkoutID, WorkoutName: w.Name }
            ])
          )
        }
      }

      // Step 3: Combine data
      const transformedData: CalendarEvent[] = calendarData.map((event: any) => ({
        CalendarID: event.CalendarID,
        StartTime: event.StartTime,
        Completed: event.Completed,
        Workouts: workoutsMap.get(event.WorkoutID) || null
      }))

      setAllEvents(transformedData)


      // V2: Extract unique workouts
      const workouts = transformedData
        .map(e => e.Workouts)
        .filter(Boolean)
        .filter((w, i, arr) => arr.findIndex(x => x?.WorkoutID === w?.WorkoutID) === i)
        .map(w => ({ id: w!.WorkoutID, name: w!.WorkoutName }))
      
      setAvailableWorkouts(workouts)

      if (!transformedData || transformedData.length === 0) {
        alert('לא נמצאו אימונים בטווח זה')
      }
    } catch (error) {
      alert('שגיאה בטעינת אימונים')
    } finally {
      setLoading(false)
    }
  }

  // V2: Filter events
  const filteredEvents = allEvents.filter(event => {
    // Status filter
    if (statusFilter === 'completed' && !event.Completed) return false
    if (statusFilter === 'missed' && event.Completed) return false

    // Workout filter
    if (workoutFilter !== 'all' && event.Workouts?.WorkoutID !== workoutFilter) return false

    return true
  })

  // Determine if event is missed
  const isMissed = (event: CalendarEvent) => {
    const now = new Date()
    const eventDate = parseISO(event.StartTime)
    return !event.Completed && eventDate < now
  }

  // Handle delete
  const handleDelete = async () => {
    if (filteredEvents.length === 0) {
      alert('אין אימונים למחיקה')
      return
    }

    // Validation: max 100 events
    if (filteredEvents.length > 100) {
      alert('ניתן למחוק עד 100 אימונים בכל פעם')
      return
    }

    setShowConfirmation(true)
  }

  const handleConfirmedDelete = async () => {
    setDeleting(true)
    try {
      const calendarIds = filteredEvents.map(e => e.CalendarID)

      // Step 1: Delete ClimbingLog entries (has CalendarID foreign key)
      const { error: climbError } = await supabase
        .from('ClimbingLog')
        .delete()
        .in('CalendarID', calendarIds)

      // Ignore FK constraint errors (no climbing logs) and "no rows" errors
      if (climbError && climbError.code !== '23503' && climbError.code !== 'PGRST116') {
        throw climbError
      }

      // Step 2: Delete Calendar entries (main table)
      const { error: calError } = await supabase
        .from('Calendar')
        .delete()
        .in('CalendarID', calendarIds)

      if (calError) throw calError

      // Success
      alert(`✅ ${filteredEvents.length} אימונים נמחקו בהצלחה`)
      await onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error deleting events:', error)
      alert(`❌ שגיאה במחיקת אימונים: ${error.message || 'שגיאה לא ידועה'}`)
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-raised border border-line-strong rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" dir="rtl">
          {/* Header */}
          <div className="sticky top-0 bg-surface border-b px-6 py-4 rounded-t-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-fg">
                <LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />נקה אימונים בטווח תאריכים
              </h2>
              <button
                onClick={onClose}
                disabled={deleting}
                className="text-muted hover:text-fg-2 text-2xl"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Date Range Selection */}
            <div>
              <label className="block text-sm font-medium text-fg-2 mb-2">
                <LuCalendarDays aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />בחר טווח תאריכים
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-fg-3 mb-1">מתאריך:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
                    disabled={loading || deleting}
                  />
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">עד תאריך:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
                    disabled={loading || deleting}
                  />
                </div>
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={loading || deleting}
              className="w-full py-3 bg-accent text-on-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
            >
              {loading ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />מחפש...</> : <><LuSearch aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />חפש אימונים בטווח</>}
            </button>

            {/* V2: Filters */}
            {allEvents.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-fg"><LuWrench aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />סינון:</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs text-fg-3 mb-1">לפי סטטוס:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent text-sm"
                    >
                      <option value="all">הכל</option>
                      <option value="completed">רק הושלמו ✅</option>
                      <option value="missed">רק פספסו ❌</option>
                    </select>
                  </div>

                  {/* Workout Filter */}
                  <div>
                    <label className="block text-xs text-fg-3 mb-1">לפי סוג אימון:</label>
                    <select
                      value={workoutFilter}
                      onChange={(e) => setWorkoutFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent text-sm"
                    >
                      <option value="all">כל האימונים</option>
                      {availableWorkouts.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Events Preview */}
            {allEvents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-fg">
                    <LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />נמצאו {filteredEvents.length} אימונים:
                  </h3>
                  {filteredEvents.length !== allEvents.length && (
                    <span className="text-xs text-muted">
                      (מתוך {allEvents.length} סה"כ)
                    </span>
                  )}
                </div>

                <div className="border rounded-lg p-4 bg-surface max-h-60 overflow-y-auto space-y-2">
                  {filteredEvents.map(event => {
                    const eventDate = parseISO(event.StartTime)
                    const missed = isMissed(event)
                    
                    return (
                      <div
                        key={event.CalendarID}
                        className={`flex items-center gap-2 text-sm ${
 event.Completed
 ? 'text-success'
 : missed
 ? 'text-danger'
 : 'text-accent'
 }`}
                      >
                        <span className="text-base">
                          {event.Completed ? <LuCircleCheck aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /> : missed ? <LuCircleX aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /> : <LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin" />}
                        </span>
                        <span className="font-medium">
                          {format(eventDate, 'dd/MM')}
                        </span>
                        <span>-</span>
                        <span>{event.Workouts?.WorkoutName || 'אימון'}</span>
                        {event.Completed && <span className="text-xs">(הושלם)</span>}
                        {missed && <span className="text-xs">(פספס)</span>}
                      </div>
                    )
                  })}
                </div>

                {/* Warning */}
                <div className="bg-warning/15 border border-warning rounded-lg p-4">
                  <p className="text-sm text-warning flex items-start gap-2">
                    <span className="text-lg"><LuTriangleAlert aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></span>
                    <span>
                      פעולה זו תמחק את כל {filteredEvents.length} האימונים בטווח זה לצמיתות!
                      אין אפשרות לשחזור.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            {allEvents.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={deleting}
                  className="flex-1 py-3 bg-raised text-fg-2 rounded-lg hover:bg-raised/90 transition disabled:opacity-50 font-medium"
                >
                  ביטול
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || filteredEvents.length === 0}
                  className="flex-1 py-3 bg-danger text-on-accent rounded-lg hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                >
                  {deleting ? '⏳ מוחק...' : `🗑️ מחק ${filteredEvents.length} אימונים`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6" dir="rtl">
            <h3 className="text-xl font-bold text-fg mb-4">
              <LuTriangleAlert aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />האם אתה בטוח?
            </h3>
            
            <div className="mb-6 space-y-3">
              <p className="text-fg-2">
                אתה עומד למחוק <strong className="text-danger">{filteredEvents.length} אימונים</strong> לצמיתות בטווח:
              </p>
              <p className="font-medium text-fg">
                {format(parseISO(`${startDate}T00:00:00`), 'dd/MM/yyyy')} - {format(parseISO(`${endDate}T00:00:00`), 'dd/MM/yyyy')}
              </p>
              <p className="text-danger font-bold">
                פעולה זו לא ניתנת לביטול!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={deleting}
                className="flex-1 py-3 bg-raised text-fg-2 rounded-lg hover:bg-raised/90 transition font-medium"
              >
                לא, חזור
              </button>
              <button
                onClick={handleConfirmedDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-danger text-on-accent rounded-lg hover:bg-danger/90 disabled:opacity-50 font-medium transition"
              >
                {deleting ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />מוחק...</> : 'כן, אני בטוח - מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}