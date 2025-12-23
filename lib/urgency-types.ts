// lib/urgency-types.ts
// 📋 הגדרות Types למערכת דחיפות

export interface UrgencyFlag {
  type: 'critical' | 'red' | 'yellow' | 'green'
  category: 'sleep' | 'vitality' | 'pain' | 'activity'
  message: string
  average?: number
  daysReported?: number
  data?: any
}

export interface AthleteUrgency {
  email: string
  name: string
  flags: UrgencyFlag[]
  urgencyScore: number
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
  lastWorkout?: Date
}

export interface WellnessData {
  Date: string
  SleepHours: number | null
  VitalityLevel: number | null
  PainLevel: number | null
}

export interface AverageResult {
  average: number
  daysReported: number
}