// types/exercises.ts
// UPDATED WITH isDuration SUPPORT

export interface Exercise {
  ExerciseID: number
  Name: string
  Description: string
  Category: string
  VideoURL?: string | null
  ImageURL?: string | null
  Status: 'Active' | 'Inactive'
  IsSingleHand: boolean
  isDuration: boolean  // ✨ NEW: If true, measured in seconds instead of reps
  CreatedBy?: string
  CreatedAt?: string
  UpdatedAt?: string
}

export interface ExerciseFormData {
  Name: string
  Description: string
  Category: string
  VideoURL?: string
  ImageURL?: string
  IsSingleHand: boolean
  isDuration: boolean  // ✨ NEW
}

export interface ExerciseLog {
  ExerciseLogID?: number
  Email: string
  WorkoutID?: number
  CalendarID?: number
  ExerciseID: number
  SetNumber?: number
  RepsPlanned?: number
  RepsDone?: number       // Used when isDuration = false
  DurationSec?: number    // Used when isDuration = true
  WeightKG?: number
  RPE?: number
  IsSingleHand?: boolean
  HandSide?: 'Right' | 'Left' | 'Both' | null
  Completed: boolean
  Notes?: string
  CreatedAt?: string
  UpdatedAt?: string
}