'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { ClimbingSummary } from '@/components/climbing/ClimbingSummary'
import { RouteTypeBlock } from '@/components/climbing/RouteTypeBlock'
import { ClimbingRoute, BoulderGrade, LeadGrade, ClimbingLocation, ClimbingLogEntry } from '@/types/climbing'
import { generateTempId, getGradeDisplay } from '@/lib/climbing-helpers'
import dayjs from 'dayjs'

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
  
  const [leadGrades, setLeadGrades] = useState<LeadGrade[]>([])
  const [boulderGrades, setBoulderGrades] = useState<BoulderGrade[]>([])
  const [locations, setLocations] = useState<ClimbingLocation[]>([])
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

  // טעינת נתונים
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

        // Load Exercises
        const { data: rels } = await supabase
          .from('WorkoutsExercises')
          .select('ExerciseID')
          .eq('WorkoutID', cal.WorkoutID)
        const ids = rels?.map((r) => r.ExerciseID) || []

        const { data: exs } = await supabase
          .from('Exercises')
          .select('ExerciseID, Name, Description')
          .in('ExerciseID', ids)

        const { data: logs } = await supabase
          .from('ExerciseLogs')
          .select('*')
          .eq('CalendarID', calendarId)

        const mappedExercises =
          exs?.map((ex) => {
            const log = logs?.find((l) => l.ExerciseID === ex.ExerciseID)
            return {
              ExerciseLogID: log?.ExerciseLogID || null,
              ExerciseID: ex.ExerciseID,
              Name: ex.Name,
              Description: ex.Description,
              RepsDone: log?.RepsDone ?? '',
              WeightKG: log?.WeightKG ?? '',
              RPE: log?.RPE ?? '',
              Notes: log?.Notes ?? '',
            }
          }) || []
        setExerciseForms(mappedExercises)

        // Load Grades & Locations
        const [lg, bg, loc] = await Promise.all([
          supabase.from('LeadGrades').select('*').order('LeadGradeID'),
          supabase.from('BoulderGrades').select('*').order('BoulderGradeID'),
          supabase.from('ClimbingLocations').select('*').order('LocationName'),
        ])
        setLeadGrades(lg.data || [])
        setBoulderGrades(bg.data || [])
        setLocations(loc.data || [])

        // Load existing ClimbingLogs and convert to ClimbingRoute format
        const { data: climbLogs } = await supabase
          .from('ClimbingLog')
          .select('*')
          .eq('CalendarID', calendarId)

        if (climbLogs && climbLogs.length > 0) {
          // Set location from first log (assuming same location for all)
          if (climbLogs[0].LocationID) {
            setSelectedLocation(climbLogs[0].LocationID)
          }

          // Convert DB logs to ClimbingRoute format
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

  const handleExerciseChange = (i: number, field: string, val: any) =>
    setExerciseForms((prev) => {
      const next = [...prev]
      next[i][field] = val
      return next
    })

  // Group routes by type
  const routesByType = useMemo(() => ({
    Boulder: routes.filter(r => r.climbType === 'Boulder'),
    Board: routes.filter(r => r.climbType === 'Board'),
    Lead: routes.filter(r => r.climbType === 'Lead')
  }), [routes])

  const handleSave = async () => {
    if (!activeEmail) {
      showToast('❌ אין משתמש פעיל', 'error')
      return
    }

    try {
      const now = new Date().toISOString()
      const email = calendarRow?.Email || activeEmail

      let exerciseCount = 0
      let climbingCount = 0

      // Save Exercises
      for (const ex of exerciseForms) {
        const hasData =
          (ex.RepsDone && ex.RepsDone !== '') ||
          (ex.WeightKG && ex.WeightKG !== '') ||
          (ex.RPE && ex.RPE !== '') ||
          (ex.Notes && ex.Notes.trim() !== '')
        if (!hasData) continue

        exerciseCount++

        const payload = {
          CalendarID: calendarId,
          WorkoutID: workout?.WorkoutID,
          ExerciseID: ex.ExerciseID,
          Email: email,
          RepsDone: ex.RepsDone || null,
          WeightKG: ex.WeightKG || null,
          RPE: ex.RPE || null,
          Notes: ex.Notes?.trim() || null,
          Completed: true,
          UpdatedAt: now,
        }
        await supabase
          .from('ExerciseLogs')
          .upsert(payload, { onConflict: 'ExerciseLogID' })
        await new Promise((r) => setTimeout(r, 100))
      }

      // Save Climbing Routes - NEW FORMAT
      if (routes.length > 0) {
        climbingCount = routes.length
        
        for (const route of routes) {
          const existingLogId = existingLogIds.get(route.id)
          
          const payload: any = {
            CalendarID: calendarId,
            WorkoutID: workout?.WorkoutID,
            Email: email,
            ClimbType: route.climbType,
            LocationID: selectedLocation,
            BoardTypeID: null,  // TODO: add board selection if needed
            GradeID: route.gradeID,
            RouteName: route.routeName || null,
            Attempts: route.attempts,
            Successful: route.successful,
            Notes: route.notes || null,
            LogDateTime: now,
            UpdatedAt: now,
          }

          if (existingLogId) {
            // UPDATE existing log
            payload.ClimbingLogID = existingLogId
            await supabase
              .from('ClimbingLog')
              .upsert(payload, { onConflict: 'ClimbingLogID' })
          } else {
            // INSERT new log
            payload.CreatedAt = now
            await supabase
              .from('ClimbingLog')
              .insert(payload)
          }
          
          await new Promise((r) => setTimeout(r, 100))
        }

        // DELETE logs that were removed from UI
        const currentIds = Array.from(existingLogIds.values())
        const keptIds = routes
          .map(r => existingLogIds.get(r.id))
          .filter(id => id !== undefined)
        
        const idsToDelete = currentIds.filter(id => !keptIds.includes(id))
        
        if (idsToDelete.length > 0) {
          await supabase
            .from('ClimbingLog')
            .delete()
            .in('ClimbingLogID', idsToDelete)
        }
      }

      // Update Calendar notes
      await supabase
        .from('Calendar')
        .update({ ClimberNotes: climberNotes, UpdatedAt: now })
        .eq('CalendarID', calendarId)

      // Show success message
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

        {/* תרגילים */}
        {exerciseForms.length > 0 && (
          <section className="mb-10">
            <h2 className="font-semibold text-lg mb-3">תרגילים</h2>
            {exerciseForms.map((ex, i) => (
              <div key={i} className="border border-gray-200 p-4 rounded-lg mb-4 bg-gray-50">
                <div className="font-medium text-lg mb-1">{ex.Name}</div>
                <div className="text-sm text-gray-600 mb-3">{ex.Description}</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    className="border border-gray-300 p-2 rounded focus:border-blue-500 focus:outline-none"
                    placeholder="חזרות"
                    type="number"
                    value={ex.RepsDone}
                    onChange={(e) => handleExerciseChange(i, 'RepsDone', e.target.value)}
                  />
                  <input
                    className="border border-gray-300 p-2 rounded focus:border-blue-500 focus:outline-none"
                    placeholder="משקל (ק״ג)"
                    type="number"
                    value={ex.WeightKG}
                    onChange={(e) => handleExerciseChange(i, 'WeightKG', e.target.value)}
                  />
                  <input
                    className="border border-gray-300 p-2 rounded focus:border-blue-500 focus:outline-none"
                    placeholder="RPE (1-10)"
                    type="number"
                    min="1"
                    max="10"
                    value={ex.RPE}
                    onChange={(e) => handleExerciseChange(i, 'RPE', e.target.value)}
                  />
                </div>

                <textarea
                  className="border border-gray-300 p-2 rounded w-full text-sm mt-3 focus:border-blue-500 focus:outline-none"
                  placeholder="הערות"
                  rows={2}
                  value={ex.Notes}
                  onChange={(e) => handleExerciseChange(i, 'Notes', e.target.value)}
                />
              </div>
            ))}
          </section>
        )}

        {/* טיפוס - NEW DESIGN */}
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

          {/* Summary */}
          <ClimbingSummary routes={routes} />

          {/* Boulder Block */}
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
          />

          {/* Board Block */}
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
          />

          {/* Lead Block */}
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
          />
        </section>

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
            💾 שמירה ({routes.length} מסלולים)
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