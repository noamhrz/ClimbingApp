// types/workouts.ts
// Types for Workouts Management System

export interface Workout {
  WorkoutID: number
  Name: string
  Category: string
  Description: string | null
  WhenToPractice: string | null
  WorkoutNotes: string | null
  VideoURL: string | null
  containClimbing: boolean
  containExercise: boolean
  CalculatedExercisesTime: number
  EstimatedClimbingTime: number
  EstimatedTotalTime: number
  CreatedBy: string
  IsActive: boolean
  UpdatedAt: string
}

export interface WorkoutExercise {
  WorkoutExerciseID: number
  WorkoutID: number
  ExerciseID: number
  Sets: number
  Reps: number
  Duration: number | null
  Rest: number
  Order: number
  Block: number
}

export interface Exercise {
  ExerciseID: number
  Name: string
  Description: string | null
  Category: string
  VideoURL: string | null
  ImageURL: string | null
  Status: string
  IsSingleHand: boolean
  isDuration: boolean
  CreatedBy: string
  UpdatedAt: string
  CreatedAt: string
}

// Extended type for form usage
export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  Exercise: Exercise
}

// Form data type for creating/editing workout
export interface WorkoutFormData {
  Name: string
  Category: string
  Description: string
  WhenToPractice: string
  WorkoutNotes: string
  VideoURL: string
  containClimbing: boolean
  containExercise: boolean
  EstimatedClimbingTime: number
}

// Type for workout with exercises (for display)
export interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExerciseWithDetails[]
}

// Filter types
export type WorkoutTypeFilter = 'all' | 'exercise' | 'climbing' | 'both' | 'none'

export interface WorkoutFilters {
  search: string
  category: string
  type: WorkoutTypeFilter
  showInactive: boolean
}

// Default values
export const DEFAULT_WORKOUT_EXERCISE = {
  Sets: 3,
  Reps: 10,
  Duration: 30,
  Rest: 60,
}