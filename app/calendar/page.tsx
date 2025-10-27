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
import { FaPlay, FaTimes } from 'react-icons/fa'

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
    const newStart = moment(start).toDate()
    const newEnd = moment(end).toDate()

    if (moment(newEnd).isBefore(newStart)) {
      const tmp = newStart
      start = newEnd
      end = tmp
    }

    const { error } = await supabase
      .from('Calendar')
      .update({ StartTime: newStart, EndTime: newEnd })
      .eq('CalendarID', event.id)

    if (error) console.error('❌ שגיאה בעדכון:', error)
    else {
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
      <div className="flex-1">
        <DnDCalendar
          localizer={localizer}
          rtl={true}
          events={events}
          selectable
          resizable
          views={['month', 'week', 'day']}
          view={view}
          date={date}
          onView={(newView) => setView(newView)}
          onNavigate={(newDate) => setDate(newDate)}
          startAccessor="start"
          endAccessor="end"
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
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
              <div className="flex justify-between items-center text-xs">
                <span>{event.title}</span>
                <div className="flex gap-1 ml-1">
                  <button
                    className="bg-green-500 text-white rounded-full p-1"
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
                    className="bg-red-600 text-white rounded-full p-1"
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
    </div>
  )
}
