'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { ClimbingSummary } from '@/components/climbing/ClimbingSummary'
import { RouteTypeBlock } from '@/components/climbing/RouteTypeBlock'
import { ClimbingRoute, BoulderGrade, LeadGrade, ClimbingLocation, BoardType } from '@/types/climbing'
import ExerciseAccordion from "@/components/exercises/ExerciseAccordion"
import moment from 'moment-timezone'

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

  // NEW: Add location modal state
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)

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

  // NEW: Load locations function
  const loadLocations = async () => {
    const { data } = await supabase
      .from('ClimbingLocations')
      .select('*')
      .order('LocationName')
    
    setLocations(data || [])
  }

  // NEW: Add new location
  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      showToast('⚠️ יש להזין שם מיקום', 'red')
      return
    }

    setSavingLocation(true)
    try {
      const { data, error } = await supabase
        .from('ClimbingLocations')
        .insert({
          LocationName: newLocationName.trim(),
          LocationType: 'Indoor', // Default
          City: '', // Can be filled later
          Country: 'Israel' // Default
        })
        .select()
        .single()

      if (error) throw error

      // Refresh locations list
      await loadLocations()

      // Auto-select new location
      setSelectedLocation(data.LocationID)

      // Close modal and reset
      setShowAddLocationModal(false)
      setNewLocationName('')

      showToast('✅ מיקום נוסף בהצלחה!', 'blue')
    } catch (error) {
      console.error('Error adding location:', error)
      showToast('❌ שגיאה בהוספת מיקום', 'red')
    } finally {
      setSavingLocation(false)
    }
  }

  // === שליפת אימון - UPDATED WITH BLOCKS & GOALS ===
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

        // ✨ UPDATED: Load WorkoutsExercises with Block, Sets, Reps, Duration, Rest
        const { data: rels } = await supabase
          .from('WorkoutsExercises')
          .select('ExerciseID, Block, Sets, Reps, Duration, Rest, Order')
          .eq('WorkoutID', id)
          .order('Order')

        let mapped: any[] = []
        if (rels?.length) {
          const ids = rels.map((r: any) => r.ExerciseID)
          const { data: exs } = await supabase
            .from('Exercises')
            .select('ExerciseID, Name, Description, IsSingleHand, isDuration, ImageURL, VideoURL')
            .in('ExerciseID', ids)
          
          if (exs?.length) {
            mapped = exs.map((x) => {
              // Find WorkoutsExercises data for this exercise
              const weData = rels.find(r => r.ExerciseID === x.ExerciseID)
              
              return {
                ExerciseID: x.ExerciseID,
                Name: x.Name,
                Description: x.Description,
                IsSingleHand: x.IsSingleHand,
                isDuration: x.isDuration,
                ImageURL: x.ImageURL,
                VideoURL: x.VideoURL,
                
                // ✨ NEW: Exercise Goals from WorkoutsExercises
                Block: weData?.Block || 1,
                Sets: weData?.Sets || null,
                Reps: weData?.Reps || null,
                Duration: weData?.Duration || null,
                Rest: weData?.Rest || null,
                
                RepsDone: null,
                DurationSec: null,
                WeightKG: null,
                RPE: null,
                Notes: '',
                Completed: false,
                RepsDoneLeft: null,
                DurationSecLeft: null,
                WeightKGLeft: null,
                RPELeft: null,
                NotesLeft: '',
                CompletedLeft: false,
              }
            })
          }
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

  // ✨ NEW: Group exercises by Block
  const exercisesByBlock = useMemo(() => {
    const blocks: { [key: number]: any[] } = {}
    exerciseForms.forEach(ex => {
      const blockNum = ex.Block || 1
      if (!blocks[blockNum]) {
        blocks[blockNum] = []
      }
      blocks[blockNum].push(ex)
    })
    return blocks
  }, [exerciseForms])

  const blockNumbers = useMemo(() => 
    Object.keys(exercisesByBlock).map(Number).sort((a, b) => a - b),
    [exercisesByBlock]
  )

  // === שינוי תרגיל ===
  const handleExerciseChange = (i: number, data: any) => {
    setExerciseForms((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], ...data }
      return next
    })
  }

  // === Group routes by type ===
  const routesByType = useMemo(() => ({
    Boulder: routes.filter(r => r.climbType === 'Boulder'),
    Board: routes.filter(r => r.climbType === 'Board'),
    Lead: routes.filter(r => r.climbType === 'Lead')
  }), [routes])

  // Check what workout contains
  const containsExercises = workout?.containExercise && exercises.length > 0
  const containsClimbing = workout?.containClimbing

  // === מעבר לביצוע היום ===
  const handleConvertToToday = async () => {
    if (!calendarIdNum) {
      showToast('❌ שגיאה: לא נמצא מזהה אימון', 'red')
      return
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss')

    try {
      const { error } = await supabase
        .from('Calendar')
        .update({ 
          StartTime: now,
          EndTime: moment().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss')
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

  // === שמירה - NO CHANGES TO SAVE LOGIC ===
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

    const now = moment().format('YYYY-MM-DD HH:mm:ss')

    const logDateTime = calendarRow?.StartTime 
      ? moment(calendarRow.StartTime).format('YYYY-MM-DD HH:mm:ss')
      : now

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

      // === תרגילים - with Single Hand & isDuration support ===
      if (workout.containExercise && exerciseForms.length > 0) {
        for (const ex of exerciseForms) {
          if (ex.IsSingleHand) {
            // Single Hand: save 2 records
            
            // Right hand
            const hasDataRight =
              (ex.RepsDone !== null && ex.RepsDone !== undefined) ||
              (ex.DurationSec !== null && ex.DurationSec !== undefined) ||
              (ex.WeightKG !== null && ex.WeightKG !== undefined) ||
              (ex.RPE !== null && ex.RPE !== undefined) ||
              (ex.Notes && ex.Notes.trim() !== '')

            if (hasDataRight) {
              // Check if exists
              const { data: existingRight } = await supabase
                .from('ExerciseLogs')
                .select('ExerciseLogID')
                .eq('CalendarID', activeCalendarId)
                .eq('ExerciseID', ex.ExerciseID)
                .eq('HandSide', 'Right')
                .maybeSingle()

              const rightPayload = {
                Email: email,
                WorkoutID: id,
                CalendarID: activeCalendarId,
                ExerciseID: ex.ExerciseID,
                HandSide: 'Right',
                RepsDone: ex.isDuration ? null : (ex.RepsDone || null),
                DurationSec: ex.isDuration ? (ex.DurationSec || null) : null,
                WeightKG: ex.WeightKG || null,
                RPE: ex.RPE || null,
                Notes: ex.Notes?.trim() || null,
                Completed: true,
                UpdatedAt: now,
              }

              if (existingRight) {
                await supabase
                  .from('ExerciseLogs')
                  .update(rightPayload)
                  .eq('ExerciseLogID', existingRight.ExerciseLogID)
              } else {
                await supabase
                  .from('ExerciseLogs')
                  .insert({ ...rightPayload, CreatedAt: now })
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
              const { data: existingLeft } = await supabase
                .from('ExerciseLogs')
                .select('ExerciseLogID')
                .eq('CalendarID', activeCalendarId)
                .eq('ExerciseID', ex.ExerciseID)
                .eq('HandSide', 'Left')
                .maybeSingle()

              const leftPayload = {
                Email: email,
                WorkoutID: id,
                CalendarID: activeCalendarId,
                ExerciseID: ex.ExerciseID,
                HandSide: 'Left',
                RepsDone: ex.isDuration ? null : (ex.RepsDoneLeft || null),
                DurationSec: ex.isDuration ? (ex.DurationSecLeft || null) : null,
                WeightKG: ex.WeightKGLeft || null,
                RPE: ex.RPELeft || null,
                Notes: ex.NotesLeft?.trim() || null,
                Completed: true,
                UpdatedAt: now,
              }

              if (existingLeft) {
                await supabase
                  .from('ExerciseLogs')
                  .update(leftPayload)
                  .eq('ExerciseLogID', existingLeft.ExerciseLogID)
              } else {
                await supabase
                  .from('ExerciseLogs')
                  .insert({ ...leftPayload, CreatedAt: now })
              }
            }

          } else {
            // Regular exercise
            const hasData =
              (ex.RepsDone !== null && ex.RepsDone !== undefined) ||
              (ex.DurationSec !== null && ex.DurationSec !== undefined) ||
              (ex.WeightKG !== null && ex.WeightKG !== undefined) ||
              (ex.RPE !== null && ex.RPE !== undefined) ||
              (ex.Notes && ex.Notes.trim() !== '')

            if (!hasData) continue

            const { data: existingLog } = await supabase
              .from('ExerciseLogs')
              .select('ExerciseLogID')
              .eq('CalendarID', activeCalendarId)
              .eq('ExerciseID', ex.ExerciseID)
              .eq('HandSide', 'Both')
              .maybeSingle()

            const payload = {
              Email: email,
              WorkoutID: id,
              CalendarID: activeCalendarId,
              ExerciseID: ex.ExerciseID,
              HandSide: 'Both',
              RepsDone: ex.isDuration ? null : (ex.RepsDone || null),
              DurationSec: ex.isDuration ? (ex.DurationSec || null) : null,
              WeightKG: ex.WeightKG || null,
              RPE: ex.RPE || null,
              Notes: ex.Notes?.trim() || null,
              Completed: true,
              UpdatedAt: now,
            }

            if (existingLog) {
              await supabase
                .from('ExerciseLogs')
                .update(payload)
                .eq('ExerciseLogID', existingLog.ExerciseLogID)
            } else {
              await supabase
                .from('ExerciseLogs')
                .insert({ ...payload, CreatedAt: now })
            }
          }
        }
      }

      // === טיפוס ===
      if (workout.containClimbing && routes.length > 0) {
        if (!selectedLocation) {
          showToast('❌ נא לבחור מיקום', 'red')
          return
        }

        for (const route of routes) {
          const payload = {
            Email: email,
            WorkoutID: id,
            CalendarID: activeCalendarId,
            ClimbType: route.climbType,
            GradeID: route.gradeID,
            RouteName: route.routeName || null,
            LocationID: selectedLocation,
            BoardTypeID: route.climbType === 'Board' ? selectedBoardType : null,
            Attempts: route.attempts || 1,
            Successful: route.successful || false,
            Notes: route.notes?.trim() || null,
            LogDateTime: logDateTime,
          }

          await supabase.from('ClimbingLog').insert(payload)
        }
      }

      showToast('✅ האימון נשמר בהצלחה!', 'blue')
      
      setTimeout(() => {
        router.push('/calendar')
      }, 800)
    } catch (err) {
      console.error('❌ שגיאה בשמירה:', err)
      showToast('❌ שגיאה בשמירה', 'red')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען...</div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">אימון לא נמצא</div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-6xl" dir="rtl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {workout.Name}
            </h1>
            
            {/* Date Status */}
            {calendarRow && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">
                  📅 {formatDate(calendarRow.StartTime)}
                </span>
                {isPastWorkout && (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                    ⚠️ אימון עבר
                  </span>
                )}
                {isFutureWorkout && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                    🔮 אימון עתידי
                  </span>
                )}
                {isTodayWorkout && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                    ✅ אימון היום
                  </span>
                )}
              </div>
            )}

            {/* Convert to Today Button */}
            {(isFutureWorkout || isPastWorkout) && (
              <button
                onClick={handleConvertToToday}
                className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                🔄 העבר להיום
              </button>
            )}
          </div>

          {/* ✨ NEW: Workout Info Section */}
          <section className="mb-8 space-y-4">
            {/* Video */}
            {workout.VideoURL && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  🎥 וידאו הדרכה
                </h3>
                <a 
                  href={workout.VideoURL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  צפה בווידאו
                </a>
              </div>
            )}

            {/* Description */}
            {workout.Description && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  📝 תיאור האימון
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{workout.Description}</p>
              </div>
            )}

            {/* Coach Notes */}
            {workout.WorkoutNotes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  👨‍🏫 הערות מאמן
                </h3>
                <p className="text-yellow-900 whitespace-pre-wrap">{workout.WorkoutNotes}</p>
              </div>
            )}

            {/* When To Practice */}
            {workout.WhenToPractice && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  ⏰ מתי להתאמן
                </h3>
                <p className="text-green-900">{workout.WhenToPractice}</p>
              </div>
            )}
          </section>

          {/* ✨ UPDATED: Exercises by Blocks */}
          {containsExercises && (
            <section className="mb-8">
              <h2 className="font-semibold text-xl mb-6">💪 תרגילים</h2>

              {blockNumbers.map(blockNum => (
                <div key={blockNum} className="mb-8">
                  {/* Block Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg px-4 py-3 font-bold text-lg">
                    בלוק {blockNum}
                  </div>
                  
                  {/* Exercises in this block */}
                  <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 space-y-4 bg-gray-50">
                    {exercisesByBlock[blockNum].map((ex, idx) => {
                      const globalIndex = exerciseForms.findIndex(e => e.ExerciseID === ex.ExerciseID)
                      return (
                        <ExerciseAccordion
                          key={ex.ExerciseID}
                          exercise={ex}
                          onChange={(data) => handleExerciseChange(globalIndex, data)}
                          index={globalIndex}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Climbing Section */}
          {containsClimbing && (
            <section className="mb-8">
              <h2 className="font-semibold text-xl mb-4">🧗 רישומי טיפוס</h2>

              {/* Location Selector */}
              <div className="mb-6">
                <label className="block font-medium mb-2">📍 מיקום:</label>
                <div className="space-y-2">
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
                        {loc.LocationName}
                      </option>
                    ))}
                  </select>
                  
                  {/* Add New Location Button */}
                  <button
                    type="button"
                    onClick={() => setShowAddLocationModal(true)}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
                  >
                    ➕ הוסף מיקום חדש
                  </button>
                </div>
                
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

      {/* Add New Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                📍 הוספת מיקום חדש
              </h3>
              <button
                onClick={() => setShowAddLocationModal(false)}
                disabled={savingLocation}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 הוסף מיקום חדש לרשימה. המיקום יהיה זמין לכולם.
              </p>
            </div>

            {/* Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם המיקום *
              </label>
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="למשל: קיר ספיידרמן"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={savingLocation}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddLocation()
                  }
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAddLocation}
                disabled={savingLocation || !newLocationName.trim()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                {savingLocation ? '⏳ שומר...' : '✅ הוסף מיקום'}
              </button>
              <button
                onClick={() => setShowAddLocationModal(false)}
                disabled={savingLocation}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}