// types/exercises.ts

export interface Exercise {
  ExerciseID: number
  Name: string
  Description: string
  Category: string  // Dynamic from DB
  VideoURL?: string | null
  ImageURL?: string | null
  Status: 'Active' | 'Inactive'
  IsSingleHand: boolean
  CreatedBy?: string
  CreatedAt?: string
  UpdatedAt?: string
}

export interface ExerciseFormData {
  Name: string
  Description: string
  Category: string  // Free text
  VideoURL?: string
  ImageURL?: string
  IsSingleHand: boolean
}

// For backward compatibility - extend existing ExerciseLog if needed
export interface ExerciseLog {
  ExerciseLogID?: number
  Email: string
  WorkoutID?: number
  CalendarID?: number
  ExerciseID: number
  SetNumber?: number
  RepsPlanned?: number
  RepsDone?: number
  WeightKG?: number
  DurationSec?: number
  RPE?: number
  IsSingleHand?: boolean
  HandSide?: 'Right' | 'Left' | 'Both' | null
  Completed: boolean
  Notes?: string
  CreatedAt?: string
  UpdatedAt?: string
}