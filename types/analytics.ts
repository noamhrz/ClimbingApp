// types/analytics.ts
// Types for Exercise Analytics Dashboard

export interface Exercise {
  ExerciseID: number
  Name: string
  Category: string
  IsSingleHand: boolean
  Status: string
}

export interface ExerciseLog {
  ExerciseLogID: number  // ✅ Changed from LogID
  ExerciseID: number
  Email: string
  WeightKG: number | null
  RepsDone: number | null
  RPE: number | null
  HandSide: 'Right' | 'Left' | 'Both' | null
  SetNumber: number | null  // ✅ Added
  DurationSec: number | null  // ✅ Added
  VolumeScore: number | null  // ✅ Added
  CreatedAt: string
  Notes: string | null
}

export interface FilterState {
  exerciseId: number | null
  category: string | null
  dateRange: DateRange
  customStartDate: string | null
  customEndDate: string | null
}

export type DateRange = 'week' | 'month' | '3months' | '6months' | 'year' | 'all'

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
  // Both hands
  weight?: number | null
  reps?: number | null
  rpe?: number | null
  // Single hand
  right?: number | null
  left?: number | null
  rightReps?: number | null  // ✅ Added
  leftReps?: number | null   // ✅ Added
}