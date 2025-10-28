'use client'

import { useState, useEffect } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { supabase } from '@/lib/supabaseClient'
import { useUserContext } from '@/context/UserContext'
import moment from 'moment-timezone'
import { useRouter } from 'next/navigation'
import EventComponent from '@/components/EventComponent'
import AddWorkoutModal from '@/components/AddWorkoutModal'
import EventContextMenu from '@/components/EventContextMenu'
import EditEventModal from '@/components/EditEventModal'

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
}

interface Workout {
  id: number
  name: string
  category?: string
}

export default function CalendarPage() {
  const { selectedUser } = useUserContext()
  const email = selectedUser?.Email
  const isAdmin = selectedUser?.Role === 'admin'
  const router = useRouter()

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [isMobile, setIsMobile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>()
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSelectingDate, setIsSelectingDate] = useState(false)

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

  // Fetch data on mount
  useEffect(() => {
    if (!email) return
    fetchWorkouts()
    fetchCalendar()
  }, [email])

  // Fetch workouts assigned to user
  const fetchWorkouts = async () => {
    if (!email) return

    const { data: userWorkouts, error: relError } = await supabase
      .from('WorkoutsForUser')
      .select('WorkoutID')
      .eq('Email', email)

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
    if (!email) return

    const { data, error } = await supabase
      .from('Calendar')
      .select('CalendarID, WorkoutID, StartTime, EndTime, Completed, Color')
      .eq('Email', email)

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

      // Fix events that cross midnight
      if (end.isAfter(start, 'day')) {
        end = moment(start).add(59, 'minutes')
      }

      const startDate = start.toDate()
      const endDate = end.toDate()

      let color = item.Color
      if (!color) {
        if (item.Completed) color = '#10b981' // Green - Completed
        else if (moment(item.StartTime).isAfter(moment())) color = '#3b82f6' // Blue - Upcoming
        else if (moment(item.StartTime).isSame(moment(), 'day')) color = '#f97316' // Orange - Today
        else color = '#ef4444' // Red - Missed/Past
      }

      return {
        id: item.CalendarID,
        title: workoutMap[item.WorkoutID] || `Workout #${item.WorkoutID}`,
        start: startDate,
        end: endDate,
        completed: item.Completed,
        color,
        WorkoutID: item.WorkoutID,
      }
    })

    setEvents(mapped)
    setLoading(false)
  }

  // Handle slot click - open add modal with selected date (only when in selection mode)
  const handleSelectSlot = (slotInfo: any) => {
    if (!isSelectingDate) return
    if (!email) return
    
    // Open modal with the selected date (even if no workouts - modal will show the message)
    setModalInitialDate(slotInfo.start)
    setShowAddModal(true)
    setIsSelectingDate(false)
  }

  // Start date selection mode
  const handleAddButtonClick = () => {
    if (!email) {
      alert('לא נמצא אימייל משתמש')
      return
    }

    // Allow entering selection mode even if no workouts - they'll see the message in modal
    setIsSelectingDate(true)
  }

  // Cancel date selection mode
  const handleCancelSelection = () => {
    setIsSelectingDate(false)
  }

  // Handle successful workout addition
  const handleModalSuccess = async () => {
    await fetchCalendar()
  }

  // Handle drag & drop (desktop only)
  const handleEventDrop = async ({ event, start, end }: any) => {
    const newStart = moment(start).toDate()
    const newEnd = moment(end).toDate()

    const { error } = await supabase
      .from('Calendar')
      .update({ StartTime: newStart, EndTime: newEnd })
      .eq('CalendarID', event.id)

    if (error) {
      console.error('❌ Error updating event:', error)
    } else {
      const updated = events.map((e) =>
        e.id === event.id ? { ...e, start: newStart, end: newEnd } : e
      )
      setEvents(updated)
    }
  }

  // Handle event selection - Navigate directly to workout detail
  const handleSelectEvent = (event: CalendarEvent, e?: React.SyntheticEvent) => {
    // Prevent cell selection when clicking event
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    router.push(`/workout/${event.WorkoutID}`)
  }

  // Delete event
  const handleDeleteEvent = async (id: number) => {
    const confirmDelete = confirm('האם למחוק את האימון?')
    if (!confirmDelete) return

    const { error } = await supabase.from('Calendar').delete().eq('CalendarID', id)
    if (error) {
      console.error('❌ Error deleting event:', error)
      alert('שגיאה במחיקת אימון')
    } else {
      setEvents(events.filter((e) => e.id !== id))
    }
  }

  // Handle long press - show context menu
  const handleEventLongPress = (event: CalendarEvent, position: { x: number; y: number }) => {
    setSelectedEvent(event)
    setContextMenuPosition(position)
    setShowContextMenu(true)
  }

  // Handle edit event from context menu
  const handleEditEvent = () => {
    if (selectedEvent) {
      setShowEditModal(true)
    }
  }

  // Handle save edited event
  const handleSaveEditedEvent = async (newDate: Date, newTime: 'morning' | 'afternoon' | 'evening') => {
    if (!selectedEvent) return

    const newEnd = moment(newDate).add(1, 'hour').toDate()

    const { error } = await supabase
      .from('Calendar')
      .update({ StartTime: newDate, EndTime: newEnd })
      .eq('CalendarID', selectedEvent.id)

    if (error) {
      console.error('❌ Error updating event:', error)
      alert('שגיאה בעדכון אימון')
    } else {
      await fetchCalendar()
    }
  }

  // Always use DnDCalendar for drag and drop on all devices
  const CalendarComponent = DnDCalendar

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
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-blue-600">📅 לוח אימונים</h1>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={handleAddButtonClick}
        className={`fixed bottom-6 left-6 text-white text-3xl rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center justify-center ${
          isSelectingDate 
            ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        title={isSelectingDate ? 'בחר תאריך בלוח' : 'הוספת אימון חדש'}
      >
        +
      </button>

      {/* Date Selection Message - No overlay, just floating message */}
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

      {/* Add Workout Modal */}
      {email && (
        <AddWorkoutModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleModalSuccess}
          email={email}
          availableWorkouts={workouts}
          initialDate={modalInitialDate}
        />
      )}

      {/* Event Context Menu */}
      {selectedEvent && (
        <EventContextMenu
          isOpen={showContextMenu}
          position={contextMenuPosition}
          onEdit={handleEditEvent}
          onDelete={() => handleDeleteEvent(selectedEvent.id)}
          onClose={() => setShowContextMenu(false)}
          eventTitle={selectedEvent.title}
        />
      )}

      {/* Edit Event Modal */}
      {selectedEvent && (
        <EditEventModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEditedEvent}
          eventTitle={selectedEvent.title}
          currentDate={selectedEvent.start}
        />
      )}

      {/* Calendar - Full Width */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm p-4 overflow-hidden">
          <CalendarComponent
            localizer={localizer}
            rtl={true}
            events={events}
            startAccessor={"start" as any}
            endAccessor={"end" as any}
            style={{ height: 'calc(100vh - 150px)', minHeight: '600px' }}
            views={['month', 'week', 'day']}
            view={view}
            date={date}
            onView={(newView: View) => setView(newView)}
            onNavigate={(newDate: Date) => setDate(newDate)}
            popup={true}
            // Event click handler - works on both mobile and desktop
            onSelectEvent={(event: any, e: any) => {
              e.preventDefault()
              e.stopPropagation()
              handleSelectEvent(event, e)
            }}
            // Enable slot selection only when in date selection mode
            selectable={isSelectingDate}
            onSelectSlot={handleSelectSlot}
            // Drag & drop - disabled during date selection to avoid conflicts
            resizable={!isMobile && !isSelectingDate}
            draggableAccessor={() => !isMobile && !isSelectingDate}
            onEventDrop={!isSelectingDate ? handleEventDrop : undefined}
            // Event styling
            eventPropGetter={(event: any) => ({
              style: {
                backgroundColor: event.color,
                borderRadius: '8px',
                border: 'none',
                color: 'white',
                fontSize: '0.875rem',
                padding: '4px',
                cursor: 'pointer',
              },
            })}
            components={{
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
        </div>
      </div>
    </div>
  )
}
