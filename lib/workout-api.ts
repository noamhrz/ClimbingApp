// lib/workout-api.ts
// API functions for Workout CRUD operations

import { supabase } from '@/lib/supabaseClient'
import {
  Workout,
  WorkoutExercise,
  WorkoutFormData,
  WorkoutWithExercises,
  WorkoutFilters,
} from '@/types/workouts'
import { calculateWorkoutExercisesTime } from './workout-calculations'

/**
 * Fetch all workouts with optional filters
 */
export async function fetchWorkouts(
  filters?: Partial<WorkoutFilters>
): Promise<Workout[]> {
  let query = supabase.from('Workouts').select('*').order('UpdatedAt', { ascending: false })

  // Apply IsActive filter
  if (!filters?.showInactive) {
    query = query.eq('IsActive', true)
  }

  // Apply category filter
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('Category', filters.category)
  }

  // Apply type filter
  if (filters?.type && filters.type !== 'all') {
    switch (filters.type) {
      case 'exercise':
        query = query.eq('containExercise', true).eq('containClimbing', false)
        break
      case 'climbing':
        query = query.eq('containExercise', false).eq('containClimbing', true)
        break
      case 'both':
        query = query.eq('containExercise', true).eq('containClimbing', true)
        break
      case 'none':
        query = query.eq('containExercise', false).eq('containClimbing', false)
        break
    }
  }

  const { data, error } = await query

  if (error) throw error

  // Apply search filter client-side (simpler for free text)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    return (data || []).filter((w) => w.Name.toLowerCase().includes(searchLower))
  }

  return data || []
}

/**
 * Fetch a single workout with its exercises
 */
export async function fetchWorkoutWithExercises(
  workoutId: number
): Promise<WorkoutWithExercises | null> {
  // Fetch workout
  const { data: workout, error: workoutError } = await supabase
    .from('Workouts')
    .select('*')
    .eq('WorkoutID', workoutId)
    .maybeSingle()

  if (workoutError) throw workoutError
  if (!workout) return null

  // Fetch exercises
  const { data: workoutExercises, error: exercisesError } = await supabase
    .from('WorkoutsExercises')
    .select('*, Exercises!WorkoutsExercises_ExerciseID_fkey(*)')
    .eq('WorkoutID', workoutId)
    .order('Block')
    .order('Order')

  if (exercisesError) throw exercisesError

  return {
    ...workout,
    exercises: (workoutExercises || []).map((we) => ({
      ...we,
      Exercise: we.Exercises,
    })),
  }
}

/**
 * Create a new workout
 */
export async function createWorkout(
  formData: WorkoutFormData,
  email: string
): Promise<number> {
  console.log('createWorkout called with:', { formData, email })
  
  const insertData = {
    ...formData,
    CreatedBy: email,
    IsActive: true,
    CalculatedExercisesTime: 0,
    EstimatedTotalTime: formData.EstimatedClimbingTime,
    UpdatedAt: new Date().toISOString(),
  }
  
  console.log('Inserting data:', insertData)
  
  const { data, error } = await supabase
    .from('Workouts')
    .insert(insertData)
    .select('WorkoutID')
    .single()

  console.log('Insert result:', { data, error })

  if (error) {
    console.error('Supabase error:', error)
    throw error
  }
  
  if (!data) {
    throw new Error('No data returned from insert')
  }
  
  console.log('Created workout with ID:', data.WorkoutID)
  return data.WorkoutID
}

/**
 * Update an existing workout
 */
export async function updateWorkout(
  workoutId: number,
  formData: Partial<WorkoutFormData>
): Promise<void> {
  const { error } = await supabase
    .from('Workouts')
    .update({
      ...formData,
      UpdatedAt: new Date().toISOString(),
    })
    .eq('WorkoutID', workoutId)

  if (error) throw error
}

/**
 * Add exercise to workout
 */
export async function addExerciseToWorkout(
  workoutId: number,
  exerciseId: number,
  block: number,
  order: number,
  sets: number = 3,
  reps: number = 10,
  duration: number | null = null,
  rest: number = 60
): Promise<void> {
  const { error } = await supabase.from('WorkoutsExercises').insert({
    WorkoutID: workoutId,
    ExerciseID: exerciseId,
    Block: block,
    Order: order,
    Sets: sets,
    Reps: duration ? 1 : reps, // Reps = 1 for duration exercises
    Duration: duration,
    Rest: rest,
  })

  if (error) throw error

  // Recalculate workout time
  await recalculateWorkoutTime(workoutId)
}

/**
 * Update exercise in workout
 */
export async function updateWorkoutExercise(
  workoutExerciseId: number,
  updates: Partial<WorkoutExercise>
): Promise<void> {
  const { error } = await supabase
    .from('WorkoutsExercises')
    .update(updates)
    .eq('WorkoutExerciseID', workoutExerciseId)

  if (error) throw error

  // Get workout ID and recalculate
  const { data } = await supabase
    .from('WorkoutsExercises')
    .select('WorkoutID')
    .eq('WorkoutExerciseID', workoutExerciseId)
    .single()

  if (data) {
    await recalculateWorkoutTime(data.WorkoutID)
  }
}

/**
 * Remove exercise from workout
 */
export async function removeExerciseFromWorkout(
  workoutExerciseId: number
): Promise<void> {
  // Get workout ID first
  const { data } = await supabase
    .from('WorkoutsExercises')
    .select('WorkoutID, Block')
    .eq('WorkoutExerciseID', workoutExerciseId)
    .single()

  const { error } = await supabase
    .from('WorkoutsExercises')
    .delete()
    .eq('WorkoutExerciseID', workoutExerciseId)

  if (error) throw error

  if (data) {
    // Reorder remaining exercises in the block
    await reorderBlock(data.WorkoutID, data.Block)
    // Recalculate workout time
    await recalculateWorkoutTime(data.WorkoutID)
  }
}

/**
 * Delete entire block
 */
export async function deleteBlock(workoutId: number, block: number): Promise<void> {
  // Delete all exercises in block
  const { error } = await supabase
    .from('WorkoutsExercises')
    .delete()
    .eq('WorkoutID', workoutId)
    .eq('Block', block)

  if (error) throw error

  // Reorder remaining blocks
  await reorderBlocks(workoutId)
  // Recalculate workout time
  await recalculateWorkoutTime(workoutId)
}

/**
 * Reorder exercises in a block after deletion
 */
async function reorderBlock(workoutId: number, block: number): Promise<void> {
  const { data } = await supabase
    .from('WorkoutsExercises')
    .select('WorkoutExerciseID')
    .eq('WorkoutID', workoutId)
    .eq('Block', block)
    .order('Order')

  if (data) {
    for (let i = 0; i < data.length; i++) {
      await supabase
        .from('WorkoutsExercises')
        .update({ Order: i + 1 })
        .eq('WorkoutExerciseID', data[i].WorkoutExerciseID)
    }
  }
}

/**
 * Reorder blocks after block deletion
 */
async function reorderBlocks(workoutId: number): Promise<void> {
  const { data } = await supabase
    .from('WorkoutsExercises')
    .select('Block')
    .eq('WorkoutID', workoutId)
    .order('Block')

  if (data) {
    const uniqueBlocks = [...new Set(data.map((d) => d.Block))].sort()
    
    for (let i = 0; i < uniqueBlocks.length; i++) {
      const oldBlock = uniqueBlocks[i]
      const newBlock = i + 1
      
      if (oldBlock !== newBlock) {
        await supabase
          .from('WorkoutsExercises')
          .update({ Block: newBlock })
          .eq('WorkoutID', workoutId)
          .eq('Block', oldBlock)
      }
    }
  }
}

/**
 * Recalculate and update workout time
 */
async function recalculateWorkoutTime(workoutId: number): Promise<void> {
  // Fetch all exercises
  const { data: exercises } = await supabase
    .from('WorkoutsExercises')
    .select('*')
    .eq('WorkoutID', workoutId)

  if (exercises) {
    const calculatedTime = calculateWorkoutExercisesTime(exercises)

    // Get climbing time
    const { data: workout } = await supabase
      .from('Workouts')
      .select('EstimatedClimbingTime')
      .eq('WorkoutID', workoutId)
      .single()

    const climbingTime = workout?.EstimatedClimbingTime || 0
    const totalTime = calculatedTime + climbingTime * 60 // Convert minutes to seconds

    // Update workout
    await supabase
      .from('Workouts')
      .update({
        CalculatedExercisesTime: calculatedTime / 60, // Store in minutes
        EstimatedTotalTime: totalTime / 60, // Store in minutes
      })
      .eq('WorkoutID', workoutId)
  }
}

/**
 * Duplicate workout
 */
export async function duplicateWorkout(
  workoutId: number,
  email: string
): Promise<number> {
  // Fetch original workout
  const original = await fetchWorkoutWithExercises(workoutId)
  if (!original) throw new Error('Workout not found')

  // Create new workout
  const newWorkoutId = await createWorkout(
    {
      Name: `Copy of ${original.Name}`,
      Category: original.Category,
      Description: original.Description || '',
      WhenToPractice: original.WhenToPractice || '',
      WorkoutNotes: original.WorkoutNotes || '',
      VideoURL: original.VideoURL || '',
      containClimbing: original.containClimbing,
      containExercise: original.containExercise,
      EstimatedClimbingTime: original.EstimatedClimbingTime,
    },
    email
  )

  // Copy exercises
  for (const ex of original.exercises) {
    await addExerciseToWorkout(
      newWorkoutId,
      ex.ExerciseID,
      ex.Block,
      ex.Order,
      ex.Sets,
      ex.Reps,
      ex.Duration,
      ex.Rest
    )
  }

  return newWorkoutId
}

/**
 * Delete or deactivate workout
 */
export async function deleteWorkout(workoutId: number): Promise<void> {
  // Check if workout has calendar records
  const { data: calendarRecords } = await supabase
    .from('Calendar')
    .select('CalendarID')
    .eq('WorkoutID', workoutId)
    .limit(1)

  if (calendarRecords && calendarRecords.length > 0) {
    // Has calendar records - just deactivate
    await supabase
      .from('Workouts')
      .update({ IsActive: false, UpdatedAt: new Date().toISOString() })
      .eq('WorkoutID', workoutId)
  } else {
    // No calendar records - delete completely
    // First delete WorkoutsExercises
    await supabase.from('WorkoutsExercises').delete().eq('WorkoutID', workoutId)

    // Delete WorkoutsForUser
    await supabase.from('WorkoutsForUser').delete().eq('WorkoutID', workoutId)

    // Delete Workout
    await supabase.from('Workouts').delete().eq('WorkoutID', workoutId)
  }
}

/**
 * Fetch all unique categories
 */
export async function fetchCategories(): Promise<string[]> {
  const { data } = await supabase
    .from('Workouts')
    .select('Category')
    .not('Category', 'is', null)

  if (!data) return []

  const categories = [...new Set(data.map((d) => d.Category).filter(Boolean))]
  return categories.sort()
}