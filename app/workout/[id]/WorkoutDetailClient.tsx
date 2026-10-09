'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { ClimbingRoute, BoulderGrade, LeadGrade, ClimbingLocation, BoardType } from '@/types/climbing'
import WorkoutFlow, { FlowStep } from '@/components/workout-flow/WorkoutFlow'
import ExerciseStep, { exerciseSummary, LastValues } from '@/components/workout-flow/ExerciseStep'
import ClimbStep from '@/components/workout-flow/ClimbStep'
import { IntroStep, SummaryStep } from '@/components/workout-flow/IntroSummary'
import moment from 'moment-timezone'
import { useFormDraft } from '@/lib/useFormDraft'
import { LuCircleCheck, LuLightbulb, LuLoaderCircle, LuMapPin } from 'react-icons/lu'
import { PageSkeleton } from '@/components/ui/Skeleton'

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

  // Personal coach note for this trainee + workout (set in workout assignment)
  const [personalNote, setPersonalNote] = useState<string>('')
  useEffect(() => {
    if (!email || !id) return
    let cancelled = false
    supabase
      .from('WorkoutsForUser')
      .select('Notes, CoachNote')
      .eq('Email', email)
      .eq('WorkoutID', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const note = (data?.Notes || data?.CoachNote || '').trim()
        setPersonalNote(note)
      })
    return () => { cancelled = true }
  }, [email, id])

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

  // 🐛 FIX: Prevent double-submit
  const [isSaving, setIsSaving] = useState(false)

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

  // ── workout flow ──────────────────────────────────────────
  const [step, setStepRaw] = useState(0)
  const [lastExStep, setLastExStep] = useState<number | null>(null)
  const [backToSummary, setBackToSummary] = useState(false) // editing one exercise from the summary
  const [lastByExercise, setLastByExercise] = useState<Record<number, LastValues>>({})
  const [defaultGrades, setDefaultGrades] = useState<Partial<Record<'Boulder' | 'Board' | 'Lead', number>>>({})
  const [defaultClimbType, setDefaultClimbType] = useState<'Boulder' | 'Board' | 'Lead' | undefined>(undefined)

  // last logged values per exercise (any workout), for "last time" + greyed placeholders
  const exerciseIdsKey = exercises.map(e => e.ExerciseID).join(',')
  useEffect(() => {
    if (!email || !exerciseIdsKey) return
    let cancelled = false
    const ids = exerciseIdsKey.split(',').map(Number)
    supabase
      .from('ExerciseLogs')
      .select('ExerciseID, HandSide, RepsDone, DurationSec, WeightKG, RPE, CalendarID, CreatedAt')
      .eq('Email', email)
      .eq('Completed', true)
      .in('ExerciseID', ids)
      .order('CreatedAt', { ascending: false })
      .limit(400)
      .then(({ data }) => {
        if (cancelled || !data) return
        const out: Record<number, LastValues> = {}
        const sessionOf: Record<number, number | null> = {}
        for (const l of data) {
          if (calendarIdNum && l.CalendarID === calendarIdNum) continue // not this same workout
          if (!(l.ExerciseID in sessionOf)) {
            sessionOf[l.ExerciseID] = l.CalendarID
            out[l.ExerciseID] = { date: l.CreatedAt ? formatDate(l.CreatedAt) : null }
          }
          if (sessionOf[l.ExerciseID] !== l.CalendarID) continue // only the latest session
          const o = out[l.ExerciseID]
          const left = l.HandSide === 'Left'
          if (left && o.RepsDoneLeft == null && o.DurationSecLeft == null) {
            Object.assign(o, { RepsDoneLeft: l.RepsDone, DurationSecLeft: l.DurationSec, WeightKGLeft: l.WeightKG, RPELeft: l.RPE })
          } else if (!left && o.RepsDone == null && o.DurationSec == null) {
            Object.assign(o, { RepsDone: l.RepsDone, DurationSec: l.DurationSec, WeightKG: l.WeightKG, RPE: l.RPE })
          }
        }
        setLastByExercise(out)
      })
    return () => { cancelled = true }
  }, [email, exerciseIdsKey, calendarIdNum])

  // climbing: start from the type and grades this climber logged most recently
  const wantsClimbing = !!workout?.containClimbing
  useEffect(() => {
    if (!email || !wantsClimbing) return
    let cancelled = false
    supabase
      .from('ClimbingLog')
      .select('ClimbType, GradeID, LogDateTime')
      .eq('Email', email)
      .order('LogDateTime', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (cancelled || !data?.length) return
        const g: Partial<Record<'Boulder' | 'Board' | 'Lead', number>> = {}
        for (const r of data) {
          const t = r.ClimbType as 'Boulder' | 'Board' | 'Lead'
          if (r.GradeID && g[t] == null) g[t] = r.GradeID
        }
        setDefaultGrades(g)
        setDefaultClimbType(data[0].ClimbType as 'Boulder' | 'Board' | 'Lead')
      })
    return () => { cancelled = true }
  }, [email, wantsClimbing])

  // === Draft persistence ===
  const draftKey = calendarIdNum
    ? `workout-draft-${calendarIdNum}`
    : `workout-draft-new-${id}`

  const draftState = useMemo(() => ({
    exerciseForms,
    routes,
    selectedLocation,
    selectedBoardType,
    climberNotes,
    deloading,
    deloadingPercentage,
  }), [exerciseForms, routes, selectedLocation, selectedBoardType, climberNotes, deloading, deloadingPercentage])

  const onDraftRestore = useCallback((draft: typeof draftState) => {
    if (draft.exerciseForms?.length > 0) {
      setExerciseForms(prev => {
        // If exercises are already loaded from server, merge only user-entered performance
        // data into them — never replace the exercise structure (prevents stale level from overriding)
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
        // Exercises not loaded yet — restore fully
        return draft.exerciseForms
      })
    }
    if (draft.routes) setRoutes(draft.routes)
    if (draft.selectedLocation !== undefined) setSelectedLocation(draft.selectedLocation)
    if (draft.selectedBoardType !== undefined) setSelectedBoardType(draft.selectedBoardType)
    if (draft.climberNotes !== undefined) setClimberNotes(draft.climberNotes)
    if (draft.deloading !== undefined) setDeloading(draft.deloading)
    if (draft.deloadingPercentage !== undefined) setDeloadingPercentage(draft.deloadingPercentage)
  }, [])

  const { clearDraft } = useFormDraft(draftKey, draftState, !loading, onDraftRestore)

    useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!id) return
      if (!email) return  // wait for auth/email — needed for dynamic exercise level lookup
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

        // Load WorkoutsExercises with Block, Sets, Reps, Duration, Rest
        const { data: rels } = await supabase
          .from('WorkoutsExercises')
          .select('ExerciseID, Block, Sets, Reps, Duration, Rest, Order')
          .eq('WorkoutID', id)
          .order('Block')
          .order('Order')

        let mapped: any[] = []
        if (rels?.length) {
          const ids = rels.map((r: any) => r.ExerciseID)
          const { data: exs } = await supabase
            .from('Exercises')
            .select('ExerciseID, Name, Description, IsSingleHand, isDuration, ImageURL, VideoURL, is_dynamic, RoadmapCategoryID')
            .in('ExerciseID', ids)

          if (exs?.length) {
            const exsById: Record<number, any> = {}
            for (const x of exs) exsById[x.ExerciseID] = x
            mapped = rels.map((rel) => {
              const x = exsById[rel.ExerciseID]
              if (!x) return null
              return {
                ExerciseID: x.ExerciseID,
                Name: x.Name,
                Description: x.Description,
                IsSingleHand: x.IsSingleHand,
                isDuration: x.isDuration,
                ImageURL: x.ImageURL,
                VideoURL: x.VideoURL,
                is_dynamic: x.is_dynamic || false,
                RoadmapCategoryID: x.RoadmapCategoryID || null,
                Block: rel.Block || 1,
                Sets: rel.Sets || null,
                Reps: rel.Reps || null,
                Duration: rel.Duration || null,
                Rest: rel.Rest || null,
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
            }).filter(Boolean)
          }

          // Expand dynamic exercises into their concrete exercises for this user's level
          const dynamicExs = mapped.filter(m => m.is_dynamic && m.RoadmapCategoryID)
          if (dynamicExs.length > 0) {
            const catIds = [...new Set(dynamicExs.map(m => m.RoadmapCategoryID as number))]

            // Fetch user's current level via API route (uses service role, bypasses RLS)
            const { data: { session } } = await supabase.auth.getSession()
            let progressRows: { CategoryID: number; CurrentLevel: number }[] = []
            if (session && email) {
              try {
                const res = await fetch(`/api/admin/roadmap/progress?email=${encodeURIComponent(email)}`, {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                })
                if (res.ok) progressRows = await res.json()
              } catch {
                // fallback: level 0
              }
            }

            const levelNumByCategory: Record<number, number> = {}
            for (const catId of catIds) levelNumByCategory[catId] = 0
            for (const row of progressRows) levelNumByCategory[row.CategoryID] = row.CurrentLevel
            // Fetch all RoadmapLevels for relevant categories
            const { data: levelsRows } = await supabase
              .from('RoadmapLevels')
              .select('LevelID, CategoryID, LevelNumber')
              .in('CategoryID', catIds)
            const levelIdByCategory: Record<number, number | null> = {}
            for (const catId of catIds) {
              const targetNum = levelNumByCategory[catId]
              const found = (levelsRows || []).find(l => l.CategoryID === catId && l.LevelNumber === targetNum)
              levelIdByCategory[catId] = found?.LevelID ?? null
            }
            // Fetch dynamic_exercise_items for all dynamic exercises at the resolved levels
            const dynamicExIds = dynamicExs.map(m => m.ExerciseID)
            const resolvedLevelIds = Object.values(levelIdByCategory).filter(Boolean) as number[]

            let concreteItemMap: Record<number, any[]> = {}
            if (resolvedLevelIds.length > 0) {
              const { data: itemRows } = await supabase
                .from('dynamic_exercise_items')
                .select('DynamicExerciseID, ExerciseID, LevelID, Sets, Reps, Duration, Rest, Order')
                .in('DynamicExerciseID', dynamicExIds)
                .in('LevelID', resolvedLevelIds)
                .order('Order')

              if (itemRows?.length) {
                const concreteIds = [...new Set(itemRows.map(i => i.ExerciseID as number))]
                const { data: concreteExsRows } = await supabase
                  .from('Exercises')
                  .select('ExerciseID, Name, IsSingleHand, isDuration, ImageURL, VideoURL')
                  .in('ExerciseID', concreteIds)

                const concreteExMap: Record<number, any> = {}
                for (const ex of concreteExsRows || []) concreteExMap[ex.ExerciseID] = ex

                for (const item of itemRows) {
                  if (!concreteItemMap[item.DynamicExerciseID]) concreteItemMap[item.DynamicExerciseID] = []
                  concreteItemMap[item.DynamicExerciseID].push({ ...item, exercise: concreteExMap[item.ExerciseID] })
                }
              }
            }

            // Replace each dynamic exercise entry with its concrete exercises
            const expandedMapped: any[] = []
            for (const m of mapped) {
              if (!m.is_dynamic || !m.RoadmapCategoryID) {
                expandedMapped.push(m)
                continue
              }
              const levelId = levelIdByCategory[m.RoadmapCategoryID]
              const items = (levelId ? concreteItemMap[m.ExerciseID] : []) || []
              for (const item of items) {
                if (!item.exercise) continue
                expandedMapped.push({
                  ExerciseID: item.exercise.ExerciseID,
                  Name: item.exercise.Name,
                  Description: null,
                  IsSingleHand: item.exercise.IsSingleHand,
                  isDuration: item.exercise.isDuration,
                  ImageURL: item.exercise.ImageURL,
                  VideoURL: item.exercise.VideoURL,
                  is_dynamic: false,
                  RoadmapCategoryID: null,
                  Block: m.Block,
                  Sets: item.Sets || null,
                  Reps: item.Reps || null,
                  Duration: item.Duration || null,
                  Rest: item.Rest || null,
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
                })
              }
            }
            mapped = expandedMapped
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
  }, [id, calendarIdNum, email])

  // === שינוי תרגיל ===
  const handleExerciseChange = (i: number, data: any) => {
    setExerciseForms((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], ...data }
      return next
    })
  }

  // Check what workout contains
  const containsExercises = workout?.containExercise && exercises.length > 0
  const containsClimbing = workout?.containClimbing

  // === מעבר לביצוע היום ===
  const handleConvertToToday = async () => {
    if (!calendarIdNum) {
      showToast('❌ שגיאה: לא נמצא מזהה אימון', 'red')
      return
    }

    // DB timestamps (StartTime, CreatedAt, UpdatedAt) are stored in UTC
    const now = moment.utc().format('YYYY-MM-DD HH:mm:ss')

    try {
      const { error } = await supabase
        .from('Calendar')
        .update({ 
          StartTime: now,
          EndTime: moment.utc().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss')
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

  // === שמירה - UPDATED WITH DOUBLE-SUBMIT FIX ===
  const onComplete = async () => {
    // 🐛 FIX: Prevent double-submit
    if (isSaving) {
      return // Already saving, ignore additional clicks
    }

    if (!email || !workout) {
      showToast('❌ אין אימייל פעיל', 'red')
      return
    }

    // Validation for climbing
    if (workout.containClimbing && routes.length > 0 && !selectedLocation) {
      showToast('❌ נא לבחור מיקום', 'red')
      return
    }

    setIsSaving(true) // 🐛 FIX: Set saving state

    // DB timestamps (StartTime, CreatedAt, UpdatedAt) are stored in UTC
    const now = moment.utc().format('YYYY-MM-DD HH:mm:ss')

    const logDateTime = calendarRow?.StartTime 
      ? moment(calendarRow.StartTime).format('YYYY-MM-DD HH:mm:ss')
      : moment().format('YYYY-MM-DD HH:mm:ss')

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
      clearDraft()
      setTimeout(() => {
        router.push('/calendar')
      }, 800)
    } catch (err) {
      console.error('❌ שגיאה בשמירה:', err)
      showToast('❌ שגיאה בשמירה', 'red')
      setIsSaving(false) // Only reset on error - on success, redirect will happen
    }
  }

  if (authLoading || loading) {
    return (
      <PageSkeleton variant="detail" label="טוען..." />
    )
  }

  if (!workout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-danger">אימון לא נמצא</div>
      </div>
    )
  }

  // ── steps of the flow ───────────────────────────────────────
  const lastCount = containsExercises ? exerciseForms.filter(ex => lastByExercise[ex.ExerciseID]).length : 0
  const hasIntro = !!(personalNote || workout.Description || workout.WorkoutNotes || workout.WhenToPractice || workout.VideoURL || isFutureWorkout || isPastWorkout || lastCount > 0)
  const flowExercises = containsExercises ? exerciseForms : []
  const firstEx = hasIntro ? 1 : 0
  const climbIndex = firstEx + flowExercises.length
  const setStep = (i: number) => {
    setStepRaw(i)
    if (i >= firstEx && i < firstEx + flowExercises.length) setLastExStep(i) // remember where I was in the exercises
  }
  // fill every exercise that has history with last time's values (empty fields only), then go to the summary
  const fillFromLast = () => {
    const keys = ['RepsDone', 'DurationSec', 'WeightKG', 'RPE', 'RepsDoneLeft', 'DurationSecLeft', 'WeightKGLeft', 'RPELeft'] as const
    let filled = 0
    setExerciseForms(prev => prev.map(ex => {
      const last = lastByExercise[ex.ExerciseID]
      if (!last) return ex
      const next = { ...ex }
      let changed = false
      for (const k of keys) {
        if ((next[k] == null || next[k] === '') && last[k] != null) { next[k] = last[k]; changed = true }
      }
      if (changed) filled++
      return next
    }))
    setBackToSummary(false)
    setStepRaw(Number.MAX_SAFE_INTEGER) // clamped to the summary below
    showToast(filled || lastCount ? 'מולא כמו בפעם הקודמת. לחץ על תרגיל כדי לשנות אותו' : 'אין נתונים מהפעם הקודמת', 'blue')
  }
  // climbing summary: per grade, sent vs not, hardest first
  const gradeInfo = (r: ClimbingRoute) => {
    if (r.climbType === 'Lead') {
      const k = leadGrades.findIndex(g => g.LeadGradeID === r.gradeID)
      return { label: leadGrades[k]?.FrenchGrade ?? r.gradeDisplay, order: k }
    }
    const k = boulderGrades.findIndex(g => g.BoulderGradeID === r.gradeID)
    return { label: boulderGrades[k]?.VGrade ?? r.gradeDisplay, order: k }
  }
  const climbGroups = (sent: boolean) => {
    const m = new Map<string, { key: string; type: ClimbingRoute['climbType']; grade: string; count: number; attempts: number; order: number }>()
    for (const r of routes.filter(x => !!x.successful === sent)) {
      const key = `${r.climbType}|${r.gradeID}|${sent}`
      const g = m.get(key) ?? { key, type: r.climbType, grade: gradeInfo(r).label, count: 0, attempts: 0, order: gradeInfo(r).order }
      g.count++
      g.attempts += r.attempts || 1
      m.set(key, g)
    }
    const typeOrder = { Boulder: 0, Board: 1, Lead: 2 }
    return [...m.values()].sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || b.order - a.order)
  }
  const steps: FlowStep[] = []
  if (hasIntro) {
    steps.push({
      key: 'intro', label: 'פתיחה', state: 'neutral',
      content: (
        <IntroStep
          workout={workout}
          personalNote={personalNote}
          dateLine={calendarRow?.StartTime ? formatDate(calendarRow.StartTime) : null}
          dateBadge={isPastWorkout ? { text: 'אימון עבר', tone: 'past' } : isFutureWorkout ? { text: 'אימון עתידי', tone: 'future' } : isTodayWorkout ? { text: 'אימון היום', tone: 'today' } : null}
          onMoveToToday={isFutureWorkout || isPastWorkout ? handleConvertToToday : undefined}
          counts={{ exercises: flowExercises.length, climbing: !!containsClimbing }}
          fillFromLast={lastCount > 0 ? {
            count: lastCount, total: flowExercises.length,
            date: Object.values(lastByExercise).map(l => l.date).find(Boolean) ?? null,
            onFill: fillFromLast,
          } : undefined}
        />
      ),
    })
  }
  flowExercises.forEach((ex, k) => {
    steps.push({
      key: `ex-${ex.ExerciseID}-${k}`, label: ex.Name, state: exerciseSummary(ex) ? 'done' : 'todo',
      content: (
        <ExerciseStep
          exercise={ex}
          position={{ n: k + 1, of: flowExercises.length }}
          last={lastByExercise[ex.ExerciseID]}
          onChange={data => handleExerciseChange(k, data)}
        />
      ),
    })
  })
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
          onAddLocation={() => setShowAddLocationModal(true)}
          defaultGrades={defaultGrades}
          defaultType={defaultClimbType}
        />
      ),
    })
  }
  const missingLocation = !!(workout.containClimbing && routes.length > 0 && !selectedLocation)
  steps.push({
    key: 'summary', label: 'סיכום', state: 'neutral',
    content: (
      <SummaryStep
        rows={flowExercises.map((ex, k) => ({
          key: `${ex.ExerciseID}-${k}`, title: ex.Name, text: exerciseSummary(ex),
          onOpen: () => { setBackToSummary(true); setStep((hasIntro ? 1 : 0) + k) },
        }))}
        climbing={containsClimbing ? {
          total: routes.length,
          sent: routes.filter(r => r.successful).length,
          attempts: routes.reduce((n, r) => n + (r.attempts || 1), 0),
          sentGroups: climbGroups(true),
          failedGroups: climbGroups(false),
          onOpen: () => { setBackToSummary(true); setStep(climbIndex) },
        } : null}
        climberNotes={climberNotes}
        onClimberNotes={setClimberNotes}
        warning={missingLocation ? 'צריך לבחור מיקום בשלב הטיפוס לפני השמירה' : null}
      />
    ),
  })
  const lastStep = steps.length - 1
  const stepIndex = Math.min(step, lastStep)
  const cur = steps[stepIndex]
  const stepLabel = cur.key === 'intro' ? 'פתיחה'
    : cur.key === 'climb' ? 'טיפוס'
    : cur.key === 'summary' ? 'סיכום'
    : `תרגיל ${stepIndex - (hasIntro ? 1 : 0) + 1} מתוך ${flowExercises.length}`
  const onSummary = stepIndex === lastStep
  const returning = backToSummary && !onSummary
  const primaryLabel = returning ? 'חזרה לסיכום ←' : onSummary
    ? (isSaving ? 'שומר…' : 'סיום ושמירה')
    : cur.key === 'intro' ? 'התחל ←'
    : stepIndex === lastStep - 1 ? 'לסיכום ←' : 'הבא ←'

  return (
    <>
      <WorkoutFlow
        title={workout.Name}
        steps={steps}
        index={stepIndex}
        onIndexChange={i => { if (i === lastStep) setBackToSummary(false); setStep(i) }}
        stepLabel={stepLabel}
        primaryLabel={primaryLabel}
        onPrimary={() => {
          if (onSummary) return onComplete()
          if (returning) { setBackToSummary(false); return setStep(lastStep) }
          setStep(stepIndex + 1)
        }}
        primaryDisabled={onSummary && (isSaving || missingLocation)}
        primaryTone={onSummary ? 'success' : 'accent'}
        onClose={() => (window.history.length > 1 ? router.back() : router.push('/calendar'))}
        sections={flowExercises.length > 0 && containsClimbing ? [
          {
            key: 'ex', label: `תרגילים ${flowExercises.filter(e => exerciseSummary(e)).length}/${flowExercises.length}`,
            active: stepIndex >= firstEx && stepIndex < climbIndex,
            onSelect: () => setStep(lastExStep ?? firstEx),
          },
          {
            key: 'climb', label: routes.length ? `טיפוס · ${routes.length}` : 'טיפוס',
            active: cur.key === 'climb',
            onSelect: () => setStep(climbIndex),
          },
        ] : undefined}
      />
      <div>
        {/* Toast Notifications */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-on-accent text-sm z-[9999] ${
 toast.color === 'blue'
 ? 'bg-accent'
 : toast.color === 'red'
 ? 'bg-danger'
 : 'bg-raised'
 }`}
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add New Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[95] p-4">
          <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6" dir="rtl">
            {/* Header */}
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

            {/* Info */}
            <div className="mb-4 p-3 bg-accent/15 border border-accent rounded-lg">
              <p className="text-sm text-accent">
                <LuLightbulb aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />הוסף מיקום חדש לרשימה. המיקום יהיה זמין לכולם.
              </p>
            </div>

            {/* Name Input */}
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

            {/* Actions */}
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