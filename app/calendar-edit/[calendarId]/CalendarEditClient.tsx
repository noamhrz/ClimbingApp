// app/calendar-edit/[calendarId]/CalendarEditClient.tsx
// ✨ FIXED VERSION - Proper save handling, no premature navigation

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import WorkoutFlow, { FlowStep } from '@/components/workout-flow/WorkoutFlow'
import ExerciseStep, { exerciseSummary } from '@/components/workout-flow/ExerciseStep'
import ClimbStep from '@/components/workout-flow/ClimbStep'
import { SummaryStep } from '@/components/workout-flow/IntroSummary'
import { climbSummary } from '@/components/workout-flow/climbSummary'
import { ClimbingRoute, BoulderGrade, LeadGrade, ClimbingLocation, ClimbingLogEntry, BoardType } from '@/types/climbing'
import { generateTempId, getGradeDisplay } from '@/lib/climbing-helpers'
import moment from 'moment-timezone'
import { useFormDraft } from '@/lib/useFormDraft'
import { LuCircleCheck, LuLightbulb, LuLoaderCircle, LuMapPin } from 'react-icons/lu'

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
  const [actualMinutes, setActualMinutes] = useState<number | null>(null)   // actual workout time, optional
  const [selectedBoardType, setSelectedBoardType] = useState<number | null>(null)
  
  const [leadGrades, setLeadGrades] = useState<LeadGrade[]>([])
  const [boulderGrades, setBoulderGrades] = useState<BoulderGrade[]>([])
  const [locations, setLocations] = useState<ClimbingLocation[]>([])
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

  // ✅ NEW: Saving state
  const [isSaving, setIsSaving] = useState(false)

  // workout flow: opens on the summary (viewing a saved workout); items open for editing and come back
  const [step, setStep] = useState(Number.MAX_SAFE_INTEGER)
  const [backToSummary, setBackToSummary] = useState(false)

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

  // === Draft persistence ===
  const draftState = useMemo(() => ({
    exerciseForms,
    routes,
    selectedLocation,
    selectedBoardType,
    climberNotes,
    actualMinutes,
  }), [exerciseForms, routes, selectedLocation, selectedBoardType, climberNotes, actualMinutes])

  const onDraftRestore = useCallback((draft: typeof draftState) => {
    if (draft.exerciseForms?.length > 0) {
      setExerciseForms(prev => {
        // When exercises are already loaded from DB, only merge performance fields
        // from the draft — never replace the exercise structure (which may differ
        // from stale draft after dynamic expansion resolves to concrete exercises).
        if (prev.length > 0) {
          return prev.map(ex => {
            const saved = draft.exerciseForms.find((d: any) => d.ExerciseID === ex.ExerciseID)
            if (!saved) return ex
            return {
              ...ex,
              RepsDone: saved.RepsDone,
              DurationSec: saved.DurationSec,
              WeightKG: saved.WeightKG,
              RPE: saved.RPE,
              Notes: saved.Notes,
              Completed: saved.Completed,
              RepsDoneLeft: saved.RepsDoneLeft,
              DurationSecLeft: saved.DurationSecLeft,
              WeightKGLeft: saved.WeightKGLeft,
              RPELeft: saved.RPELeft,
              NotesLeft: saved.NotesLeft,
              CompletedLeft: saved.CompletedLeft,
            }
          })
        }
        return draft.exerciseForms
      })
    }
    if (draft.routes) setRoutes(draft.routes)
    if (draft.selectedLocation !== undefined) setSelectedLocation(draft.selectedLocation)
    if (draft.selectedBoardType !== undefined) setSelectedBoardType(draft.selectedBoardType)
    if (draft.climberNotes !== undefined) setClimberNotes(draft.climberNotes)
    if (draft.actualMinutes !== undefined) setActualMinutes(draft.actualMinutes)
  }, [])

  const { clearDraft } = useFormDraft(
    `calendar-edit-draft-${calendarId}`,
    draftState,
    !loading,
    onDraftRestore
  )

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
        // Everything that depends only on calendarId starts together
        const gradesP = Promise.all([
          supabase.from('LeadGrades').select('*').order('LeadGradeID'),
          supabase.from('BoulderGrades').select('*').order('BoulderGradeID'),
          supabase.from('ClimbingLocations').select('*').order('LocationName'),
          supabase.from('BoardTypes').select('*').order('BoardName'),
        ])
        // oldest first: if an exercise has duplicate logs, the screen shows (and saving updates) the oldest
        const logsP = supabase.from('ExerciseLogs').select('*').eq('CalendarID', calendarId).order('ExerciseLogID')
        const climbLogsP = supabase.from('ClimbingLog').select('*').eq('CalendarID', calendarId)

        // Load Calendar
        const { data: cal } = await supabase
          .from('Calendar')
          .select('*')
          .eq('CalendarID', calendarId)
          .maybeSingle()
        if (!cal) throw new Error('Calendar not found')
        setCalendarRow(cal)
        setClimberNotes(cal.ClimberNotes || '')
        setActualMinutes(cal.ActualMinutes ?? null)

        // Workout + its exercise list, in parallel
        const [{ data: w }, { data: rels }] = await Promise.all([
          supabase.from('Workouts').select('*').eq('WorkoutID', cal.WorkoutID).maybeSingle(),
          supabase
            .from('WorkoutsExercises')
            .select('ExerciseID, Block, Sets, Reps, Duration, Rest, Order')
            .eq('WorkoutID', cal.WorkoutID)
            .order('Block')
            .order('Order'),
        ])
        setWorkout(w)

        const ids = rels?.map((r) => r.ExerciseID) || []

        // Exercises (including is_dynamic to detect dynamic placeholders) + existing logs
        const [{ data: exs }, { data: logs }] = await Promise.all([
          supabase
            .from('Exercises')
            .select('ExerciseID, Name, Description, IsSingleHand, isDuration, ImageURL, VideoURL, is_dynamic')
            .in('ExerciseID', ids),
          logsP,
        ])

        // Detect concrete exercise logs from dynamic expansion:
        // log ExerciseIDs that are NOT in WorkoutsExercises are concrete exercises
        // stored when a dynamic exercise was expanded at workout time.
        const idsSet = new Set(ids)
        const extraLogExIds = [
          ...new Set((logs || []).map(l => l.ExerciseID).filter(id => !idsSet.has(id))),
        ]

        let concreteExMap: Record<number, any> = {}
        if (extraLogExIds.length > 0) {
          const { data: concreteExs } = await supabase
            .from('Exercises')
            .select('ExerciseID, Name, Description, IsSingleHand, isDuration, ImageURL, VideoURL')
            .in('ExerciseID', extraLogExIds)
          for (const ex of concreteExs || []) concreteExMap[ex.ExerciseID] = ex
        }

        const buildFormEntry = (ex: any, weData: any) => {
          if (ex.IsSingleHand) {
            const logRight = logs?.find(l => l.ExerciseID === ex.ExerciseID && l.HandSide === 'Right')
            const logLeft  = logs?.find(l => l.ExerciseID === ex.ExerciseID && l.HandSide === 'Left')
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
            const log = logs?.find(l => l.ExerciseID === ex.ExerciseID && l.HandSide === 'Both')
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
        }

        const mappedExercises: any[] = []

        // Build lookup map for O(1) access
        const exsMap: Record<number, any> = {}
        for (const ex of exs || []) exsMap[ex.ExerciseID] = ex

        // Iterate rels (already sorted by Block then Order) to preserve correct exercise sequence.
        // When a dynamic exercise slot has concrete logs, insert the concrete exercises at that
        // position (sorted by ExerciseLogID as proxy for execution order).
        for (const rel of rels || []) {
          const ex = exsMap[rel.ExerciseID]
          if (!ex) continue
          if (ex.is_dynamic && extraLogExIds.length > 0) {
            const sortedConcreteIds = [...extraLogExIds].sort((a, b) => {
              const logA = logs?.find(l => l.ExerciseID === a)
              const logB = logs?.find(l => l.ExerciseID === b)
              return (logA?.ExerciseLogID || 0) - (logB?.ExerciseLogID || 0)
            })
            for (const concreteId of sortedConcreteIds) {
              const concreteEx = concreteExMap[concreteId]
              if (!concreteEx) continue
              mappedExercises.push(buildFormEntry(concreteEx, { Block: rel.Block || 1 }))
            }
            continue
          }
          mappedExercises.push(buildFormEntry(ex, rel))
        }

        setExerciseForms(mappedExercises)

        // Load Grades & Locations
        const [lg, bg, loc, bt] = await gradesP
        setLeadGrades(lg.data || [])
        setBoulderGrades(bg.data || [])
        setLocations(loc.data || [])
        setBoardTypes(bt.data || [])

        // Load existing ClimbingLogs
        const { data: climbLogs } = await climbLogsP

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

  const handleExerciseChange = (i: number, data: any) => {
    setExerciseForms((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], ...data }
      return next
    })
  }

  const containsClimbing = workout?.containClimbing === true || workout?.containClimbing === 'true'

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
      // DB timestamps (StartTime, CreatedAt, UpdatedAt) are stored in UTC
      const now = moment.utc().format('YYYY-MM-DD HH:mm:ss')
      const email = calendarRow?.Email || activeEmail

      // ✅ Use calendar's StartTime for LogDateTime
      const logDateTime = calendarRow?.StartTime 
        ? moment(calendarRow.StartTime).format('YYYY-MM-DD HH:mm:ss')
        : moment().format('YYYY-MM-DD HH:mm:ss')

      let exerciseCount = 0
      let climbingCount = 0
      let deletedLogIds: number[] = []

      // Save Exercises — one log per (exercise, hand side). Existing logs are read once,
      // updates run in parallel and new logs go in one insert.
      {
        type Side = 'Right' | 'Left' | 'Both'
        const filled = (v: unknown) => v !== null && v !== undefined
        const byKey = new Map<string, Record<string, unknown>>()   // last one wins, as before
        const add = (ex: typeof exerciseForms[number], side: Side, left: boolean) => {
          const reps = left ? ex.RepsDoneLeft : ex.RepsDone
          const dur = left ? ex.DurationSecLeft : ex.DurationSec
          const kg = left ? ex.WeightKGLeft : ex.WeightKG
          const rpe = left ? ex.RPELeft : ex.RPE
          const notes = (left ? ex.NotesLeft : ex.Notes) as string | undefined
          if (!(filled(reps) || filled(dur) || filled(kg) || filled(rpe) || (notes && notes.trim() !== ''))) return
          byKey.set(`${ex.ExerciseID}:${side}`, {
            CalendarID: calendarId,
            WorkoutID: workout?.WorkoutID,
            ExerciseID: ex.ExerciseID,
            Email: email,
            HandSide: side,
            RepsDone: ex.isDuration ? null : (reps || null),
            DurationSec: ex.isDuration ? (dur || null) : null,
            WeightKG: kg || null,
            RPE: rpe || null,
            Notes: notes?.trim() || null,
            Completed: true,
            UpdatedAt: now,
          })
        }
        for (const ex of exerciseForms) {
          if (ex.IsSingleHand) { add(ex, 'Right', false); add(ex, 'Left', true) }
          else add(ex, 'Both', false)
        }
        exerciseCount = [...byKey.keys()].filter(k => !k.endsWith(':Left')).length

        if (byKey.size > 0) {
          const { data: rows, error: exErr } = await supabase
            .from('ExerciseLogs')
            .select('ExerciseLogID, ExerciseID, HandSide')
            .eq('CalendarID', calendarId)
            .order('ExerciseLogID')
          if (exErr) throw exErr
          // keep the oldest log per exercise+side (the one the screen shows); extra copies are removed
          const existing = new Map<string, number>()
          const duplicates: number[] = []
          for (const r of rows ?? []) {
            const k = `${r.ExerciseID}:${r.HandSide}`
            if (existing.has(k)) duplicates.push(r.ExerciseLogID)
            else existing.set(k, r.ExerciseLogID)
          }
          const inserts: Record<string, unknown>[] = []
          const writes: PromiseLike<{ error: unknown }>[] = []
          for (const [key, payload] of byKey) {
            const logId = existing.get(key)
            if (logId) writes.push(supabase.from('ExerciseLogs').update(payload).eq('ExerciseLogID', logId).select('ExerciseLogID').then(r => ({ error: r.error ?? (r.data?.length ? null : new Error('עדכון תרגיל נחסם (0 שורות עודכנו)')) })))
            else inserts.push({ ...payload, CreatedAt: now })
          }
          if (inserts.length) writes.push(supabase.from('ExerciseLogs').insert(inserts))
          if (duplicates.length) writes.push(supabase.from('ExerciseLogs').delete().in('ExerciseLogID', duplicates))
          const failed = (await Promise.all(writes)).find(r => r.error)
          if (failed) throw failed.error
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

        // updates in parallel, new routes in one insert
        const routeInserts: Record<string, unknown>[] = []
        const routeWrites: PromiseLike<{ error: unknown }>[] = []
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
          if (existingId) routeWrites.push(supabase.from('ClimbingLog').update(payload).eq('ClimbingLogID', existingId).select('ClimbingLogID').then(r => ({ error: r.error ?? (r.data?.length ? null : new Error('עדכון מסלול נחסם (0 שורות עודכנו)')) })))
          else routeInserts.push({ ...payload, CreatedAt: now })
        }
        if (routeInserts.length) routeWrites.push(supabase.from('ClimbingLog').insert(routeInserts))
        const routeFailed = (await Promise.all(routeWrites)).find(r => r.error)
        if (routeFailed) throw routeFailed.error
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

      // Actual workout time — separate update so a missing column never blocks the save
      {
        const { error: minErr } = await supabase
          .from('Calendar')
          .update({ ActualMinutes: actualMinutes == null ? null : Math.round(actualMinutes) })
          .eq('CalendarID', calendarId)
        if (minErr) console.warn('ActualMinutes not saved:', minErr.message)
      }

      // ✅ Build success message
      let message = '✅ נשמר בהצלחה!'
      if (exerciseCount > 0) message += ` ${exerciseCount} תרגילים`
      if (climbingCount > 0) message += ` ${climbingCount} מסלולים`
      if (deletedLogIds.length > 0) message += ` (${deletedLogIds.length} מסלולים נמחקו)`
      
      showToast(message, 'success')
      
      // ✅ Wait for user to see success message, THEN navigate
      await new Promise(resolve => setTimeout(resolve, 1500))

      // ✅ Only navigate after ALL saves completed successfully
      clearDraft()
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
        <div className="text-lg text-danger">אימון לא נמצא</div>
      </div>
    )
  }

  const containExercise = workout?.containExercise === true || workout?.containExercise === 'true'
  const flowExercises = containExercise ? exerciseForms : []
  const climbIndex = flowExercises.length
  const missingLocation = !!(containsClimbing && routes.length > 0 && !selectedLocation)
  const steps: FlowStep[] = flowExercises.map((ex, k) => ({
    key: `ex-${ex.ExerciseID}-${k}`, label: ex.Name, state: exerciseSummary(ex) ? 'done' : 'todo',
    content: (
      <ExerciseStep
        exercise={ex}
        position={{ n: k + 1, of: flowExercises.length }}
        onChange={data => handleExerciseChange(k, data)}
      />
    ),
  }))
  if (containsClimbing) {
    steps.push({
      key: 'climb', label: 'טיפוס', state: routes.length ? 'done' : 'todo',
      content: (
        <ClimbStep
          routes={routes}
          onRoutesChange={setRoutes}
          boulderGrades={boulderGrades}
          leadGrades={leadGrades}
          boardTypes={boardTypes}
          selectedBoardType={selectedBoardType}
          onBoardTypeChange={setSelectedBoardType}
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          onAddLocation={name => { setNewLocationName(name ?? ''); setShowAddLocationModal(true) }}
          defaultGrades={{}}
          defaultType={routes[0]?.climbType}
        />
      ),
    })
  }
  const lastStep = steps.length // summary
  steps.push({
    key: 'summary', label: 'סיכום', state: 'neutral',
    content: (
      <SummaryStep
        rows={flowExercises.map((ex, k) => ({
          key: `${ex.ExerciseID}-${k}`, title: ex.Name, text: exerciseSummary(ex),
          onOpen: () => { setBackToSummary(true); setStep(k) },
        }))}
        climbing={containsClimbing ? {
          ...climbSummary(routes, boulderGrades, leadGrades),
          onOpen: () => { setBackToSummary(true); setStep(climbIndex) },
        } : null}
        climberNotes={climberNotes}
        onClimberNotes={setClimberNotes}
        warning={null}
        session={containsClimbing ? {
          locations,
          locationId: selectedLocation,
          locationRequired: routes.length > 0,
          onLocation: setSelectedLocation,
          onAddLocation: (name?: string) => { setNewLocationName(name ?? ''); setShowAddLocationModal(true) },
        } : null}
        actualTime={{
          minutes: actualMinutes,
          plannedMinutes: workout?.EstimatedTotalTime || null,
          onMinutes: setActualMinutes,
        }}
      />
    ),
  })
  const stepIndex = Math.min(step, lastStep)
  const cur = steps[stepIndex]
  const onSummary = stepIndex === lastStep
  const returning = backToSummary && !onSummary
  const when = calendarRow?.StartTime ? moment.utc(calendarRow.StartTime).local().format('DD/MM/YYYY') : ''
  const stepLabel = onSummary ? `אימון שבוצע${when ? ` · ${when}` : ''}`
    : cur.key === 'climb' ? 'עריכת טיפוס'
    : `עריכת תרגיל ${stepIndex + 1} מתוך ${flowExercises.length}`

  return (
    <>
      <WorkoutFlow
        title={workout.Name}
        steps={steps}
        index={stepIndex}
        onIndexChange={i => { if (i === lastStep) setBackToSummary(false); setStep(i) }}
        stepLabel={stepLabel}
        primaryLabel={onSummary ? (isSaving ? 'שומר…' : 'שמירת שינויים') : returning ? 'חזרה לסיכום ←' : stepIndex === lastStep - 1 ? 'לסיכום ←' : 'הבא ←'}
        primaryTone={onSummary ? 'success' : 'accent'}
        primaryDisabled={onSummary && isSaving}
        onPrimary={() => {
          if (onSummary && missingLocation) {
            const el = document.getElementById('summary-location') as HTMLSelectElement | null
            el?.focus()
            return
          }
          if (onSummary) return handleSave()
          if (returning) { setBackToSummary(false); return setStep(lastStep) }
          setStep(stepIndex + 1)
        }}
        onClose={() => { clearDraft(); router.push('/calendar') }}
        sections={flowExercises.length > 0 && containsClimbing ? [
          { key: 'ex', label: 'תרגילים', active: stepIndex < climbIndex, onSelect: () => setStep(0) },
          { key: 'climb', label: routes.length ? `טיפוס · ${routes.length}` : 'טיפוס', active: cur.key === 'climb', onSelect: () => setStep(climbIndex) },
          { key: 'sum', label: 'סיכום', active: onSummary, onSelect: () => { setBackToSummary(false); setStep(lastStep) } },
        ] : undefined}
      />
      <div>
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-[calc(96px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 px-6 py-4 rounded-lg shadow-xl text-on-accent font-medium z-[9999] animate-in ${
 toast.type === 'success' ? 'bg-success' : 'bg-danger'
 }`}>
            {toast.message}
          </div>
        )}
      </div>

      {/* Add New Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[95] p-4">
          <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-fg">
                <LuMapPin aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />הוספת מיקום חדש
              </h3>
              <button
                onClick={() => setShowAddLocationModal(false)}
                disabled={savingLocation}
                className="text-faint hover:text-fg-3 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-accent/15 border border-accent rounded-lg">
              <p className="text-sm text-accent">
                <LuLightbulb aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />הוסף מיקום חדש לרשימה. המיקום יהיה זמין לכולם.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-fg-2 mb-2">
                שם המיקום *
              </label>
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="למשל: קיר ספיידרמן"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
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
                className="flex-1 py-3 bg-accent text-on-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                {savingLocation ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />שומר...</> : <><LuCircleCheck aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />הוסף מיקום</>}
              </button>
              <button
                onClick={() => setShowAddLocationModal(false)}
                disabled={savingLocation}
                className="px-6 py-3 bg-raised text-fg-2 rounded-lg hover:bg-raised/90 transition disabled:opacity-50"
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