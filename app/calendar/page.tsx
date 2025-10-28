'use client'

import { useState, useEffect } from 'react'
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { supabase } from '@/lib/supabaseClient'
import { useUserContext } from '@/context/UserContext'
import moment from 'moment-timezone'
import { useRouter } from 'next/navigation'
import { FaPlay, FaTimes, FaEdit } from 'react-icons/fa'

moment.locale('he')
moment.tz.setDefault('Asia/Jerusalem')
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop(BigCalendar)

export default function CalendarPage() {
  const { selectedUser } = useUserContext()
  const email = selectedUser?.email || selectedUser?.Email
  const router = useRouter()

  const [events, setEvents] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('week')
  const [date, setDate] = useState(new Date())
  const [isMobile, setIsMobile] = useState(false)
  const [editModalEvent, setEditModalEvent] = useState(null)

  // 📱 Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!email) return
    fetchWorkouts()
    fetchCalendar()
  }, [email])

  // 📦 שליפת אימונים של המשתמש בלבד
  const fetchWorkouts = async () => {
    const { data: userWorkouts, error: relError } = await supabase
      .from('WorkoutsForUser')
      .select('WorkoutID')
      .eq('Email', email)

    if (relError) {
      console.error('❌ שגיאה בשליפת WorkoutsForUser:', relError)
      return
    }

    const workoutIds = (userWorkouts || []).map((w) => w.WorkoutID)
    if (workoutIds.length === 0) {
      setWorkouts([])
      return
    }

    const { data, error } = await supabase
      .from('Workouts')
      .select('WorkoutID, Name')
      .in('WorkoutID', workoutIds)

    if (error) console.error('❌ שגיאה בטעינת אימונים:', error)
    else setWorkouts(data.map((w) => ({ id: w.WorkoutID, name: w.Name })))
  }

  // 🗓️ שליפת אירועים
  const fetchCalendar = async () => {
    const { data, error } = await supabase
      .from('Calendar')
      .select('CalendarID, WorkoutID, StartTime, EndTime, Completed, Color')
      .eq('Email', email)

    if (error) return console.error('❌ שגיאה בטעינת אירועים:', error)

    const { data: workoutsData } = await supabase
      .from('Workouts')
      .select('WorkoutID, Name')

    const workoutMap = Object.fromEntries(
      (workoutsData || []).map((w) => [w.WorkoutID, w.Name])
    )

    // 🩹 מיפוי עם תיקון לתאריכים חוצים
    const mapped = data.map((item) => {
      const start = moment.utc(item.StartTime).local()
      let end = item.EndTime
        ? moment.utc(item.EndTime).local()
        : moment.utc(item.StartTime).add(1, 'hours').local()

      // אם האירוע עובר ליום הבא — תקן אותו להיות באותו היום בלבד
      if (end.isAfter(start, 'day')) {
        end = moment(start).add(59, 'minutes')
      }

      const startDate = start.toDate()
      const endDate = end.toDate()

      let color = item.Color
      if (!color) {
        if (item.Completed) color = 'green'
        else if (moment(item.StartTime).isAfter(moment())) color = 'blue'
        else if (moment(item.StartTime).isSame(moment(), 'day')) color = 'orange'
        else color = 'red'
      }

      return {
        id: item.CalendarID,
        title: workoutMap[item.WorkoutID] || `אימון #${item.WorkoutID}`,
        start: startDate,
        end: endDate,
        completed: item.Completed,
        color,
      }
    })

    setEvents(mapped)
    setLoading(false)
  }

  // ➕ הוספת אימון
  const handleSelectSlot = async ({ start }) => {
    if (!email) return alert('לא נמצא אימייל משתמש')

    let selected = selectedWorkout
    if (!selected) {
      if (workouts.length === 0) return alert('אין אימונים זמינים')
      const workoutNames = workouts.map((w, i) => `${i + 1}. ${w.name}`).join('\n')
      const choice = prompt(
        `בחר אימון לתאריך ${moment(start).format('DD/MM/YYYY')}:\n${workoutNames}`
      )
      const index = parseInt(choice) - 1
      if (isNaN(index) || index < 0 || index >= workouts.length) return
      selected = workouts[index]
    }

    const startTime = moment(start).toDate()
    const endTime = moment(startTime).add(1, 'hours').toDate()

    const { error } = await supabase.from('Calendar').insert({
      Email: email,
      WorkoutID: selected.id,
      StartTime: startTime,
      EndTime: endTime,
      Completed: false,
      Color: 'blue',
    })

    if (error) {
      console.error('❌ שגיאה בהוספה:', error)
      alert('שגיאה בהוספת אימון')
    } else {
      await fetchCalendar()
      setSelectedWorkout(null)
    }
  }

  // 🔄 גרירת אירוע (תיקון לגרירה ב־RTL)
  const handleEventDrop = async ({ event, start, end }) => {
    console.log('🔄 Event dropped!', { event, start, end })
    
    const newStart = moment(start).toDate()
    const newEnd = moment(end).toDate()

    if (moment(newEnd).isBefore(newStart)) {
      const tmp = newStart
      start = newEnd
      end = tmp
    }

    console.log('📝 Updating event in database:', { id: event.id, newStart, newEnd })

    const { error } = await supabase
      .from('Calendar')
      .update({ StartTime: newStart, EndTime: newEnd })
      .eq('CalendarID', event.id)

    if (error) console.error('❌ שגיאה בעדכון:', error)
    else {
      console.log('✅ Event updated successfully')
      const updated = events.map((e) =>
        e.id === event.id ? { ...e, start: newStart, end: newEnd } : e
      )
      setEvents(updated)
    }
  }

  // ❌ מחיקת אירוע
  const handleDeleteEvent = async (id) => {
    const confirmDelete = confirm('למחוק את האימון הזה?')
    if (!confirmDelete) return

    const { error } = await supabase.from('Calendar').delete().eq('CalendarID', id)
    if (error) console.error('❌ שגיאה במחיקה:', error)
    else setEvents(events.filter((e) => e.id !== id))
  }

  // 📱 Mobile: Handle event tap to open edit modal
  const handleSelectEvent = (event: any) => {
    if (isMobile) {
      setEditModalEvent(event)
    }
  }

  // 📱 Mobile: Update event time from modal
  const handleMobileUpdateTime = async () => {
    if (!editModalEvent) return

    const newStart = moment(editModalEvent.start).toDate()
    const newEnd = moment(editModalEvent.end).toDate()

    const { error } = await supabase
      .from('Calendar')
      .update({ StartTime: newStart, EndTime: newEnd })
      .eq('CalendarID', editModalEvent.id)

    if (error) {
      console.error('❌ שגיאה בעדכון:', error)
      alert('שגיאה בעדכון')
    } else {
      await fetchCalendar()
      setEditModalEvent(null)
    }
  }

  // Choose calendar component based on device
  const CalendarComponent = isMobile ? BigCalendar : DnDCalendar

  // Debug logging
  console.log('📱 isMobile:', isMobile)
  console.log('📅 Using component:', isMobile ? 'BigCalendar' : 'DnDCalendar')

  if (loading) return <div className="p-6 text-center">⌛ טוען לוח שנה...</div>

  return (
    <div dir="rtl" className="flex flex-col md:flex-row gap-4 p-4">
      {/* 🎯 Sidebar */}
      <div className="md:w-1/4 bg-gray-100 rounded-xl shadow p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">🧗‍♂️ האימונים שלי</h2>
        {workouts.length === 0 ? (
          <p className="text-sm text-gray-500">אין אימונים מוקצים</p>
        ) : (
          workouts.map((w) => (
            <div
              key={w.id}
              className={`border p-2 rounded mb-2 cursor-pointer transition-all ${
                selectedWorkout?.id === w.id
                  ? 'bg-blue-200 border-blue-400'
                  : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() =>
                setSelectedWorkout(
                  selectedWorkout?.id === w.id ? null : { id: w.id, name: w.name }
                )
              }
            >
              {w.name}
            </div>
          ))
        )}
        {selectedWorkout && (
          <p className="text-xs text-blue-700 mt-2">
            📌 נבחר: {selectedWorkout.name} (לחץ על תאריך בלוח כדי להוסיף)
          </p>
        )}
      </div>

      {/* 📆 Calendar */}
      <div className="flex-1 relative">
        <CalendarComponent
          localizer={localizer}
          rtl={true}
          events={events}
          selectable
          resizable={!isMobile}
          views={['month', 'week', 'day']}
          view={view}
          date={date}
          onView={(newView) => setView(newView)}
          onNavigate={(newDate) => setDate(newDate)}
          startAccessor="start"
          endAccessor="end"
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={!isMobile ? handleEventDrop : undefined}
          style={{ height: '80vh', borderRadius: '10px' }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.color,
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.85rem',
            },
          })}
          components={{
            event: ({ event }) => (
              <div className="flex justify-between items-center text-xs pointer-events-none">
                <span className="flex-1">{event.title}</span>
                <div className="flex gap-1 ml-1 pointer-events-auto">
                  <button
                    className="bg-green-500 text-white rounded-full p-1 hover:bg-green-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(
                        event.completed
                          ? `/calendar-edit/${event.id}`
                          : `/workout/${event.id}`
                      )
                    }}
                  >
                    <FaPlay size={10} />
                  </button>
                  <button
                    className="bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteEvent(event.id)
                    }}
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              </div>
            ),
          }}
        />
      </div>

      {/* 📱 Mobile Edit Modal */}
      {editModalEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{editModalEvent.title}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">תאריך ושעת התחלה</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded p-2"
                  value={moment(editModalEvent.start).format('YYYY-MM-DDTHH:mm')}
                  onChange={(e) =>
                    setEditModalEvent({
                      ...editModalEvent,
                      start: new Date(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">תאריך ושעת סיום</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded p-2"
                  value={moment(editModalEvent.end).format('YYYY-MM-DDTHH:mm')}
                  onChange={(e) =>
                    setEditModalEvent({
                      ...editModalEvent,
                      end: new Date(e.target.value),
                    })
                  }
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  onClick={handleMobileUpdateTime}
                >
                  שמור
                </button>
                <button
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  onClick={() => setEditModalEvent(null)}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
