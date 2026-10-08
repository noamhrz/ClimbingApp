'use client'

import { useState, useEffect } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './calendar-custom.css'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import moment from 'moment-timezone'
import { useRouter } from 'next/navigation'
import EventComponent from '@/components/EventComponent'
import AddWorkoutModal from '@/components/AddWorkoutModal'
import DeloadingModal from '@/components/DeloadingModal'
import EventContextMenu from '@/components/EventContextMenu'
import EditEventModal from '@/components/EditEventModal'
import WeekDuplicateModal from '@/components/WeekDuplicateModal'
import DeleteRangeModal from '@/components/DeleteRangeModal'
import DayListView from '@/components/calendar/DayListView'
import CalendarToolbar from '@/components/calendar/CalendarToolbar'
import { copyPreviousWorkout } from '@/utils/copyPreviousWorkout'
import { LuPlus, LuCalendarDays, LuList, LuCalendar, LuCopy, LuBatteryLow, LuX, LuTrash2, LuSave } from 'react-icons/lu'
import { PageSkeleton } from '@/components/ui/Skeleton'

moment.locale('he')
moment.tz.setDefault('Asia/Jerusalem')
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop(BigCalendar)

// Types
interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  completed: boolean
  color: string
  WorkoutID: number
  Deloading?: boolean
  DeloadingPercentage?: number | null
  StartTime?: string | Date
  Order?: number | null
  EstimatedTotalTime?: number | null
  CoachNote?: string
}

interface Workout {
  id: number
  name: string
  category?: string
}

export default function CalendarPage() {
  const { activeUser, currentUser, loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  const isAdmin = currentUser?.Role === 'admin' || currentUser?.Role === 'coach'
  const router = useRouter()

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(new Date())
  const [isMobile, setIsMobile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>()
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSelectingDate, setIsSelectingDate] = useState(false)
  const [showDeloadingModal, setShowDeloadingModal] = useState(false)
  const [deloadingMode, setDeloadingMode] = useState<'apply' | 'remove'>('apply')
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showDeleteRangeModal, setShowDeleteRangeModal] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Map<number, {
    newDate: string
    newOrder: number
    newStartTime: Date
    newEndTime: Date
  }>>(new Map())
  const [originalSnapshot, setOriginalSnapshot] = useState<Map<number, {
    StartTime: Date
    EndTime: Date
    Order: number | null
  }>>(new Map())
  const hasPendingChanges = pendingChanges.size > 0

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch data when activeEmail changes
  useEffect(() => {
    if (!activeEmail) return
    fetchWorkouts()
    fetchCalendar()
  }, [activeEmail])

  // Fetch workouts assigned to user
  const fetchWorkouts = async () => {
    if (!activeEmail) return

    const { data: userWorkouts, error: relError } = await supabase
      .from('WorkoutsForUser')
      .select('WorkoutID')
      .eq('Email', activeEmail)

    if (relError) {
      console.error('❌ Error fetching WorkoutsForUser:', relError)
      return
    }

    const workoutIds = (userWorkouts || []).map((w) => w.WorkoutID)
    if (workoutIds.length === 0) {
      setWorkouts([])
      return
    }

    const { data, error } = await supabase
      .from('Workouts')
      .select('WorkoutID, Name, Category')
      .in('WorkoutID', workoutIds)

    if (error) {
      console.error('❌ Error loading workouts:', error)
    } else {
      setWorkouts(data.map((w) => ({ 
        id: w.WorkoutID, 
        name: w.Name,
        category: w.Category 
      })))
    }
  }

  // Fetch calendar events
  const fetchCalendar = async () => {
    if (!activeEmail) return

    const { data, error } = await supabase
      .from('Calendar')
      .select('CalendarID, WorkoutID, StartTime, EndTime, Completed, Deloading, DeloadingPercentage, Order')
      .eq('Email', activeEmail)

    if (error) {
      console.error('❌ Error loading calendar:', error)
      setLoading(false)
      return
    }

    // Personal coach notes for this trainee (set in workout assignment)
    const { data: notesData } = await supabase
      .from('WorkoutsForUser')
      .select('WorkoutID, Notes, CoachNote')
      .eq('Email', activeEmail)
    const noteMap: Record<number, string> = Object.fromEntries(
      (notesData || []).map((n) => [n.WorkoutID, ((n.Notes || n.CoachNote || '') as string).trim()])
    )

    const { data: workoutsData } = await supabase
      .from('Workouts')
      .select('WorkoutID, Name, EstimatedTotalTime, EstimatedClimbingTime, CalculatedExercisesTime, containClimbing, containExercise')

    const workoutMap = Object.fromEntries(
      (workoutsData || []).map((w) => [w.WorkoutID, w.Name])
    )
    const workoutDetailsMap = Object.fromEntries(
      (workoutsData || []).map((w) => [w.WorkoutID, w])
    )
    const durationMap = Object.fromEntries(
      (workoutsData || []).map((w) => [w.WorkoutID, w.EstimatedTotalTime || 60])
    )

    const getDisplayTime = (workoutId: number): number | null => {
      const w = workoutDetailsMap[workoutId]
      if (!w) return null
      if (w.containClimbing || w.containExercise) {
        return (w.CalculatedExercisesTime || 0) + (w.EstimatedClimbingTime || 0)
      }
      return w.EstimatedTotalTime ?? null
    }

    const mapped = data.map((item) => {
      const start = moment.utc(item.StartTime).local()
      let end = item.EndTime
        ? moment.utc(item.EndTime).local()
        : moment.utc(item.StartTime).add(1, 'hours').local()

      if (end.isAfter(start, 'day') || end.isBefore(start)) {
        end = moment(start).add(durationMap[item.WorkoutID] || 60, 'minutes')
      }

      const startDate = start.toDate()
      const endDate = end.toDate()

      return {
        id: item.CalendarID,
        title: workoutMap[item.WorkoutID] || `Workout #${item.WorkoutID}`,
        start: startDate,
        end: endDate,
        completed: item.Completed,
        color: '',
        WorkoutID: item.WorkoutID,
        Deloading: item.Deloading,
        DeloadingPercentage: item.DeloadingPercentage,
        StartTime: item.StartTime,
        Order: item.Order ?? null,
        EstimatedTotalTime: getDisplayTime(item.WorkoutID),
        CoachNote: noteMap[item.WorkoutID] || '',
      }
    })

    // Normalize start times to encode Order via minute offset,
    // so month view (sorted by time) matches day view (sorted by Order).
    const dayGroups = new Map<string, typeof mapped>()
    mapped.forEach(ev => {
      const key = moment(ev.start).format('YYYY-MM-DD')
      if (!dayGroups.has(key)) dayGroups.set(key, [])
      dayGroups.get(key)!.push(ev)
    })

    const normalized: typeof mapped = []
    dayGroups.forEach(dayEvents => {
      dayEvents.sort((a, b) => {
        const aOrder = a.Order ?? 0
        const bOrder = b.Order ?? 0
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.start.getTime() - b.start.getTime()
      })
      dayEvents.forEach((ev, i) => {
        const newStart = moment(ev.start).startOf('day').minute(i).second(0).millisecond(0).toDate()
        const duration = ev.end.getTime() - ev.start.getTime()
        normalized.push({ ...ev, start: newStart, end: new Date(newStart.getTime() + duration) })
      })
    })

    setEvents(normalized)
    setLoading(false)
  }

  const handleSelectSlot = (slotInfo: any) => {
    if (isSelectingDate) {
      if (!activeEmail) return
      setModalInitialDate(slotInfo.start)
      setShowAddModal(true)
      setIsSelectingDate(false)
      return
    }
    
    setDate(slotInfo.start)
    setView('day')
  }

  const handleAddButtonClick = () => {
    if (!activeEmail) {
      alert('לא נמצא אימייל משתמש')
      return
    }
    
    if (view === 'day') {
      setModalInitialDate(date)
      setShowAddModal(true)
      return
    }
    
    setIsSelectingDate(true)
  }

  const handleCancelSelection = () => {
    setIsSelectingDate(false)
  }

  const handleModalSuccess = async () => {
    await fetchCalendar()
  }

  const handleEventDrop = ({ event, start }: any) => {
    if (isMobile || isSelectingDate) return

    const isSameDay = moment(start).format('YYYY-MM-DD') === moment(event.start).format('YYYY-MM-DD')
    if (view === 'month' && isSameDay) return

    const originalStart = moment(event.start)
    const newStart = moment(start)
      .hour(originalStart.hour())
      .minute(originalStart.minute())
      .second(0)
      .millisecond(0)
      .toDate()

    const durationMs = event.end.getTime() - event.start.getTime()
    const newEnd = new Date(newStart.getTime() + durationMs)

    const targetDateStr = moment(start).format('YYYY-MM-DD')
    const eventsOnTargetDay = events
      .filter(e => e.id !== event.id && moment(e.start).format('YYYY-MM-DD') === targetDateStr)
      .sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0))
    const newOrder = eventsOnTargetDay.length

    setOriginalSnapshot(prev => {
      if (prev.has(event.id)) return prev
      return new Map(prev).set(event.id, {
        StartTime: event.start,
        EndTime: event.end,
        Order: event.Order ?? null,
      })
    })

    setPendingChanges(prev => new Map(prev).set(event.id, {
      newDate: targetDateStr,
      newOrder,
      newStartTime: newStart,
      newEndTime: newEnd,
    }))

    setEvents(prev => prev.map(e =>
      e.id === event.id ? { ...e, start: newStart, end: newEnd, Order: newOrder } : e
    ))
  }

  const handleDayReorder = async (orderedIds: number[]) => {
    const currentEvents = events

    // Fetch EstimatedTotalTime for all affected workouts in one query
    const workoutIds = [...new Set(
      orderedIds
        .map(id => currentEvents.find(e => e.id === id)?.WorkoutID)
        .filter((wid): wid is number => wid !== undefined)
    )]
    const { data: workoutsData } = await supabase
      .from('Workouts')
      .select('WorkoutID, EstimatedTotalTime')
      .in('WorkoutID', workoutIds)
    const durationMap = new Map(
      (workoutsData || []).map(w => [w.WorkoutID, w.EstimatedTotalTime || 60])
    )

    setOriginalSnapshot(prev => {
      const next = new Map(prev)
      orderedIds.forEach(id => {
        if (!next.has(id)) {
          const ev = currentEvents.find(e => e.id === id)
          if (ev) next.set(id, { StartTime: ev.start, EndTime: ev.end, Order: ev.Order ?? null })
        }
      })
      return next
    })

    setPendingChanges(prev => {
      const next = new Map(prev)
      orderedIds.forEach((id, index) => {
        const existingPending = prev.get(id)
        const ev = currentEvents.find(e => e.id === id)
        if (!ev) return
        const baseStart = existingPending?.newStartTime ?? ev.start
        const newStartTime = moment(baseStart).startOf('day').minute(index).second(0).millisecond(0).toDate()
        const durationMinutes = durationMap.get(ev.WorkoutID) || 60
        const newEndTime = moment(newStartTime).add(durationMinutes, 'minutes').toDate()
        next.set(id, {
          newDate: moment(baseStart).format('YYYY-MM-DD'),
          newOrder: index,
          newStartTime,
          newEndTime,
        })
      })
      return next
    })

    setEvents(prev => prev.map(e => {
      const newIndex = orderedIds.indexOf(e.id)
      if (newIndex === -1) return e
      const newStartTime = moment(e.start).startOf('day').minute(newIndex).second(0).millisecond(0).toDate()
      const durationMinutes = durationMap.get(e.WorkoutID) || 60
      const newEndTime = moment(newStartTime).add(durationMinutes, 'minutes').toDate()
      return { ...e, Order: newIndex, start: newStartTime, end: newEndTime }
    }))
  }

  const handleSavePendingChanges = async () => {
    try {
      for (const [calendarId, change] of pendingChanges) {
        const { error } = await supabase
          .from('Calendar')
          .update({
            StartTime: change.newStartTime.toISOString(),
            EndTime: change.newEndTime.toISOString(),
            Order: change.newOrder,
          })
          .eq('CalendarID', calendarId)
        if (error) throw error
      }

      setOriginalSnapshot(prev => {
        const next = new Map(prev)
        for (const [id, change] of pendingChanges) {
          next.set(id, { StartTime: change.newStartTime, EndTime: change.newEndTime, Order: change.newOrder })
        }
        return next
      })
      setPendingChanges(new Map())
    } catch (error) {
      console.error('❌ Error saving pending changes:', error)
      alert('שגיאה בשמירת השינויים')
    }
  }

  const handleCancelPendingChanges = () => {
    setEvents(prev => prev.map(event => {
      const snapshot = originalSnapshot.get(event.id)
      if (snapshot && pendingChanges.has(event.id)) {
        return { ...event, start: snapshot.StartTime, end: snapshot.EndTime, Order: snapshot.Order }
      }
      return event
    }))
    setPendingChanges(new Map())
    setOriginalSnapshot(new Map())
  }

  const handleSelectEvent = (event: CalendarEvent, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    setSelectedEvent(event)
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    setContextMenuPosition({ x: centerX, y: centerY })
    setShowContextMenu(true)
  }

  const handleEventLongPress = (event: CalendarEvent, position: { x: number; y: number }) => {
    handleStartWorkout(event)
  }

  const handleStartWorkout = (event: CalendarEvent) => {
    if (event.completed) {
      router.push(`/calendar-edit/${event.id}`)
    } else {
      router.push(`/workout/${event.WorkoutID}?calendar=${event.id}`)
    }
  }

  const handleEditDate = () => {
    if (selectedEvent) {
      setShowEditModal(true)
    }
  }

  const handleStartNow = () => {
    if (selectedEvent) {
      setShowContextMenu(false)
      handleStartWorkout(selectedEvent)
    }
  }

  const handleMarkCompletedWithPrevious = async () => {
    if (!selectedEvent || !activeEmail) return

    const result = await copyPreviousWorkout(selectedEvent.id, activeEmail)
    if (result.success) {
      await fetchCalendar()
    }
    alert(result.message)
  }

  const handleSaveEditedEvent = async (newDate: Date, newTime: 'morning' | 'afternoon' | 'evening') => {
    if (!selectedEvent) return

    const { data: workoutData } = await supabase
      .from('Workouts')
      .select('EstimatedTotalTime')
      .eq('WorkoutID', selectedEvent.WorkoutID)
      .single()
    
    const durationMinutes = workoutData?.EstimatedTotalTime || 60
    const newEnd = moment(newDate).add(durationMinutes, 'minutes').toDate()

    try {
      const { error: calendarError } = await supabase
        .from('Calendar')
        .update({ StartTime: newDate, EndTime: newEnd })
        .eq('CalendarID', selectedEvent.id)

      if (calendarError) throw calendarError

      const { error: climbingError } = await supabase
        .from('ClimbingLog')
        .update({ 
          LogDateTime: moment(newDate).format('YYYY-MM-DD HH:mm:ss'),
          UpdatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
        })
        .eq('CalendarID', selectedEvent.id)

      if (climbingError) {
        console.error('⚠️ Error updating climbing logs:', climbingError)
      }

      await fetchCalendar()
    } catch (error) {
      console.error('❌ Error updating event:', error)
      alert('שגיאה בעדכון אימון')
    }
  }

  const handleDeleteEvent = async (id: number) => {
    const confirmDelete = confirm('האם למחוק את האימון?')
    if (!confirmDelete) return

    const { error } = await supabase.from('Calendar').delete().eq('CalendarID', id)
    if (error) {
      console.error('❌ Error deleting event:', error)
      alert('שגיאה במחיקת אימון')
    } else {
      setEvents(events.filter((e) => e.id !== id))
      setShowContextMenu(false)
    }
  }

  const handleApplyDeloading = () => {
    setDeloadingMode('apply')
    setShowDeloadingModal(true)
  }

  const handleRemoveDeloading = () => {
    setDeloadingMode('remove')
    setShowDeloadingModal(true)
  }

  const handleDeloadingSuccess = async () => {
    await fetchCalendar()
  }

  const handleDeleteRangeSuccess = async () => {
    await fetchCalendar()
  }

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
  }

  const handleBackToMonth = () => {
    if (isMobile) return
    setView('month')
  }

  const ActiveCalendar = isMobile ? BigCalendar : DnDCalendar

  if (authLoading) {
    return (
      <PageSkeleton variant="calendar" label="טוען..." />
    )
  }

  if (!activeUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-fg-3">אנא בחר משתמש</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <PageSkeleton variant="calendar" label="טוען לוח שנה..." />
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-surface pb-20">
      <div className="bg-surface border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-fg inline-flex items-center gap-2"><LuCalendarDays aria-hidden className="w-5 h-5 text-accent" />לוח אימונים</h1>
            
            <div className="flex gap-2">
              <button
                onClick={() => setView('day')}
                className={`inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full font-medium transition-all ${
 view === 'day'
 ? 'bg-accent text-on-accent '
 : 'bg-surface text-fg-2 border border-line-strong hover:bg-raised'
 }`}
              >
                <LuList aria-hidden className="w-4 h-4 shrink-0" />יום
              </button>
              <button
                onClick={() => setView('month')}
                className={`inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full font-medium transition-all ${
 view === 'month'
 ? 'bg-accent text-on-accent '
 : 'bg-surface text-fg-2 border border-line-strong hover:bg-raised'
 }`}
              >
                <LuCalendar aria-hidden className="w-4 h-4 shrink-0" />חודש
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleAddButtonClick}
        className={`fixed bottom-28 max-md:bottom-40 left-6 text-on-accent text-3xl rounded-full w-16 h-16 shadow-lg transition-all duration-200 z-40 flex items-center justify-center ${
 isSelectingDate 
 ? 'bg-warning hover:bg-warning/90 animate-pulse' 
 : 'bg-accent hover:bg-accent-hover'
 }`}
        title={isSelectingDate ? 'בחר תאריך בלוח' : 'הוספת אימון חדש'}
        aria-label={isSelectingDate ? 'בחר תאריך בלוח' : 'הוספת אימון חדש'}
      >
        <LuPlus aria-hidden className="w-8 h-8" strokeWidth={2.5} />
      </button>

      {isSelectingDate && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 text-fg px-6 py-4 rounded-xl shadow-2xl z-50 animate-bounce pointer-events-none bg-surface border border-line">
          <div className="text-center">
            <div className="text-2xl mb-2">👆</div>
            <div className="font-bold text-lg mb-1">בחר תאריך בלוח</div>
            <div className="text-sm opacity-90">לחץ על המשבצת הרצויה</div>
            <button
              onClick={handleCancelSelection}
              className="mt-3 px-4 py-2 bg-raised border border-line-strong hover:bg-line-strong rounded-lg text-sm transition-all pointer-events-auto"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {activeEmail && (
        <>
          <AddWorkoutModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSuccess={handleModalSuccess}
            email={activeEmail}
            availableWorkouts={workouts}
            initialDate={modalInitialDate}
          />
          
          <DeloadingModal
            isOpen={showDeloadingModal}
            onClose={() => setShowDeloadingModal(false)}
            onSuccess={handleDeloadingSuccess}
            email={activeEmail}
            mode={deloadingMode}
          />
          
          <WeekDuplicateModal
            isOpen={showDuplicateModal}
            onClose={() => setShowDuplicateModal(false)}
            onSuccess={handleModalSuccess}
            email={activeEmail}
          />
          
          <DeleteRangeModal
            isOpen={showDeleteRangeModal}
            onClose={() => setShowDeleteRangeModal(false)}
            onSuccess={handleDeleteRangeSuccess}
            email={activeEmail}
          />
        </>
      )}

      {selectedEvent && (
        <>
          <EventContextMenu
            isOpen={showContextMenu}
            position={contextMenuPosition}
            onEdit={handleEditDate}
            onDelete={() => handleDeleteEvent(selectedEvent.id)}
            onStartNow={handleStartNow}
            onMarkCompleted={handleMarkCompletedWithPrevious}
            onClose={() => setShowContextMenu(false)}
            eventTitle={selectedEvent.title}
            isCompleted={selectedEvent.completed}
            eventDate={selectedEvent.start}
          />
          
          <EditEventModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveEditedEvent}
            eventTitle={selectedEvent.title}
            currentDate={selectedEvent.start}
          />
        </>
      )}

      {isAdmin && (
        <div className="fixed bottom-28 max-md:bottom-40 right-4 md:right-6 flex flex-col gap-2 z-40">
          <button
            onClick={() => setShowDuplicateModal(true)}
            className="inline-flex items-center gap-1.5 bg-info hover:bg-info text-on-accent px-4 py-2 rounded-lg text-sm font-medium transition-all"
            title="שכפול שבוע"
          >
            <LuCopy aria-hidden className="w-4 h-4 shrink-0" />שכפול שבוע
          </button>
          <button
            onClick={handleApplyDeloading}
            className="inline-flex items-center gap-1.5 bg-info hover:bg-info text-on-accent px-4 py-2 rounded-lg text-sm font-medium transition-all"
            title="החל דילודינג"
          >
            <LuBatteryLow aria-hidden className="w-4 h-4 shrink-0" />דילודינג
          </button>
          <button
            onClick={handleRemoveDeloading}
            className="inline-flex items-center gap-1.5 bg-raised hover:bg-raised/90 text-fg px-4 py-2 rounded-lg text-sm font-medium transition-all"
            title="הסר דילודינג"
          >
            <LuX aria-hidden className="w-4 h-4 shrink-0" />הסר דילודינג
          </button>
          <button
            onClick={() => setShowDeleteRangeModal(true)}
            className="inline-flex items-center gap-1.5 bg-danger hover:bg-danger/90 text-on-accent px-4 py-2 rounded-lg text-sm font-medium transition-all"
            title="נקה טווח תאריכים"
          >
            <LuTrash2 aria-hidden className="w-4 h-4 shrink-0" />נקה טווח
          </button>
        </div>
      )}

      {!isMobile && hasPendingChanges && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-raised border border-warning/40 text-warning px-6 py-3 rounded-xl shadow-lg whitespace-nowrap">
          <span className="font-medium text-sm">יש שינויים שלא נשמרו</span>
          <button
            onClick={handleSavePendingChanges}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover text-on-accent rounded-lg text-sm font-medium transition-all"
          >
            <LuSave aria-hidden className="w-4 h-4 shrink-0" />שמור שינויים
          </button>
          <button
            onClick={handleCancelPendingChanges}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-raised hover:bg-raised/90 text-fg-2 rounded-lg text-sm font-medium transition-all"
          >
            <LuX aria-hidden className="w-4 h-4 shrink-0" />בטל
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-surface rounded-xl p-4 overflow-hidden">
          {view === 'day' ? (
            <DayListView
              events={events}
              date={date}
              onEventClick={handleSelectEvent}
              onNavigate={handleNavigate}
              onBackToMonth={handleBackToMonth}
              onReorder={!isMobile ? handleDayReorder : undefined}
              pendingIds={new Set(pendingChanges.keys())}
              isDesktop={!isMobile}
            />
          ) : (
            <ActiveCalendar
              localizer={localizer}
              rtl={true}
              events={[...events].sort((a, b) => {
                const dateA = a.start.toDateString()
                const dateB = b.start.toDateString()
                if (dateA !== dateB) return a.start.getTime() - b.start.getTime()
                return (a.Order ?? 999) - (b.Order ?? 999)
              })}
              startAccessor={"start" as any}
              endAccessor={"end" as any}
              style={{ height: 'calc(100vh - 150px)', minHeight: '600px' }}
              views={['month', 'week', 'day']}
              view={"month" as View}
              date={date}
              onView={() => {}}
              onNavigate={(newDate: Date) => setDate(newDate)}
              popup={false}
              onSelectEvent={(event: any, e: any) => {
                if (e) {
                  e.preventDefault()
                  e.stopPropagation()
                }
                handleSelectEvent(event, e)
              }}
              selectable={true}
              onSelectSlot={handleSelectSlot}
              resizable={false}
              draggableAccessor={() => !isSelectingDate}
              onEventDrop={!isSelectingDate ? handleEventDrop : undefined}
              components={{
                toolbar: CalendarToolbar as any,
                event: (props: any) => (
                  <EventComponent
                    event={props.event as CalendarEvent}
                    onDelete={handleDeleteEvent}
                    onLongPress={handleEventLongPress}
                    isAdmin={isAdmin}
                    isMobile={isMobile}
                  />
                ),
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}