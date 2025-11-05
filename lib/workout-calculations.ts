// lib/workout-calculations.ts
// Utility functions for calculating workout times

import { WorkoutExercise, Exercise } from '@/types/workouts'

/**
 * Calculate time for a single exercise in seconds
 */
export function calculateExerciseTime(
  exercise: WorkoutExercise,
  exerciseDetails?: Exercise
): number {
  const { Sets, Reps, Duration, Rest } = exercise
  
  let timePerSet: number
  
  if (Duration) {
    // Duration exercise (e.g., Plank)
    timePerSet = Duration
  } else {
    // Regular exercise or Repeaters
    // 5 seconds per rep
    timePerSet = Reps * 5
  }
  
  const totalWorkTime = timePerSet * Sets
  const totalRestTime = Rest * (Sets - 1) // No rest after last set
  
  return totalWorkTime + totalRestTime
}

/**
 * Calculate total time for all exercises in a workout
 */
export function calculateWorkoutExercisesTime(
  exercises: WorkoutExercise[]
): number {
  return exercises.reduce((total, ex) => {
    return total + calculateExerciseTime(ex)
  }, 0)
}

/**
 * Format seconds to minutes with ceiling
 */
export function formatTimeMinutes(seconds: number): string {
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} דק'`
}

/**
 * Format seconds to MM:SS
 */
export function formatTimeMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format rest time - show in MM:SS if >= 60 seconds, otherwise just seconds
 */
export function formatRestTime(seconds: number): string {
  if (seconds >= 60) {
    return formatTimeMMSS(seconds)
  }
  return `${seconds} שניות`
}

/**
 * Parse time string (MM:SS or seconds) to seconds
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (timeStr.includes(':')) {
    const [mins, secs] = timeStr.split(':').map(Number)
    return mins * 60 + secs
  }
  return parseInt(timeStr) || 0
}