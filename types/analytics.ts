// types/analytics.ts
// Types for Exercise Analytics Dashboard

export interface ExerciseLog {
  ExerciseLogID: number
  Email: string
  WorkoutID: number
  ExerciseID: number
  CalendarID: number | null
  HandSide: 'Right' | 'Left' | 'Both'
  SetNumber: number | null
  RepsPlanned: number | null
  RepsDone: number | null
  WeightKG: number | null
  DurationSec: number | null
  RPE: number | null
  Completed: boolean
  Notes: string | null
  CreatedAt: string
  UpdatedAt: string | null
  VolumeScore: number | null
}

export interface Exercise {
  ExerciseID: number
  Name: string
  Description: string | null
  Category: string
  VideoURL: string | null
  ImageURL: string | null
  Status: 'Active' | 'Inactive'
  IsSingleHand: boolean
  isDuration: boolean
  CreatedBy: string
  CreatedAt: string
  UpdatedAt: string
}

export type DateRange = 'week' | 'month' | '3months' | '6months' | 'year' | 'all'

export interface FilterState {
  exerciseId: number | null
  category: string | null
  dateRange: DateRange
  customStartDate: Date | null
  customEndDate: Date | null
}

export interface StatsData {
  avgWeight: number
  maxWeight: number
  minWeight: number
  avgReps: number
  maxReps: number
  minReps: number
  avgRPE: number
  maxRPE: number
  sessionsCount: number
}

export interface ChartDataPoint {
  date: string
  dateTime: Date
  weight?: number | null
  reps?: number | null
  rpe?: number | null
  right?: number | null
  left?: number | null
}