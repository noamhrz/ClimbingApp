// app/calendar-edit/[calendarId]/CalendarEditClient.tsx
// ✨ UPDATED VERSION - with Single Hand & isDuration support

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { ClimbingSummary } from '@/components/climbing/ClimbingSummary'
import { RouteTypeBlock } from '@/components/climbing/RouteTypeBlock'
import { ClimbingRoute, BoulderGrade, LeadGrade, ClimbingLocation, ClimbingLogEntry, BoardType } from '@/types/climbing'
import { generateTempId, getGradeDisplay } from '@/lib/climbing-helpers'
import ExerciseAccordion from "@/components/exercises/ExerciseAccordion"
import dayjs from 'dayjs'
import moment from 'moment-timezone'

export default function CalendarEditClient() {
  const { activeUser, loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  const params = useParams()
  const router = useRouter()
  const calendarId = Number(params?.calendarId)

  const [calendarRow, setCalendarRow] = useState<any>(null)
  const [workout, setWorkout] = useState<any>(null)
  const [exerciseForms, setExerciseForms] = useState<any[]>([])
  
  // New climbing state
  const [routes, setRoutes] = useState<ClimbingRoute[]>([])
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [selectedBoardType, setSelectedBoardType] = useState<number | null>(null)
  
  const [leadGrades, setLeadGrades] = useState<LeadGrade[]>([])
  const [boulderGrades, setBoulderGrades] = useState<BoulderGrade[]>([])
  const [locations, setLocations] = useState<ClimbingLocation[]>([])
  const [boardTypes, setBoardTypes] = useState<BoardType[]>([])
  const [climberNotes, setClimberNotes] = useState('')
  const [loading, setLoading] = useState(true)

  // Track which routes existed in DB (for UPDATE vs INSERT)
  const [existingLogIds, setExistingLogIds] = useState<Map<string, number>>(new Map())

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ✨ טעינת נתונים - UPDATED
  useEffect(() => {
    const load = async () => {
      if (!calendarId) return
      setLoading(true)
      try {
        // Load Calendar
        const { data: cal } = await supabase
          .from('Calendar')
          .select('*')
          .eq('CalendarID', calendarId)
          .maybeSingle()
        if (!cal) throw new Error('Calendar not found')
        setCalendarRow(cal)
        setClimberNotes(cal.ClimberNotes || '')

        // Load Workout
        const { data: w } = await supabase
          .from('Workouts')
          .select('*')
          .eq('WorkoutID', cal.WorkoutID)
          .maybeSingle()
        setWorkout(w)

        // Load Exercises - ✨ UPDATED: טוען גם IsSingleHand, isDuration
        const { data: rels } = await supabase
          .from('WorkoutsExercises')
          .select('ExerciseID')
          .eq('WorkoutID', cal.WorkoutID)
        const ids = rels?.map((r) => r.ExerciseID) || []

        const { data: exs } = await supabase
          .from('Exercises')
          .select('ExerciseID, Name, Description, IsSingleHand, isDuration, ImageURL, VideoURL')
          .in('ExerciseID', ids)

        // ✨ UPDATED: טוען לוגים קיימים כולל HandSide
        const { data: logs } = await supabase
          .from('ExerciseLogs')
          .select('*')
          .eq('CalendarID', calendarId)

        const mappedExercises =
          exs?.map((ex) => {
            // ✨ UPDATED: טיפול ב-Single Hand - מחפש רשומות לפי HandSide
            if (ex.IsSingleHand) {
              const logRight = logs?.find((l) => l.ExerciseID === ex.ExerciseID && l.HandSide === 'Right')
              const logLeft = logs?.find((l) => l.ExerciseID === ex.ExerciseID && l.HandSide === 'Left')
              
              return {
                ExerciseLogID: logRight?.ExerciseLogID || null,
                ExerciseLogIDLeft: logLeft?.ExerciseLogID || null,
                ExerciseID: ex.ExerciseID,
                Name: ex.Name,
                Description: ex.Description,
                IsSingleHand: ex.IsSingleHand,
                isDuration: ex.isDuration,
                ImageURL: ex.ImageURL,
                VideoURL: ex.VideoURL,
                
                // Right hand
                RepsDone: logRight?.RepsDone ?? null,
                DurationSec: logRight?.DurationSec ?? null,
                WeightKG: logRight?.WeightKG ?? null,
                RPE: logRight?.RPE ?? null,
                Notes: logRight?.Notes ?? '',
                Completed: logRight?.Completed ?? false,
                
                // Left hand
                RepsDoneLeft: logLeft?.RepsDone ?? null,
                DurationSecLeft: logLeft?.DurationSec ?? null,
                WeightKGLeft: logLeft?.WeightKG ?? null,
                RPELeft: logLeft?.RPE ?? null,
                NotesLeft: logLeft?.Notes ?? '',
                CompletedLeft: logLeft?.Completed ?? false,
              }
            } else {
              // Regular exercise - look for HandSide='Both'
              const log = logs?.find((l) => l.ExerciseID === ex.ExerciseID && l.HandSide === 'Both')
              return {
                ExerciseLogID: log?.ExerciseLogID || null,
                ExerciseID: ex.ExerciseID,
                Name: ex.Name,
                Description: ex.Description,
                IsSingleHand: ex.IsSingleHand,
                isDuration: ex.isDuration,
                ImageURL: ex.ImageURL,
                VideoURL: ex.VideoURL,
                RepsDone: log?.RepsDone ?? null,
                DurationSec: log?.DurationSec ?? null,
                WeightKG: log?.WeightKG ?? null,
                RPE: log?.RPE ?? null,
                Notes: log?.Notes ?? '',
                Completed: log?.Completed ?? false,
              }
            }
          }) || []
        setExerciseForms(mappedExercises)

        // Load Grades & Locations
        const [lg, bg, loc, bt] = await Promise.all([
          supabase.from('LeadGrades').select('*').order('LeadGradeID'),
          supabase.from('BoulderGrades').select('*').order('BoulderGradeID'),
          supabase.from('ClimbingLocations').select('*').order('LocationName'),
          supabase.from('BoardTypes').select('*').order('BoardName'),
        ])
        setLeadGrades(lg.data || [])
        setBoulderGrades(bg.data || [])
        setLocations(loc.data || [])
        setBoardTypes(bt.data || [])

        // Load existing ClimbingLogs and convert to ClimbingRoute format
        const { data: climbLogs } = await supabase
          .from('ClimbingLog')
          .select('*')
          .eq('CalendarID', calendarId)

        if (climbLogs && climbLogs.length > 0) {
          if (climbLogs[0].LocationID) {
            setSelectedLocation(climbLogs[0].LocationID)
          }
          
          const firstBoardRoute = climbLogs.find(log => log.ClimbType === 'Board')
          if (firstBoardRoute && firstBoardRoute.BoardTypeID) {
            setSelectedBoardType(firstBoardRoute.BoardTypeID)
          }

          const logIdMap = new Map<string, number>()
          const convertedRoutes: ClimbingRoute[] = climbLogs.map((log: ClimbingLogEntry) => {
            const tempId = generateTempId()
            logIdMap.set(tempId, log.ClimbingLogID!)
            
            return {
              id: tempId,
              climbType: log.ClimbType,
              gradeID: log.GradeID ?? null,
              gradeDisplay: getGradeDisplay(
                log.GradeID ?? null,
                log.ClimbType,
                bg.data || [],
                lg.data || []
              ),
              routeName: log.RouteName || '',
              attempts: log.Attempts,
              successful: log.Successful,
              notes: log.Notes || ''
            }
          })

          setRoutes(convertedRoutes)
          setExistingLogIds(logIdMap)
        }
      } catch (err) {
        console.error('❌ Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [calendarId])

  // ✨ UPDATED: שינוי תרגיל - תומך בכל השדות
  const handleExerciseChange = (i: number, data: any) => {
    setExerciseForms((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], ...data }
      return next
    })
  }

  // Group routes by type
  const routesByType = useMemo(() => ({
    Boulder: routes.filter(r => r.climbType === 'Boulder'),
    Board: routes.filter(r => r.climbType === 'Board'),
    Lead: routes.filter(r => r.climbType === 'Lead')
  }), [routes])

  // Check if workout contains climbing routes
  const containsClimbing = routes.length > 0

  // ✨ UPDATED: שמירה - תומך ב-Single Hand & isDuration
  const handleSave = async () => {
    if (!activeEmail) {
      showToast('❌ אין משתמש פעיל', 'error')
      return
    }

    try {
      const now = moment.tz('Asia/Jerusalem').toISOString()
      const email = calendarRow?.Email || activeEmail

      // ✅ FIX: Use calendar's StartTime for LogDateTime
      const logDateTime = calendarRow?.StartTime 
        ? moment.tz(calendarRow.StartTime, 'Asia/Jerusalem').toISOString()
        : now

      console.log('📅 [CalendarEdit] DateTime Context:')
      console.log('  Calendar StartTime:', calendarRow?.StartTime)
      console.log('  LogDateTime:', logDateTime)
      console.log('  CreatedAt:', now)

      let exerciseCount = 0
      let climbingCount = 0

      // Save Exercises - ✨ UPDATED
      for (const ex of exerciseForms) {
        if (ex.IsSingleHand) {
          // ✨ Single Hand: שמירת 2 רשומות
          
          // Right hand
          const hasDataRight =
            (ex.RepsDone !== null && ex.RepsDone !== undefined) ||
            (ex.DurationSec !== null && ex.DurationSec !== undefined) ||
            (ex.WeightKG !== null && ex.WeightKG !== undefined) ||
            (ex.RPE !== null && ex.RPE !== undefined) ||
            (ex.Notes && ex.Notes.trim() !== '')

          if (hasDataRight) {
            exerciseCount++
            const payloadRight = {
              CalendarID: calendarId,
              WorkoutID: workout?.WorkoutID,
              ExerciseID: ex.ExerciseID,
              Email: email,
              HandSide: 'Right',
              RepsDone: ex.isDuration ? null : (ex.RepsDone || null),
              DurationSec: ex.isDuration ? (ex.DurationSec || null) : null,
              WeightKG: ex.WeightKG || null,
              RPE: ex.RPE || null,
              Notes: ex.Notes?.trim() || null,
              Completed: true,
              UpdatedAt: now,
            }
            
            // Check if exists
            const { data: existingRight } = await supabase
              .from('ExerciseLogs')
              .select('ExerciseLogID')
              .eq('CalendarID', calendarId)
              .eq('ExerciseID', ex.ExerciseID)
              .eq('HandSide', 'Right')
              .maybeSingle()

            if (existingRight) {
              // UPDATE existing
              await supabase
                .from('ExerciseLogs')
                .update(payloadRight)
                .eq('ExerciseLogID', existingRight.ExerciseLogID)
            } else {
              // INSERT new
              await supabase
                .from('ExerciseLogs')
                .insert({ ...payloadRight, CreatedAt: now })
            }
          }

          // Left hand
          const hasDataLeft =
            (ex.RepsDoneLeft !== null && ex.RepsDoneLeft !== undefined) ||
            (ex.DurationSecLeft !== null && ex.DurationSecLeft !== undefined) ||
            (ex.WeightKGLeft !== null && ex.WeightKGLeft !== undefined) ||
            (ex.RPELeft !== null && ex.RPELeft !== undefined) ||
            (ex.NotesLeft && ex.NotesLeft.trim() !== '')

          if (hasDataLeft) {
            const payloadLeft = {
              CalendarID: calendarId,
              WorkoutID: workout?.WorkoutID,
              ExerciseID: ex.ExerciseID,
              Email: email,
              HandSide: 'Left',
              RepsDone: ex.isDuration ? null : (ex.RepsDoneLeft || null),
              DurationSec: ex.isDuration ? (ex.DurationSecLeft || null) : null,
              WeightKG: ex.WeightKGLeft || null,
              RPE: ex.RPELeft || null,
              Notes: ex.NotesLeft?.trim() || null,
              Completed: true,
              UpdatedAt: now,
            }
            
            // Check if exists
            const { data: existingLeft } = await supabase
              .from('ExerciseLogs')
              .select('ExerciseLogID')
              .eq('CalendarID', calendarId)
              .eq('ExerciseID', ex.ExerciseID)
              .eq('HandSide', 'Left')
              .maybeSingle()

            if (existingLeft) {
              // UPDATE existing
              await supabase
                .from('ExerciseLogs')
                .update(payloadLeft)
                .eq('ExerciseLogID', existingLeft.ExerciseLogID)
            } else {
              // INSERT new
              await supabase
                .from('ExerciseLogs')
                .insert({ ...payloadLeft, CreatedAt: now })
            }
          }

        } else {
          // ✨ Regular exercise
          const hasRepsDone = ex.RepsDone !== null && ex.RepsDone !== undefined && ex.RepsDone !== ''
          const hasDuration = ex.DurationSec !== null && ex.DurationSec !== undefined && ex.DurationSec !== ''
          const hasWeight = ex.WeightKG !== null && ex.WeightKG !== undefined && ex.WeightKG !== ''
          const hasRPE = ex.RPE !== null && ex.RPE !== undefined && ex.RPE !== ''
          const hasNotes = ex.Notes && ex.Notes.trim() !== ''
          
          const hasData = hasRepsDone || hasDuration || hasWeight || hasRPE || hasNotes

          if (!hasData) continue

          exerciseCount++

          const payload = {
            CalendarID: calendarId,
            WorkoutID: workout?.WorkoutID,
            ExerciseID: ex.ExerciseID,
            Email: email,
            HandSide: 'Both',
            RepsDone: ex.isDuration ? null : (ex.RepsDone || null),
            DurationSec: ex.isDuration ? (ex.DurationSec || null) : null,
            WeightKG: ex.WeightKG || null,
            RPE: ex.RPE || null,
            Notes: ex.Notes?.trim() || null,
            Completed: true,
            UpdatedAt: now,
          }

          // Check if exists
          const { data: existingLog } = await supabase
            .from('ExerciseLogs')
            .select('ExerciseLogID')
            .eq('CalendarID', calendarId)
            .eq('ExerciseID', ex.ExerciseID)
            .eq('HandSide', 'Both')
            .maybeSingle()

          if (existingLog) {
            // UPDATE existing
            await supabase
              .from('ExerciseLogs')
              .update(payload)
              .eq('ExerciseLogID', existingLog.ExerciseLogID)
          } else {
            // INSERT new
            await supabase
              .from('ExerciseLogs')
              .insert({ ...payload, CreatedAt: now })
          }
        }
        
        await new Promise((r) => setTimeout(r, 100))
      }

      // Save Climbing Routes - UNCHANGED
      if (routes.length > 0) {
        climbingCount = routes.length
        
        for (const route of routes) {
          const existingLogId = existingLogIds.get(route.id)
          
          const payload: any = {
            Email: email,
            WorkoutID: workout?.WorkoutID,
            CalendarID: calendarId,
            ClimbType: route.climbType,
            GradeID: route.gradeID,
            LocationID: selectedLocation,
            RouteName: route.routeName || null,
            Attempts: route.attempts,
            Successful: route.successful,
            Notes: route.notes || null,
            LogDateTime: logDateTime,  // ✅ ADD THIS
            UpdatedAt: now,           // ✅ ADD THIS
          }

          if (route.climbType === 'Board') {
            payload.BoardTypeID = selectedBoardType
          }

          if (existingLogId) {
            await supabase
              .from('ClimbingLog')
              .update(payload)
              .eq('ClimbingLogID', existingLogId)
          } else {
            await supabase
              .from('ClimbingLog')
              .insert({ ...payload, CreatedAt: now })
          }

          await new Promise((r) => setTimeout(r, 100))
        }
      }

      // Update Calendar
      await supabase
        .from('Calendar')
        .update({
          Completed: true,
          ClimberNotes: climberNotes.trim() || null,
        })
        .eq('CalendarID', calendarId)

      const parts = []
      if (exerciseCount > 0) parts.push(`${exerciseCount} תרגילים`)
      if (climbingCount > 0) parts.push(`${climbingCount} מסלולים`)
      
      const message = parts.length > 0 
        ? `✅ נשמר! ${parts.join(' + ')}`
        : '✅ הנתונים נשמרו בהצלחה!'
      
      showToast(message, 'success')
      
      setTimeout(() => router.push('/calendar'), 1500)
    } catch (err) {
      console.error('❌ Error saving data:', err)
      showToast('❌ שגיאה בשמירה', 'error')
    }
  }

  // Loading & Error States
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  if (!activeUser) {
    return (
      <div className="text-center mt-10 text-gray-600">
        <p>אנא בחר משתמש</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="text-2xl mb-2">⌛</div>
        <p>טוען נתונים...</p>
      </div>
    )
  }

  if (!calendarRow) {
    return <p className="p-6 text-center">⚠️ לא נמצא אימון לעריכה</p>
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">
          עריכת אימון — {workout?.Name || ''}
        </h1>

        <p className="text-gray-600 mb-6">
          תאריך: {dayjs(calendarRow.StartTime).format('DD/MM/YYYY HH:mm')}
        </p>
        {/* Workout Video */}
        {workout?.VideoURL && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎥 וידאו הסבר לאימון:
            </label>
            <a
              href={workout.VideoURL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <span>▶️</span>
              <span>צפה בוידאו</span>
            </a>
          </div>
        )}


        {/* ✨ תרגילים - UPDATED: משתמש ב-ExerciseExecutionForm */}
        {exerciseForms.length > 0 && (
          <section className="mb-10">
            <h2 className="font-semibold text-xl mb-4">💪 תרגילים</h2>
            <div className="space-y-4">
              {exerciseForms.map((ex, i) => (
                <ExerciseAccordion
                  key={ex.ExerciseID}
                  exercise={ex}
                  onChange={(data) => handleExerciseChange(i, data)}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {/* טיפוס - Show only if containsClimbing */}
        {containsClimbing && (
          <section className="mb-10">
          <h2 className="font-semibold text-xl mb-4">🧗 רישומי טיפוס</h2>

          {/* Location Selector */}
          <div className="mb-6">
            <label className="block font-medium mb-2">📍 מיקום:</label>
            <select
              value={selectedLocation || ''}
              onChange={(e) => setSelectedLocation(Number(e.target.value) || null)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר מיקום</option>
              {locations.map(loc => (
                <option key={loc.LocationID} value={loc.LocationID}>
                  {loc.LocationName} - {loc.City} ({loc.LocationType})
                </option>
              ))}
            </select>
          </div>

          <ClimbingSummary routes={routes} />

          <RouteTypeBlock
            type="Boulder"
            icon="🪨"
            routes={routesByType.Boulder}
            onRoutesChange={(newRoutes) => {
              setRoutes([
                ...routes.filter(r => r.climbType !== 'Boulder'),
                ...newRoutes
              ])
            }}
            boulderGrades={boulderGrades}
            leadGrades={leadGrades}
            boardTypes={boardTypes}
            selectedBoardType={selectedBoardType}
            onBoardTypeChange={setSelectedBoardType}
          />

          <RouteTypeBlock
            type="Board"
            icon="🏋️"
            routes={routesByType.Board}
            onRoutesChange={(newRoutes) => {
              setRoutes([
                ...routes.filter(r => r.climbType !== 'Board'),
                ...newRoutes
              ])
            }}
            boulderGrades={boulderGrades}
            leadGrades={leadGrades}
            boardTypes={boardTypes}
            selectedBoardType={selectedBoardType}
            onBoardTypeChange={setSelectedBoardType}
          />

          <RouteTypeBlock
            type="Lead"
            icon="🧗"
            routes={routesByType.Lead}
            onRoutesChange={(newRoutes) => {
              setRoutes([
                ...routes.filter(r => r.climbType !== 'Lead'),
                ...newRoutes
              ])
            }}
            boulderGrades={boulderGrades}
            leadGrades={leadGrades}
            boardTypes={boardTypes}
            selectedBoardType={selectedBoardType}
            onBoardTypeChange={setSelectedBoardType}
          />
          </section>
        )}
        {/* הערות מטפס */}
        <section className="mb-8">
          <h2 className="font-semibold text-lg mb-2">הערות מטפס</h2>
          <textarea
            className="border border-gray-300 rounded w-full p-3 focus:border-blue-500 focus:outline-none"
            rows={3}
            placeholder="הערות כלליות על האימון..."
            value={climberNotes}
            onChange={(e) => setClimberNotes(e.target.value)}
          />
        </section>

        {/* כפתורים */}
        <div className="flex justify-end gap-3">
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded font-medium"
            onClick={() => router.push('/calendar')}
          >
            ביטול
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
            onClick={handleSave}
          >
            💾 שמירה
            {routes.length > 0 && ` (${routes.length} מסלולים)`}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-lg shadow-xl text-white font-medium z-50 animate-in ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
