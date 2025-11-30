'use client'

import { useState, useEffect } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
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
import DayListView from '@/components/calendar/DayListView'
import CalendarToolbar from '@/components/calendar/CalendarToolbar'

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
  const [view, setView] = useState<View>('day') // DEFAULT = DAY VIEW
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
      .select('CalendarID, WorkoutID, StartTime, EndTime, Completed, Deloading, DeloadingPercentage')
      .eq('Email', activeEmail)

    if (error) {
      console.error('❌ Error loading calendar:', error)
      setLoading(false)
      return
    }

    const { data: workoutsData } = await supabase
      .from('Workouts')
      .select('WorkoutID, Name')

    const workoutMap = Object.fromEntries(
      (workoutsData || []).map((w) => [w.WorkoutID, w.Name])
    )

    const mapped = data.map((item) => {
      const start = moment.utc(item.StartTime).local()
      let end = item.EndTime
        ? moment.utc(item.EndTime).local()
        : moment.utc(item.StartTime).add(1, 'hours').local()

      if (end.isAfter(start, 'day')) {
        end = moment(start).add(59, 'minutes')
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
      }
    })

    setEvents(mapped)
    setLoading(false)
  }

  const handleSelectSlot = (slotInfo: any) => {
    // אם במצב הוספת אימון
    if (isSelectingDate) {
      if (!activeEmail) return
      setModalInitialDate(slotInfo.start)
      setShowAddModal(true)
      setIsSelectingDate(false)
      return
    }
    
    // אחרת - מעבר לתצוגת יום של התאריך שנלחץ
    setDate(slotInfo.start)
    setView('day')
  }

  const handleAddButtonClick = () => {
    if (!activeEmail) {
      alert('לא נמצא אימייל משתמש')
      return
    }
    
    // ✨ אם בתצוגת יום - פתח modal ישירות עם התאריך הנוכחי
    if (view === 'day') {
      setModalInitialDate(date)
      setShowAddModal(true)
      return
    }
    
    // אחרת (תצוגת חודש) - מצב בחירת תאריך רגיל
    setIsSelectingDate(true)
  }

  const handleCancelSelection = () => {
    setIsSelectingDate(false)
  }

  const handleModalSuccess = async () => {
    await fetchCalendar()
  }

  const handleEventDrop = async ({ event, start, end }: any) => {
    const originalStart = moment(event.start)
    const newDate = moment(start)
    const newStart = newDate.hour(originalStart.hour()).minute(originalStart.minute()).second(0).toDate()
    const newEnd = moment(newStart).add(1, 'hour').toDate()

    try {
      const { error: calendarError } = await supabase
        .from('Calendar')
        .update({ StartTime: newStart, EndTime: newEnd })
        .eq('CalendarID', event.id)

      if (calendarError) throw calendarError

      const { error: climbingError } = await supabase
        .from('ClimbingLog')
        .update({ 
          LogDateTime: moment(newStart).format('YYYY-MM-DD HH:mm:ss'),
          UpdatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
        })
        .eq('CalendarID', event.id)

      if (climbingError) {
        console.error('⚠️ Error updating climbing logs:', climbingError)
      }

      const updated = events.map((e) =>
        e.id === event.id ? { ...e, start: newStart, end: newEnd } : e
      )
      setEvents(updated)
    } catch (error) {
      console.error('❌ Error updating event:', error)
    }
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

  const handleSaveEditedEvent = async (newDate: Date, newTime: 'morning' | 'afternoon' | 'evening') => {
    if (!selectedEvent) return

    const newEnd = moment(newDate).add(1, 'hour').toDate()

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

  // Navigation handler for day view
  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
  }

  // Back to month view
  const handleBackToMonth = () => {
    setView('month')
  }

  // Use DnD only when NOT in month view
  const ActiveCalendar = (isMobile || view === 'month') ? BigCalendar : DnDCalendar

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  if (!activeUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">אנא בחר משתמש</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">⌛</div>
          <p className="text-gray-600">טוען לוח שנה...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Page Title with View Selector */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-blue-600">📅 לוח אימונים</h1>
            
            {/* Simple View Selector - Only Month + Day */}
            <div className="flex gap-2">
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'day'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 יום
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'month'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🗓️ חודש
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={handleAddButtonClick}
        className={`fixed bottom-28 left-6 text-white text-3xl rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center justify-center ${
          isSelectingDate 
            ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        title={isSelectingDate ? 'בחר תאריך בלוח' : 'הוספת אימון חדש'}
      >
        +
      </button>

      {/* Date Selection Message */}
      {isSelectingDate && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-bounce pointer-events-none">
          <div className="text-center">
            <div className="text-2xl mb-2">👆</div>
            <div className="font-bold text-lg mb-1">בחר תאריך בלוח</div>
            <div className="text-sm opacity-90">לחץ על המשבצת הרצויה</div>
            <button
              onClick={handleCancelSelection}
              className="mt-3 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm transition-all pointer-events-auto"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
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
            onClose={() => setShowContextMenu(false)}
            eventTitle={selectedEvent.title}
            isCompleted={selectedEvent.completed}
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

      {/* Admin Actions */}
      {isAdmin && (
        <div className="fixed bottom-28 right-6 flex flex-col gap-2 z-40">
          <button
            onClick={() => setShowDuplicateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all"
            title="שכפול שבוע"
          >
            📋 שכפול שבוע
          </button>
          <button
            onClick={handleApplyDeloading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all"
            title="החל דילודינג"
          >
            🔵 דילודינג
          </button>
          <button
            onClick={handleRemoveDeloading}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all"
            title="הסר דילודינג"
          >
            ❌ הסר דילודינג
          </button>
        </div>
      )}

      {/* Calendar Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm p-4 overflow-hidden">
          {/* Simple: Day view or Month view */}
          {view === 'day' ? (
            <DayListView
              events={events}
              date={date}
              onEventClick={handleSelectEvent}
              onNavigate={handleNavigate}
              onBackToMonth={handleBackToMonth}
            />
          ) : (
            <ActiveCalendar
              localizer={localizer}
              rtl={true}
              events={events}
              startAccessor={"start" as any}
              endAccessor={"end" as any}
              style={{ height: 'calc(100vh - 150px)', minHeight: '600px' }}
              views={['month', 'week', 'day']}
              view={'month'}
              date={date}
              onView={() => {}}
              onNavigate={(newDate: Date) => setDate(newDate)}
              popup={false}
              onSelectEvent={!isMobile ? (event: any, e: any) => {
                e.preventDefault()
                e.stopPropagation()
                handleSelectEvent(event, e)
              } : undefined}
              selectable={true}
              onSelectSlot={handleSelectSlot}
              resizable={!isMobile && !isSelectingDate && view !== 'month'}
              draggableAccessor={() => !isMobile && !isSelectingDate && view !== 'month'}
              onEventDrop={!isSelectingDate && view !== 'month' ? handleEventDrop : undefined}
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