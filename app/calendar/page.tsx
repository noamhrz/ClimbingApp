'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './calendar-custom.css'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import moment from 'moment-timezone'
import { logTimeOfDate } from '@/lib/log-time'
import { useRouter } from 'next/navigation'
import EventComponent from '@/components/EventComponent'
import { FREE_SESSION_CATEGORY } from '@/lib/free-session'
import AddWorkoutModal from '@/components/AddWorkoutModal'
import ScheduleSheet from '@/components/coach/ScheduleSheet'
import EventContextMenu from '@/components/EventContextMenu'
import EditEventModal from '@/components/EditEventModal'
import RangeMonthGrid from '@/components/calendar/RangeMonthGrid'
import RangeToolPanel, { RANGE_TOOLS, RangeTool } from '@/components/calendar/RangeToolPanel'
import WeekListView from '@/components/calendar/WeekListView'
import DayListView from '@/components/calendar/DayListView'
import CalendarToolbar from '@/components/calendar/CalendarToolbar'
import AssignedWorkoutsPanel, { PanelWorkout } from '@/components/calendar/AssignedWorkoutsPanel'
import { copyPreviousWorkout } from '@/utils/copyPreviousWorkout'
import { LuPlus, LuCalendarDays, LuList, LuCalendar, LuCopy, LuBatteryLow, LuX, LuTrash2, LuSave, LuCalendarPlus, LuStar, LuCalendarRange } from 'react-icons/lu'
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
  free?: boolean
  bonus?: boolean
  ActualMinutes?: number | null   // done: the time the trainee reported
  AvgMinutes?: number | null      // not done yet: average actual time of this workout (last 5, needs 3+)
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
  const [showSchedule, setShowSchedule] = useState(false)
  // coach range tools: pick an action, then mark a range on the month calendar
  const [rangeTool, setRangeTool] = useState<RangeTool | null>(null)
  // ⭐ bonus mode: tapping a workout in the calendar marks / unmarks it as a bonus workout
  const [bonusMode, setBonusMode] = useState(false)
  const [rangeA, setRangeA] = useState<string | null>(null)
  const [rangeB, setRangeB] = useState<string | null>(null)
  const [previewDays, setPreviewDays] = useState<Set<string>>(new Set())
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>()
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSelectingDate, setIsSelectingDate] = useState(false)
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

  // Desktop coach panel: drag an assigned workout onto a day
  const dragWorkout = useRef<PanelWorkout | null>(null)
  const [dayDropOver, setDayDropOver] = useState(false)
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (text: string, undo?: () => void) => {
    setToast({ text, undo })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
    }
    checkMobile()
    // Desktop opens on the month calendar; phones keep the day list
    if (window.innerWidth >= 1024) setView('month')
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calendar rows are loaded for the visible month plus the weeks shown around it,
  // and reloaded when navigation moves to another month (not the whole history).
  const rangeKey = moment(date).format('YYYY-MM')
  const rangeRef = useRef(rangeKey)
  rangeRef.current = rangeKey
  const fetchSeq = useRef(0)

  useEffect(() => {
    if (!activeEmail) return
    fetchWorkouts()
  }, [activeEmail])

  useEffect(() => {
    if (!activeEmail) return
    fetchCalendar()
  }, [activeEmail, rangeKey])

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
    const seq = ++fetchSeq.current
    const month = moment(rangeRef.current + '-01')
    // StartTime is stored as naive UTC
    const from = month.clone().startOf('month').subtract(7, 'days').utc().format('YYYY-MM-DD HH:mm:ss')
    const to = month.clone().endOf('month').add(14, 'days').utc().format('YYYY-MM-DD HH:mm:ss')

    const { data, error } = await supabase
      .from('Calendar')
      .select('CalendarID, WorkoutID, StartTime, EndTime, Completed, Deloading, DeloadingPercentage, Order, ActualMinutes, Bonus')
      .eq('Email', activeEmail)
      .gte('StartTime', from)
      .lte('StartTime', to)

    if (seq !== fetchSeq.current) return   // a newer load (another month) is on its way
    if (error) {
      console.error('❌ Error loading calendar:', error)
      setLoading(false)
      return
    }

    // Personal coach notes (from the assignment) + details of only the workouts on screen, in parallel
    const ids = [...new Set((data || []).map((r) => r.WorkoutID))]
    const [{ data: notesData }, { data: workoutsData }, { data: timesData }] = await Promise.all([
      supabase.from('WorkoutsForUser').select('WorkoutID, Notes, CoachNote').eq('Email', activeEmail),
      ids.length
        ? supabase.from('Workouts').select('WorkoutID, Name, Category, EstimatedTotalTime, EstimatedClimbingTime, CalculatedExercisesTime, containClimbing, containExercise').in('WorkoutID', ids)
        : Promise.resolve({ data: [] as { WorkoutID: number; Name: string; Category: string | null; EstimatedTotalTime: number | null; EstimatedClimbingTime: number | null; CalculatedExercisesTime: number | null; containClimbing: boolean; containExercise: boolean }[] }),
      // reported times of this trainee's past workouts, newest first (for the average)
      ids.length
        ? supabase.from('Calendar').select('WorkoutID, ActualMinutes').eq('Email', activeEmail).eq('Completed', true)
            .gt('ActualMinutes', 10).in('WorkoutID', ids).order('StartTime', { ascending: false }).limit(1000)
        : Promise.resolve({ data: [] as { WorkoutID: number; ActualMinutes: number }[] }),
    ])
    // average actual time per workout: the last 5 reported times over 10 min, shown once there are 3
    const avgMap: Record<number, number> = {}
    {
      const byWorkout: Record<number, number[]> = {}
      for (const t of timesData || []) {
        const arr = (byWorkout[t.WorkoutID] ??= [])
        if (arr.length < 5) arr.push(Number(t.ActualMinutes))
      }
      for (const [wid, arr] of Object.entries(byWorkout)) {
        if (arr.length >= 3) avgMap[Number(wid)] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      }
    }
    if (seq !== fetchSeq.current) return
    const noteMap: Record<number, string> = Object.fromEntries(
      (notesData || []).map((n) => [n.WorkoutID, ((n.Notes || n.CoachNote || '') as string).trim()])
    )

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
      // EstimatedTotalTime is the workout's total (exercises + climbing, or the
      // manual value); fall back to the parts only when it is missing.
      if (w.EstimatedTotalTime && w.EstimatedTotalTime > 0) return w.EstimatedTotalTime
      if (w.containClimbing || w.containExercise) {
        const sum = (w.CalculatedExercisesTime || 0) + (w.EstimatedClimbingTime || 0)
        if (sum > 0) return sum
      }
      return null
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
        free: workoutDetailsMap[item.WorkoutID]?.Category === FREE_SESSION_CATEGORY,
        bonus: !!item.Bonus,
        ActualMinutes: item.Completed && item.ActualMinutes ? item.ActualMinutes : null,
        AvgMinutes: !item.Completed ? avgMap[item.WorkoutID] ?? null : null,
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

  // Month grid: find the day cell under the pointer (rows/cells are in date order in the DOM,
  // RTL only flips them visually), so the drop needs no help from the calendar library.
  const monthCellAt = (x: number, y: number): { el: HTMLElement; day: Date } | null => {
    const rows = [...document.querySelectorAll<HTMLElement>('.rbc-month-view .rbc-month-row')]
    const ri = rows.findIndex(r => { const b = r.getBoundingClientRect(); return y >= b.top && y < b.bottom })
    if (ri === -1) return null
    const cells = [...rows[ri].querySelectorAll<HTMLElement>('.rbc-row-bg > .rbc-day-bg')]
    const ci = cells.findIndex(c => { const b = c.getBoundingClientRect(); return x >= b.left && x < b.right })
    if (ci === -1) return null
    const first = moment(date).startOf('month').startOf('week')
    return { el: cells[ci], day: first.clone().add(ri * 7 + ci, 'days').toDate() }
  }
  const dropCell = useRef<HTMLElement | null>(null)
  const markDropCell = (el: HTMLElement | null) => {
    if (dropCell.current === el) return
    dropCell.current?.classList.remove('mw-drop-target')
    el?.classList.add('mw-drop-target')
    dropCell.current = el
  }
  const onMonthDragOver = (e: React.DragEvent) => {
    if (!dragWorkout.current) return
    const hit = monthCellAt(e.clientX, e.clientY)
    if (!hit) { markDropCell(null); return }
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    markDropCell(hit.el)
  }
  const onMonthDrop = (e: React.DragEvent) => {
    const w = dragWorkout.current
    const hit = monthCellAt(e.clientX, e.clientY)
    markDropCell(null)
    dragWorkout.current = null
    if (!w || !hit) return
    e.preventDefault()
    addWorkoutToDay(w, hit.day)
  }

  // Schedule an assigned workout on a day (drag from the panel, or "+" in day view).
  // Same shape as AddWorkoutModal: morning slot, StartTime minute encodes the day's order.
  const addWorkoutToDay = async (w: PanelWorkout, day: Date) => {
    if (!activeEmail) return
    if (hasPendingChanges) {
      alert('יש שינויים שלא נשמרו בלוח. שמור או בטל אותם קודם.')
      return
    }
    const dateStr = moment(day).format('YYYY-MM-DD')
    // count from the DB, not from state, so quick consecutive drops don't share a slot
    const dayStart = moment.tz(dateStr, 'Asia/Jerusalem').startOf('day')
    const { data: dayRows } = await supabase
      .from('Calendar')
      .select('Order')
      .eq('Email', activeEmail)
      .gte('StartTime', dayStart.toISOString())
      .lt('StartTime', dayStart.clone().add(1, 'day').toISOString())
    const order = Math.max(0, ...(dayRows ?? []).map(r => r.Order ?? 0), (dayRows ?? []).length) + 1
    const { data: wd } = await supabase.from('Workouts').select('EstimatedTotalTime').eq('WorkoutID', w.id).maybeSingle()
    const start = moment.tz(dateStr, 'Asia/Jerusalem').hour(9).minute(order - 1).second(0).millisecond(0)
    const end = start.clone().add(wd?.EstimatedTotalTime || 60, 'minutes')
    const { data, error } = await supabase
      .from('Calendar')
      .insert({
        Email: activeEmail,
        WorkoutID: w.id,
        StartTime: start.toDate(),
        EndTime: end.toDate(),
        Completed: false,
        Deloading: false,
        Color: '#3b82f6',
        Order: order,
      })
      .select('CalendarID')
      .single()
    if (error || !data) {
      alert('שגיאה בהוספת האימון: ' + (error?.message ?? ''))
      return
    }
    await fetchCalendar()
    showToast(`${w.name} נוסף ל-${moment(day).format('DD/MM')}`, async () => {
      await supabase.from('Calendar').delete().eq('CalendarID', data.CalendarID)
      await fetchCalendar()
    })
  }

  const handleEventDrop = ({ event, start }: any) => {
    if (isMobile || isSelectingDate) return
    if (typeof event?.id !== 'number') return   // not a calendar entry (e.g. a stray drag preview)

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
        // On screen, entries sit at local midnight + order (display only). Save them at their
        // real hour in Israel time (morning when unknown or a legacy midnight entry), minute = order,
        // so the day never slips to the evening before in UTC (reminders, reports).
        const ev = events.find(e => e.id === calendarId)
        const origHour = ev?.StartTime ? moment.utc(ev.StartTime).tz('Asia/Jerusalem').hour() : 9
        const start = moment.tz(change.newDate, 'Asia/Jerusalem')
          .hour(origHour === 0 ? 9 : origHour).minute(change.newOrder ?? 0).second(0).millisecond(0)
        const end = start.clone().add(change.newEndTime.getTime() - change.newStartTime.getTime(), 'ms')
        const { error } = await supabase
          .from('Calendar')
          .update({
            StartTime: start.toDate().toISOString(),
            EndTime: end.toDate().toISOString(),
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

  const toggleBonus = async (event: CalendarEvent) => {
    const id = Number(event.id)
    const next = !event.bonus
    setEvents(prev => prev.map(ev => (Number(ev.id) === id ? { ...ev, bonus: next } : ev)))
    const { error } = await supabase.from('Calendar').update({ Bonus: next }).eq('CalendarID', id)
    if (error) {
      setEvents(prev => prev.map(ev => (Number(ev.id) === id ? { ...ev, bonus: !next } : ev)))
      alert('שגיאה בסימון בונוס: ' + error.message)
    }
  }

  const handleSelectEvent = (event: CalendarEvent, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (bonusMode) { void toggleBonus(event); return }
    
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
          LogDateTime: logTimeOfDate(newDate),
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

  // ── range tools ────────────────────────────────────────────────────────
  const startRangeTool = (t: RangeTool) => {
    if (hasPendingChanges) { alert('יש שינויים שלא נשמרו בלוח. שמור או בטל אותם קודם.'); return }
    setIsSelectingDate(false)
    setRangeTool(t); setRangeA(null); setRangeB(null); setPreviewDays(new Set())
    setView('month')
  }
  const endRangeTool = () => { setRangeTool(null); setRangeA(null); setRangeB(null); setPreviewDays(new Set()) }
  const [rangeFrom, rangeTo] = rangeA && rangeB ? [rangeA, rangeB].sort() : [rangeA, null]
  const inMonthGrid = (t: EventTarget | null) => !!(t as Element | null)?.closest?.('.rbc-month-view')
  // swallow the calendar's own clicks / selection inside the month grid while marking a range
  const blockInGrid = (e: React.SyntheticEvent) => {
    if (!rangeTool || !inMonthGrid(e.target)) return
    e.stopPropagation()
    if (e.type === 'click') e.preventDefault()
  }
  const onRangePointerDown = (e: React.PointerEvent) => {
    if (!rangeTool || !inMonthGrid(e.target) || e.button > 0) return
    e.stopPropagation()
    const hit = monthCellAt(e.clientX, e.clientY)
    if (!hit) return
    if (e.pointerType === 'mouse') e.preventDefault()
    const anchor = moment(hit.day).format('YYYY-MM-DD')
    let moved = false
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return
      const h = monthCellAt(ev.clientX, ev.clientY)
      if (!h) return
      const d = moment(h.day).format('YYYY-MM-DD')
      if (d === anchor && !moved) return
      moved = true
      setRangeA(anchor); setRangeB(d)
    }
    const finish = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', cancel)
      if (moved) return
      if (ev.pointerType !== 'mouse' && (Math.abs(ev.clientX - e.clientX) > 10 || Math.abs(ev.clientY - e.clientY) > 10)) return
      // tap: first sets the start, second sets the end, a third starts over
      if (rangeARef.current && !rangeBRef.current) setRangeB(anchor)
      else { setRangeA(anchor); setRangeB(null) }
    }
    const cancel = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', cancel)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
  }
  const rangeARef = useRef<string | null>(null)
  const rangeBRef = useRef<string | null>(null)
  rangeARef.current = rangeA
  rangeBRef.current = rangeB
  const dayPropGetter = (day: Date) => {
    if (!rangeTool) return {}
    const d = moment(day).format('YYYY-MM-DD')
    const lo = rangeFrom, hi = rangeTo ?? rangeFrom
    const cls: string[] = []
    if (lo && hi && d >= lo && d <= hi) cls.push('rng-in')
    if (d === lo || d === hi) cls.push('rng-edge')
    if (previewDays.has(d)) cls.push('rng-preview')
    return cls.length ? { className: cls.join(' ') } : {}
  }

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
  }

  const handleBackToMonth = () => {
    if (isMobile) return
    setView('month')
  }

  const ActiveCalendar = isMobile ? BigCalendar : DnDCalendar
  const showPanel = isAdmin && !isMobile

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
    <div dir="rtl" className="min-h-screen bg-surface pb-[calc(10rem+env(safe-area-inset-bottom))] lg:pb-28">
      <div className="bg-surface border-b" hidden={isMobile && !!rangeTool}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-fg inline-flex items-center gap-2"><LuCalendarDays aria-hidden className="w-5 h-5 text-accent" />לוח אימונים</h1>
            
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={() => setView('day')}
                className={`inline-flex items-center gap-1.5 min-h-11 px-3 sm:px-4 rounded-full font-medium transition-all ${
 view === 'day'
 ? 'bg-accent text-on-accent '
 : 'bg-surface text-fg-2 border border-line-strong hover:bg-raised'
 }`}
              >
                <LuList aria-hidden className="w-4 h-4 shrink-0" />יום
              </button>
              <button
                onClick={() => setView('week')}
                className={`inline-flex items-center gap-1.5 min-h-11 px-3 sm:px-4 rounded-full font-medium transition-all ${
 view === 'week'
 ? 'bg-accent text-on-accent '
 : 'bg-surface text-fg-2 border border-line-strong hover:bg-raised'
 }`}
              >
                <LuCalendarRange aria-hidden className="w-4 h-4 shrink-0" />שבוע
              </button>
              <button
                onClick={() => setView('month')}
                className={`inline-flex items-center gap-1.5 min-h-11 px-3 sm:px-4 rounded-full font-medium transition-all ${
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

      {isAdmin && (
        <div className="sticky top-[var(--app-header-height,0px)] z-30 bg-surface/95 backdrop-blur border-b border-line">
          <div className="max-w-7xl mx-auto px-4 py-2">
            {bonusMode ? (
              <div className="flex items-center gap-3 min-h-10">
                <LuStar aria-hidden className="w-5 h-5 text-warning fill-warning shrink-0" />
                <p className="text-sm text-fg-2 min-w-0">
                  <b className="text-warning">אימון בונוס:</b> לחיצה על אימון בלוח מסמנת אותו כבונוס (זהב), ולחיצה נוספת מבטלת.
                </p>
                <button type="button" onClick={() => setBonusMode(false)} className="ms-auto shrink-0 min-h-9 px-4 rounded-full bg-warning text-on-accent text-sm font-extrabold">סיום</button>
              </div>
            ) : rangeTool ? (
              <div className="flex items-center gap-3 min-h-10">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shrink-0" aria-hidden />
                <p className="text-sm text-fg-2 min-w-0">
                  <b className="text-fg">{RANGE_TOOLS.find(t => t.key === rangeTool)!.label}:</b>{' '}
                  {!rangeFrom ? 'לחץ על יום ההתחלה בלוח' : !rangeTo ? 'לחץ על יום הסוף' : 'אפשר לסמן מחדש, או לאשר למטה'}
                </p>
                <button type="button" onClick={endRangeTool} className="ms-auto btn-ghost min-h-9 px-4 text-sm">ביטול</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto" role="toolbar" aria-label="כלי מאמן">
                <button type="button" onClick={() => setShowSchedule(true)} className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-bold">
                  <LuCalendarPlus aria-hidden className="w-4 h-4" />שיבוץ שבועי
                </button>
                <span className="w-px h-6 bg-line-strong shrink-0" aria-hidden />
                {RANGE_TOOLS.map(t => {
                  const Icon = t.key === 'cycle' ? LuCopy : t.key === 'deload' ? LuBatteryLow : t.key === 'undeload' ? LuX : LuTrash2
                  return (
                    <button key={t.key} type="button" onClick={() => startRangeTool(t.key)}
                      className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border text-sm font-bold bg-surface hover:bg-raised ${t.key === 'clear' ? 'border-danger/50 text-danger' : 'border-line-strong text-fg-2'}`}>
                      <Icon aria-hidden className="w-4 h-4" />{t.label}
                    </button>
                  )
                })}
                <button type="button" onClick={() => setBonusMode(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-warning/60 text-warning text-sm font-bold bg-surface hover:bg-warning/10">
                  <LuStar aria-hidden className="w-4 h-4 fill-warning" />אימון בונוס
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        hidden={!!rangeTool || bonusMode}
        onClick={handleAddButtonClick}
        className={`fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom))] lg:bottom-24 left-4 lg:left-6 text-on-accent text-3xl rounded-full w-16 h-16 shadow-lg transition-all duration-200 z-40 flex items-center justify-center ${
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
          
          <ScheduleSheet
            isOpen={showSchedule}
            onClose={() => setShowSchedule(false)}
            onSuccess={() => handleModalSuccess()}
            email={activeEmail}
            name={activeUser?.Name}
            workouts={workouts}
          />

        </>
      )}

      {rangeTool && activeEmail && !showPanel && !isMobile && (
            <RangeToolPanel
              tool={rangeTool}
              email={activeEmail}
              from={rangeFrom}
              to={rangeTo}
              onPreview={setPreviewDays}
              onCancel={endRangeTool}
              onDone={async (text, undo) => {
                endRangeTool()
                await fetchCalendar()
                showToast(text, undo ? async () => { await undo(); await fetchCalendar() } : undefined)
              }}
            />
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

      <div className={`mx-auto p-4 ${showPanel ? 'max-w-[1600px] grid grid-cols-[minmax(0,1fr)_300px] gap-4 items-start' : 'max-w-7xl'}`}>
        <div
          className={`bg-surface rounded-xl p-4 overflow-hidden ${rangeTool ? 'range-mode' : ''}`}
          onPointerDownCapture={onRangePointerDown}
          onMouseDownCapture={blockInGrid}
          onTouchStartCapture={blockInGrid}
          onClickCapture={blockInGrid}
          onDragOver={view === 'month' && showPanel ? onMonthDragOver : undefined}
          onDragLeave={view === 'month' && showPanel ? e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) markDropCell(null) } : undefined}
          onDrop={view === 'month' && showPanel ? onMonthDrop : undefined}
        >
          {isMobile && rangeTool && activeEmail ? (
            <div className="flex flex-col gap-3">
              <RangeMonthGrid
                month={date}
                onMonth={setDate}
                events={events}
                from={rangeFrom}
                to={rangeTo}
                preview={previewDays}
                onTap={d => {
                  if (rangeARef.current && !rangeBRef.current) setRangeB(d)
                  else { setRangeA(d); setRangeB(null) }
                }}
              />
              <RangeToolPanel
                tool={rangeTool}
                email={activeEmail}
                from={rangeFrom}
                to={rangeTo}
                onPreview={setPreviewDays}
                inline="flow"
                onCancel={endRangeTool}
                onDone={async (text, undo) => {
                  endRangeTool()
                  await fetchCalendar()
                  showToast(text, undo ? async () => { await undo(); await fetchCalendar() } : undefined)
                }}
              />
            </div>
          ) : view === 'week' ? (
            <WeekListView
              events={events}
              date={date}
              isDesktop={!isMobile}
              selecting={isSelectingDate}
              onEventClick={handleSelectEvent}
              onNavigate={handleNavigate}
              onDayClick={d => handleSelectSlot({ start: d })}
            />
          ) : view === 'day' ? (
            <div
              onDragOver={e => { if (showPanel && dragWorkout.current) { e.preventDefault(); if (!dayDropOver) setDayDropOver(true) } }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDayDropOver(false) }}
              onDrop={e => { e.preventDefault(); setDayDropOver(false); const w = dragWorkout.current; dragWorkout.current = null; if (w) addWorkoutToDay(w, date) }}
              className={`rounded-xl transition-shadow ${dayDropOver ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
            >
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
            </div>
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
              draggableAccessor={() => !isSelectingDate && !rangeTool && !bonusMode}
              onEventDrop={!isSelectingDate && !rangeTool && !bonusMode ? handleEventDrop : undefined}
              dayPropGetter={dayPropGetter}
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

        {showPanel && activeEmail && rangeTool && (
            <RangeToolPanel
              tool={rangeTool}
              email={activeEmail}
              from={rangeFrom}
              to={rangeTo}
              onPreview={setPreviewDays}
              inline
              onCancel={endRangeTool}
              onDone={async (text, undo) => {
                endRangeTool()
                await fetchCalendar()
                showToast(text, undo ? async () => { await undo(); await fetchCalendar() } : undefined)
              }}
            />
        )}
        {showPanel && activeEmail && !rangeTool && (
          <AssignedWorkoutsPanel
            email={activeEmail}
            name={activeUser?.Name}
            workouts={workouts}
            onAssignedChange={fetchWorkouts}
            onDragStart={w => { dragWorkout.current = w }}
            onDragEnd={() => { setTimeout(() => { dragWorkout.current = null }, 0); setDayDropOver(false); markDropCell(null) }}
            addLabel={view === 'day' ? `ל-${moment(date).format('DD/MM')}` : undefined}
            onAdd={view === 'day' ? w => addWorkoutToDay(w, date) : undefined}
          />
        )}
      </div>

      {toast && (
        <div role="status" className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-[calc(9rem+env(safe-area-inset-bottom))] lg:bottom-28 bg-fg text-bg rounded-full ps-4 pe-1.5 py-1.5 flex items-center gap-3 text-[15px] font-bold whitespace-nowrap shadow-lg">
          <span>{toast.text}</span>
          {toast.undo
            ? <button type="button" onClick={() => { toast.undo?.(); setToast(null) }} className="h-9 px-4 rounded-full bg-bg text-fg font-extrabold">ביטול</button>
            : <span className="w-1" />}
        </div>
      )}
    </div>
  )
}