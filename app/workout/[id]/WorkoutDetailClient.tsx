'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { ClimbingSummary } from '@/components/climbing/ClimbingSummary'
import { RouteTypeBlock } from '@/components/climbing/RouteTypeBlock'
import { ClimbingRoute, BoulderGrade, LeadGrade, ClimbingLocation, BoardType } from '@/types/climbing'

export default function WorkoutDetailClient({ id }: { id: number }) {
  const { activeUser, loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  const searchParams = useSearchParams()
  const router = useRouter()

  const emailFromQuery = searchParams.get('email')
  const calendarId = searchParams.get('calendar')
  const calendarIdNum = calendarId ? Number(calendarId) : null

  const email = emailFromQuery || activeEmail

  const [workout, setWorkout] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [calendarRow, setCalendarRow] = useState<any>(null)

  const [exercises, setExercises] = useState<any[]>([])
  const [exerciseForms, setExerciseForms] = useState<any[]>([])

  // New climbing state - using ClimbingRoute[]
  const [routes, setRoutes] = useState<ClimbingRoute[]>([])
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [selectedBoardType, setSelectedBoardType] = useState<number | null>(null)

  const [leadGrades, setLeadGrades] = useState<LeadGrade[]>([])
  const [boulderGrades, setBoulderGrades] = useState<BoulderGrade[]>([])
  const [locations, setLocations] = useState<ClimbingLocation[]>([])
  const [boardTypes, setBoardTypes] = useState<BoardType[]>([])

  const [coachNotes, setCoachNotes] = useState<string | null>(null)
  const [climberNotes, setClimberNotes] = useState('')
  const [deloading, setDeloading] = useState(false)
  const [deloadingPercentage, setDeloadingPercentage] = useState<number | null>(null)

  const [toast, setToast] = useState<{ text: string; color: string } | null>(null)
  const showToast = (text: string, color: string) => {
    setToast({ text, color })
    setTimeout(() => setToast(null), 1600)
  }

  // === חישוב סטטוס תאריך ===
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let workoutDate: Date | null = null
  if (calendarRow?.StartTime) {
    workoutDate = new Date(calendarRow.StartTime)
    workoutDate.setHours(0, 0, 0, 0)
  }

  const isFutureWorkout = workoutDate && workoutDate > today
  const isPastWorkout = workoutDate && workoutDate < today
  const isTodayWorkout = workoutDate && workoutDate.getTime() === today.getTime()

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // === שליפת אימון ===
  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!id) return
      try {
        if (calendarIdNum) {
          const { data: c } = await supabase
            .from('Calendar')
            .select('*')
            .eq('CalendarID', calendarIdNum)
            .maybeSingle()
          if (c && isMounted) {
            setCalendarRow(c)
            setClimberNotes(c.ClimberNotes || '')
            setDeloading(c.Deloading || false)
            setDeloadingPercentage(c.DeloadingPercentage || null)
          }
        }

        const { data: w } = await supabase
          .from('Workouts')
          .select('*')
          .eq('WorkoutID', id)
          .maybeSingle()

        if (!isMounted) return

        setWorkout(w)
        setCoachNotes(w?.WorkoutNotes || null)
        if (w) {
          w.containExercise = w?.containExercise === true || w?.containExercise === 'true'
          w.containClimbing = w?.containClimbing === true || w?.containClimbing === 'true'
        }

        const { data: rels } = await supabase
          .from('WorkoutsExercises')
          .select('ExerciseID')
          .eq('WorkoutID', id)

        let mapped: any[] = []
        if (rels?.length) {
          const ids = rels.map((r: any) => r.ExerciseID)
          const { data: exs } = await supabase
            .from('Exercises')
            .select('ExerciseID, Name, Description')
            .in('ExerciseID', ids)
          if (exs?.length)
            mapped = exs.map((x) => ({
              ExerciseID: x.ExerciseID,
              Name: x.Name,
              Description: x.Description,
              RepsDone: null,
              WeightKG: null,
              RPE: null,
              Notes: '',
            }))
        }

        if (!isMounted) return

        setExercises(mapped)
        setExerciseForms(mapped)

        const [lg, bg, loc, bt] = await Promise.all([
          supabase.from('LeadGrades').select('*').order('LeadGradeID'),
          supabase.from('BoulderGrades').select('*').order('BoulderGradeID'),
          supabase.from('ClimbingLocations').select('*').order('LocationName'),
          supabase.from('BoardTypes').select('*').order('BoardName'),
        ])

        if (!isMounted) return

        setLeadGrades(lg.data || [])
        setBoulderGrades(bg.data || [])
        setLocations(loc.data || [])
        setBoardTypes(bt.data || [])
      } catch (err) {
        console.error('❌ שגיאה בטעינה:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    load()

    return () => {
      isMounted = false
    }
  }, [id, calendarIdNum])

  // === שינוי תרגיל ===
  const handleExerciseChange = (i: number, field: string, val: any) => {
    setExerciseForms((prev) => {
      const next = [...prev]
      next[i][field] = val
      return next
    })
  }

  // === Group routes by type ===
  const routesByType = useMemo(() => ({
    Boulder: routes.filter(r => r.climbType === 'Boulder'),
    Board: routes.filter(r => r.climbType === 'Board'),
    Lead: routes.filter(r => r.climbType === 'Lead')
  }), [routes])

  // === מעבר לביצוע היום ===
  const handleConvertToToday = async () => {
    if (!calendarIdNum) {
      showToast('❌ שגיאה: לא נמצא מזהה אימון', 'red')
      return
    }

    const now = new Date().toISOString()

    try {
      const { error } = await supabase
        .from('Calendar')
        .update({ 
          StartTime: now,
          EndTime: new Date(Date.now() + 3600000).toISOString()
        })
        .eq('CalendarID', calendarIdNum)

      if (error) throw error

      showToast('✅ האימון עודכן להיום!', 'blue')
      
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (err) {
      console.error('❌ שגיאה בעדכון תאריך:', err)
      showToast('❌ שגיאה בעדכון תאריך', 'red')
    }
  }

  // === שמירה ===
  const onComplete = async () => {
    if (!email || !workout) {
      showToast('❌ אין אימייל פעיל', 'red')
      return
    }

    // Validation for climbing
    if (workout.containClimbing && routes.length > 0 && !selectedLocation) {
      showToast('❌ נא לבחור מיקום', 'red')
      return
    }

    const now = new Date().toISOString()

    try {
      let activeCalendarId = calendarIdNum
      
      if (!activeCalendarId) {
        const { data: newCal, error: calErr } = await supabase
          .from('Calendar')
          .insert({
            Email: email,
            WorkoutID: id,
            StartTime: now,
            TimeOfDay: 'Morning',
            Completed: true,
            Deloading: deloading,
            Color: deloading ? 'lightgreen' : 'green',
            ClimberNotes: climberNotes,
            CreatedAt: now,
          })
          .select('CalendarID')
          .single()
        if (calErr) throw calErr
        activeCalendarId = newCal.CalendarID
      } else {
        const { error: updErr } = await supabase
          .from('Calendar')
          .update({ 
            Completed: true, 
            Color: deloading ? 'lightgreen' : 'green',
            ClimberNotes: climberNotes 
          })
          .eq('CalendarID', activeCalendarId)
        if (updErr) throw updErr
      }

      // === תרגילים ===
      if (workout.containExercise && exerciseForms.length > 0) {
        const filtered = exerciseForms.filter(
          (ex) =>
            (ex.RepsDone && ex.RepsDone > 0) ||
            (ex.WeightKG && ex.WeightKG > 0) ||
            (ex.RPE && ex.RPE > 0)
        )

        if (filtered.length > 0) {
          const payload = filtered.map((e) => ({
            Email: email,
            WorkoutID: id,
            CalendarID: activeCalendarId,
            ExerciseID: e.ExerciseID,
            RepsDone: e.RepsDone ?? null,
            WeightKG: e.WeightKG ?? null,
            RPE: e.RPE ?? null,
            Notes: e.Notes ?? null,
            Completed: true,
            CreatedAt: now,
          }))
          await supabase.from('ExerciseLogs').insert(payload)
        }
      }

      // === טיפוס - NEW FORMAT ===
      if (workout.containClimbing && routes.length > 0) {
        const payload = routes.map((route) => ({
          Email: email,
          WorkoutID: id,
          CalendarID: activeCalendarId,
          LocationID: selectedLocation,
          ClimbType: route.climbType,
          BoardTypeID: route.climbType === 'Board' ? selectedBoardType : null,
          GradeID: route.gradeID,
          RouteName: route.routeName || null,
          Attempts: route.attempts,
          Successful: route.successful,
          Notes: route.notes || null,
          LogDateTime: now,
          CreatedAt: now,
          UpdatedAt: now
        }))
        await supabase.from('ClimbingLog').insert(payload)
      }

      showToast(`✅ האימון נשמר בהצלחה!${routes.length > 0 ? ` (${routes.length} מסלולים)` : ''}`, 'blue')
      setTimeout(() => router.push(`/calendar?highlight=${activeCalendarId}`), 1000)
    } catch (err) {
      console.error('❌ שגיאה בשמירה:', err)
      showToast('שגיאה בשמירה', 'red')
    }
  }

  // === Loading & Error States ===
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
        <p>טוען אימון...</p>
      </div>
    )
  }

  if (!workout) {
    return <p className="p-6 text-center">האימון לא נמצא</p>
  }

  // === UI ===
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">{workout.Name}</h1>
        <p className="text-gray-700 mb-4">{workout.Description}</p>

        {/* אימון עתידי */}
        {isFutureWorkout && (
          <div className="mt-4 bg-amber-50 border-r-4 border-amber-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⏰</div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900">אימון עתידי</h3>
                <p className="text-amber-800 text-sm mt-1">
                  האימון מתוכנן ל-{formatDate(calendarRow.StartTime)}.
                </p>
                <p className="text-amber-700 text-sm mt-2 font-medium">
                  💡 רוצה לבצע אותו היום? לחץ על הכפתור למטה כדי להעביר את האימון להיום.
                </p>
                <button 
                  onClick={handleConvertToToday}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
                >
                  📅 העבר אימון להיום וביצע עכשיו
                </button>
              </div>
            </div>
          </div>
        )}

        {/* אימון מהעבר */}
        {isPastWorkout && (
          <div className="mt-4 bg-gray-50 border-r-4 border-gray-400 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📌</div>
              <div>
                <h3 className="font-bold text-gray-900">אימון שעבר</h3>
                <p className="text-gray-700 text-sm mt-1">
                  האימון היה מתוכנן ל-{formatDate(calendarRow.StartTime)}.
                  ניתן להשלים אותו עכשיו והוא יישמר לאותו תאריך.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deloading Banner */}
        {deloading && deloadingPercentage && (
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔵</div>
              <div>
                <h3 className="font-bold text-blue-800 text-lg">שבוע הפחתת עומס</h3>
                <p className="text-blue-700 text-sm mt-1">
                  בצע רק <span className="font-bold text-xl">{deloadingPercentage}%</span> מהסטים המתוכננים
                </p>
              </div>
            </div>
          </div>
        )}

        {/* תרגילים */}
        {workout.containExercise && exercises.length > 0 && (
          <section className="mt-6">
            <h2 className="font-semibold text-lg mb-3">תרגילים</h2>
            {exerciseForms.map((ex, i) => (
              <div key={i} className="border border-gray-200 p-4 rounded-lg mb-3 bg-gray-50">
                <div className="font-medium text-lg mb-1">{ex.Name}</div>
                <div className="text-sm text-gray-600 mb-3">{ex.Description}</div>
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    placeholder="חזרות" 
                    type="number"
                    className="border border-gray-300 p-2 rounded focus:border-blue-500 focus:outline-none" 
                    onChange={(e) => handleExerciseChange(i, 'RepsDone', Number(e.target.value))} 
                  />
                  <input 
                    placeholder="משקל (KG)" 
                    type="number"
                    className="border border-gray-300 p-2 rounded focus:border-blue-500 focus:outline-none" 
                    onChange={(e) => handleExerciseChange(i, 'WeightKG', Number(e.target.value))} 
                  />
                  <input 
                    placeholder="RPE (1-10)" 
                    type="number"
                    min="1"
                    max="10"
                    className="border border-gray-300 p-2 rounded focus:border-blue-500 focus:outline-none" 
                    onChange={(e) => handleExerciseChange(i, 'RPE', Number(e.target.value))} 
                  />
                </div>
              </div>
            ))}
          </section>
        )}

        {/* טיפוס - NEW DESIGN */}
        {workout.containClimbing && (
          <section className="mt-8">
            <h2 className="font-semibold text-xl mb-4">🧗 רישום טיפוס</h2>
            
            {/* Location Selector with Required Indicator */}
            <div className="mb-6">
              <label className="block font-medium mb-2">
                📍 מיקום {routes.length > 0 && <span className="text-red-500">*</span>}
              </label>
              <select
                value={selectedLocation || ''}
                onChange={(e) => setSelectedLocation(Number(e.target.value) || null)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  routes.length > 0 && !selectedLocation 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
              >
                <option value="">בחר מיקום</option>
                {locations.map(loc => (
                  <option key={loc.LocationID} value={loc.LocationID}>
                    {loc.LocationName} - {loc.City} ({loc.LocationType})
                  </option>
                ))}
              </select>
              {routes.length > 0 && !selectedLocation && (
                <p className="text-red-600 text-sm mt-1">
                  ⚠️ חובה לבחור מיקום כאשר יש מסלולים
                </p>
              )}
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
              boardTypes={boardTypes}
              selectedBoardType={selectedBoardType}
              onBoardTypeChange={setSelectedBoardType}
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
              boardTypes={boardTypes}
              selectedBoardType={selectedBoardType}
              onBoardTypeChange={setSelectedBoardType}
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
              boardTypes={boardTypes}
              selectedBoardType={selectedBoardType}
              onBoardTypeChange={setSelectedBoardType}
            />
          </section>
        )}

        {/* הערות מטפס */}
        <div className="mt-6">
          <label className="block font-medium mb-2">הערות מטפס</label>
          <textarea 
            placeholder="הערות, תחושות, הישגים..." 
            className="border border-gray-300 rounded w-full p-3 focus:border-blue-500 focus:outline-none" 
            rows={3} 
            value={climberNotes} 
            onChange={(e) => setClimberNotes(e.target.value)} 
          />
        </div>

        {/* כפתור שמירה */}
        <div className="text-center mt-8">
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={onComplete}
            disabled={workout.containClimbing && routes.length > 0 && !selectedLocation}
          >
            ✅ סיום אימון ושמירה
            {workout.containClimbing && routes.length > 0 && ` (${routes.length} מסלולים)`}
          </button>
          {workout.containClimbing && routes.length > 0 && !selectedLocation && (
            <p className="text-red-600 text-sm mt-2">
              ⚠️ נא לבחור מיקום לפני שמירה
            </p>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white text-sm z-[9999] ${
              toast.color === 'blue'
                ? 'bg-blue-600'
                : toast.color === 'red'
                ? 'bg-red-600'
                : 'bg-gray-700'
            }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}