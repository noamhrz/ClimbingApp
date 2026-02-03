// app/calendar-edit/[calendarId]/CalendarEditClient.tsx
// ✨ FIXED VERSION - Proper save handling, no premature navigation

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
  
  // Climbing state
  const [routes, setRoutes] = useState<ClimbingRoute[]>([])
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [selectedBoardType, setSelectedBoardType] = useState<number | null>(null)
  
  const [leadGrades, setLeadGrades] = useState<LeadGrade[]>([])
  const [boulderGrades, setBoulderGrades] = useState<BoulderGrade[]>([])
  const [locations, setLocations] = useState<ClimbingLocation[]>([])
  const [locationSearch, setLocationSearch] = useState('')
  const [boardTypes, setBoardTypes] = useState<BoardType[]>([])
  const [climberNotes, setClimberNotes] = useState('')
  const [loading, setLoading] = useState(true)

  // Track which routes existed in DB
  const [existingLogIds, setExistingLogIds] = useState<Map<string, number>>(new Map())

  // Location modal state
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)

  // Track open exercises
  const [openExercises, setOpenExercises] = useState<Set<number>>(new Set())

  // ✅ NEW: Saving state
  const [isSaving, setIsSaving] = useState(false)

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load locations
  const loadLocations = async () => {
    const { data } = await supabase
      .from('ClimbingLocations')
      .select('*')
      .order('LocationName')
    
    setLocations(data || [])
  }

  // Add new location
  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      showToast('⚠️ יש להזין שם מיקום', 'error')
      return
    }

    setSavingLocation(true)
    try {
      const { data, error } = await supabase
        .from('ClimbingLocations')
        .insert({
          LocationName: newLocationName.trim(),
          LocationType: 'Indoor',
          City: '',
          Country: 'Israel'
        })
        .select()
        .single()

      if (error) throw error

      await loadLocations()
      setSelectedLocation(data.LocationID)
      setShowAddLocationModal(false)
      setNewLocationName('')

      showToast('✅ מיקום נוסף בהצלחה!', 'success')
    } catch (error) {
      console.error('Error adding location:', error)
      showToast('❌ שגיאה בהוספת מיקום', 'error')
    } finally {
      setSavingLocation(false)
    }
  }

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return locations
    
    const searchLower = locationSearch.toLowerCase()
    return locations.filter(loc => 
      loc.LocationName.toLowerCase().includes(searchLower)
    )
  }, [locations, locationSearch])

  // ✅ Block navigation during save
  useEffect(() => {
    if (!isSaving) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'שמירה בתהליך - האם אתה בטוח שברצונך לעזוב?'
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isSaving])

  // Load data
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

        // Load WorkoutsExercises with Block, Sets, Reps, Duration, Rest
        const { data: rels } = await supabase
          .from('WorkoutsExercises')
          .select('ExerciseID, Block, Sets, Reps, Duration, Rest, Order')
          .eq('WorkoutID', cal.WorkoutID)
          .order('Order')

        const ids = rels?.map((r) => r.ExerciseID) || []

        // Load Exercises
        const { data: exs } = await supabase
          .from('Exercises')
          .select('ExerciseID, Name, Description, IsSingleHand, isDuration, ImageURL, VideoURL')
          .in('ExerciseID', ids)

        // Load existing logs
        const { data: logs } = await supabase
          .from('ExerciseLogs')
          .select('*')
          .eq('CalendarID', calendarId)

        const mappedExercises =
          exs?.map((ex) => {
            const weData = rels?.find(r => r.ExerciseID === ex.ExerciseID)
            
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
                
                Block: weData?.Block || 1,
                Sets: weData?.Sets || null,
                Reps: weData?.Reps || null,
                Duration: weData?.Duration || null,
                Rest: weData?.Rest || null,
                
                RepsDone: logRight?.RepsDone ?? null,
                DurationSec: logRight?.DurationSec ?? null,
                WeightKG: logRight?.WeightKG ?? null,
                RPE: logRight?.RPE ?? null,
                Notes: logRight?.Notes ?? '',
                Completed: logRight?.Completed ?? false,
                
                RepsDoneLeft: logLeft?.RepsDone ?? null,
                DurationSecLeft: logLeft?.DurationSec ?? null,
                WeightKGLeft: logLeft?.WeightKG ?? null,
                RPELeft: logLeft?.RPE ?? null,
                NotesLeft: logLeft?.Notes ?? '',
                CompletedLeft: logLeft?.Completed ?? false,
              }
            } else {
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
                
                Block: weData?.Block || 1,
                Sets: weData?.Sets || null,
                Reps: weData?.Reps || null,
                Duration: weData?.Duration || null,
                Rest: weData?.Rest || null,
                
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

        // Load existing ClimbingLogs
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
        showToast('❌ שגיאה בטעינת נתונים', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [calendarId])

  // Group exercises by Block
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

  const handleExerciseChange = (i: number, data: any) => {
    setExerciseForms((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], ...data }
      return next
    })
  }

  const toggleExercise = (exerciseId: number) => {
    setOpenExercises(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  const toggleBlock = (blockNum: number) => {
    const exerciseIds = exercisesByBlock[blockNum].map(ex => ex.ExerciseID)
    const allOpen = exerciseIds.every(id => openExercises.has(id))
    
    setOpenExercises(prev => {
      const next = new Set(prev)
      
      if (allOpen) {
        exerciseIds.forEach(id => next.delete(id))
      } else {
        exerciseIds.forEach(id => next.add(id))
      }
      
      return next
    })
  }

  const isBlockAllOpen = (blockNum: number) => {
    const exerciseIds = exercisesByBlock[blockNum].map(ex => ex.ExerciseID)
    return exerciseIds.length > 0 && exerciseIds.every(id => openExercises.has(id))
  }

  // Group routes by type
  const routesByType = useMemo(() => ({
    Boulder: routes.filter(r => r.climbType === 'Boulder'),
    Board: routes.filter(r => r.climbType === 'Board'),
    Lead: routes.filter(r => r.climbType === 'Lead')
  }), [routes])

  const containsClimbing = routes.length > 0

  // ✅ FIXED: Save function with proper async handling
  const handleSave = async () => {
    if (!activeEmail) {
      showToast('❌ אין משתמש פעיל', 'error')
      return
    }

    if (isSaving) {
      showToast('⏳ שמירה כבר בתהליך...', 'error')
      return
    }

    setIsSaving(true)

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss')
      const email = calendarRow?.Email || activeEmail

      // ✅ Use calendar's StartTime for LogDateTime
      const logDateTime = calendarRow?.StartTime 
        ? moment(calendarRow.StartTime).format('YYYY-MM-DD HH:mm:ss')
        : now

      let exerciseCount = 0
      let climbingCount = 0
      let deletedLogIds: number[] = []

      // Save Exercises
      for (const ex of exerciseForms) {
        if (ex.IsSingleHand) {
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
            
            const { data: existingRight } = await supabase
              .from('ExerciseLogs')
              .select('ExerciseLogID')
              .eq('CalendarID', calendarId)
              .eq('ExerciseID', ex.ExerciseID)
              .eq('HandSide', 'Right')
              .maybeSingle()

            if (existingRight) {
              await supabase
                .from('ExerciseLogs')
                .update(payloadRight)
                .eq('ExerciseLogID', existingRight.ExerciseLogID)
            } else {
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
            
            const { data: existingLeft } = await supabase
              .from('ExerciseLogs')
              .select('ExerciseLogID')
              .eq('CalendarID', calendarId)
              .eq('ExerciseID', ex.ExerciseID)
              .eq('HandSide', 'Left')
              .maybeSingle()

            if (existingLeft) {
              await supabase
                .from('ExerciseLogs')
                .update(payloadLeft)
                .eq('ExerciseLogID', existingLeft.ExerciseLogID)
            } else {
              await supabase
                .from('ExerciseLogs')
                .insert({ ...payloadLeft, CreatedAt: now })
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

          if (hasData) {
            exerciseCount++
            const payloadBoth = {
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
            
            const { data: existingBoth } = await supabase
              .from('ExerciseLogs')
              .select('ExerciseLogID')
              .eq('CalendarID', calendarId)
              .eq('ExerciseID', ex.ExerciseID)
              .eq('HandSide', 'Both')
              .maybeSingle()

            if (existingBoth) {
              await supabase
                .from('ExerciseLogs')
                .update(payloadBoth)
                .eq('ExerciseLogID', existingBoth.ExerciseLogID)
            } else {
              await supabase
                .from('ExerciseLogs')
                .insert({ ...payloadBoth, CreatedAt: now })
            }
          }
        }
      }

      // Handle Climbing Routes - DELETE, UPDATE, INSERT
      const currentRouteIds = new Set(routes.map(r => r.id))
      
      existingLogIds.forEach((climbingLogId, routeId) => {
        if (!currentRouteIds.has(routeId)) {
          deletedLogIds.push(climbingLogId)
        }
      })

      // Delete removed routes
      if (deletedLogIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('ClimbingLog')
          .delete()
          .in('ClimbingLogID', deletedLogIds)
        
        if (deleteError) {
          console.error('Error deleting routes:', deleteError)
          throw new Error('שגיאה במחיקת מסלולים')
        }
      }

      // Save Climbing Routes
      if (routes.length > 0) {
        if (!selectedLocation) {
          throw new Error('יש לבחור מיקום לפני שמירת מסלולי טיפוס')
        }

        for (const route of routes) {
          climbingCount++
          const payload = {
            CalendarID: calendarId,
            WorkoutID: workout?.WorkoutID,
            Email: email,
            ClimbType: route.climbType,
            GradeID: route.gradeID,
            RouteName: route.routeName || null,
            LocationID: selectedLocation,
            BoardTypeID: route.climbType === 'Board' ? selectedBoardType : null,
            Attempts: route.attempts || 1,
            Successful: route.successful || false,
            Notes: route.notes?.trim() || null,
            LogDateTime: logDateTime,
            UpdatedAt: now,
          }

          const existingId = existingLogIds.get(route.id)
          if (existingId) {
            await supabase
              .from('ClimbingLog')
              .update(payload)
              .eq('ClimbingLogID', existingId)
          } else {
            await supabase.from('ClimbingLog').insert({ ...payload, CreatedAt: now })
          }
        }
      } else if (existingLogIds.size > 0) {
        const allLogIds = Array.from(existingLogIds.values())
        await supabase
          .from('ClimbingLog')
          .delete()
          .in('ClimbingLogID', allLogIds)
      }

      // Update Calendar notes
      await supabase
        .from('Calendar')
        .update({ 
          ClimberNotes: climberNotes?.trim() || null,
          UpdatedAt: now 
        })
        .eq('CalendarID', calendarId)

      // ✅ Build success message
      let message = '✅ נשמר בהצלחה!'
      if (exerciseCount > 0) message += ` ${exerciseCount} תרגילים`
      if (climbingCount > 0) message += ` ${climbingCount} מסלולים`
      if (deletedLogIds.length > 0) message += ` (${deletedLogIds.length} מסלולים נמחקו)`
      
      showToast(message, 'success')
      
      // ✅ Wait for user to see success message, THEN navigate
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // ✅ Only navigate after ALL saves completed successfully
      router.push('/calendar')

    } catch (error: any) {
      console.error('Error saving:', error)
      showToast(`❌ שגיאה בשמירה: ${error.message || 'אנא נסה שוב'}`, 'error')
      // ❌ Don't navigate if there was an error!
    } finally {
      setIsSaving(false)
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

  const containExercise = workout?.containExercise === true || workout?.containExercise === 'true'

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-6" dir="rtl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {workout.Name}
            </h1>
            {calendarRow?.StartTime && (
              <p className="text-gray-600">
                📅 {dayjs(calendarRow.StartTime).format('DD/MM/YYYY HH:mm')}
              </p>
            )}
          </div>

          {/* Workout Info Section */}
          <section className="mb-8 space-y-4">
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

            {workout.Description && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  📝 תיאור האימון
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{workout.Description}</p>
              </div>
            )}

            {workout.WorkoutNotes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  👨‍🏫 הערות מאמן
                </h3>
                <p className="text-yellow-900 whitespace-pre-wrap">{workout.WorkoutNotes}</p>
              </div>
            )}

            {workout.WhenToPractice && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  ⏰ מתי להתאמן
                </h3>
                <p className="text-green-900">{workout.WhenToPractice}</p>
              </div>
            )}
          </section>

          {/* Exercises by Blocks */}
          {containExercise && exerciseForms.length > 0 && (
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-6">💪 תרגילים</h2>
              
              {blockNumbers.map(blockNum => {
                const blockOpen = isBlockAllOpen(blockNum)
                const exerciseCount = exercisesByBlock[blockNum].length
                
                return (
                  <div key={blockNum} className="mb-8">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg px-4 py-3 font-bold text-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex justify-between items-center select-none"
                      onClick={() => toggleBlock(blockNum)}
                    >
                      <span>📦 בלוק {blockNum}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="opacity-90 font-normal">
                          {exerciseCount} {exerciseCount === 1 ? 'תרגיל' : 'תרגילים'}
                        </span>
                        <span className="font-bold">
                          {blockOpen ? '▼ סגור הכל' : '▶ פתח הכל'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 space-y-4 bg-gray-50">
                      {exercisesByBlock[blockNum].map((ex, idx) => {
                        const globalIndex = exerciseForms.findIndex(e => e.ExerciseID === ex.ExerciseID)
                        return (
                          <ExerciseAccordion
                            key={ex.ExerciseID}
                            exercise={ex}
                            onChange={(data) => handleExerciseChange(globalIndex, data)}
                            index={globalIndex}
                            isOpen={openExercises.has(ex.ExerciseID)}
                            onToggle={() => toggleExercise(ex.ExerciseID)}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {/* Climbing Routes */}
          {containsClimbing && (
            <section className="mb-10">
              <h2 className="font-semibold text-xl mb-4">🧗 רישומי טיפוס</h2>

              <div className="mb-6">
                <label className="block font-medium mb-2">📍 מיקום:</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="🔍 חפש מיקום..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  
                  <select
                    value={selectedLocation || ''}
                    onChange={(e) => setSelectedLocation(Number(e.target.value) || null)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">בחר מיקום</option>
                    {filteredLocations.map(loc => (
                      <option key={loc.LocationID} value={loc.LocationID}>
                        {loc.LocationName}
                      </option>
                    ))}
                  </select>
                  
                  {locationSearch && (
                    <p className="text-sm text-gray-600">
                      נמצאו {filteredLocations.length} מתוך {locations.length} מיקומים
                    </p>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setShowAddLocationModal(true)}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
                  >
                    ➕ הוסף מיקום חדש
                  </button>
                </div>
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

          {/* Climber Notes */}
          <section className="mb-8">
            <h2 className="font-semibold text-lg mb-2">הערות מטפס</h2>
            <textarea
              className="border border-gray-300 rounded w-full p-3 focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="הערות כלליות על האימון..."
              value={climberNotes}
              onChange={(e) => setClimberNotes(e.target.value)}
              disabled={isSaving}
            />
          </section>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => router.push('/calendar')}
              disabled={isSaving}
            >
              ביטול
            </button>
            <button
              className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isSaving ? 'animate-pulse' : ''
              }`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '⏳ שומר...' : '💾 שמירה'}
              {routes.length > 0 && !isSaving && ` (${routes.length} מסלולים)`}
            </button>
          </div>

          {/* ✅ Saving indicator */}
          {isSaving && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="font-medium">שומר נתונים... אנא המתן</span>
              </div>
            </div>
          )}
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

      {/* Add New Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" dir="rtl">
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

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 הוסף מיקום חדש לרשימה. המיקום יהיה זמין לכולם.
              </p>
            </div>

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