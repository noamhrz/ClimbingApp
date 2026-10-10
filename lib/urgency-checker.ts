// lib/urgency-checker-OPTIMIZED.ts
// 🚀 OPTIMIZED: Batch queries instead of N+1

import { isActiveUser } from './active-users'
import { supabase } from '@/lib/supabaseClient'
import { UrgencyFlag, AthleteUrgency, WellnessData } from './urgency-types'
import {
  calculateSleepAverage,
  calculateVitalityAverage,
  calculatePainAverage,
  createSleepFlag,
  createVitalityFlag,
  createPainFlag,
  determineUrgencyLevel
} from './urgency-algorithms'

// Helper functions (same as before)
export function getUrgencyColor(level: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'critical': return 'bg-red-100 border-red-300 text-red-900'
    case 'high': return 'bg-orange-100 border-orange-300 text-orange-900'
    case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-900'
    case 'low': return 'bg-green-100 border-green-300 text-green-900'
  }
}

export function getUrgencyIcon(level: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'critical': return '🔴🔴'
    case 'high': return '🔴'
    case 'medium': return '🟡'
    case 'low': return '🟢'
  }
}

export function getFlagIcon(category: UrgencyFlag['category']): string {
  switch (category) {
    case 'sleep': return '😴'
    case 'vitality': return '⚡'
    case 'pain': return '🤕'
    case 'activity': return '🚶'
  }
}

// ✅ OPTIMIZED: Get all athletes by urgency with BATCH QUERIES
export async function getAthletesByUrgency(
  currentUserEmail: string,
  currentUserRole: 'admin' | 'coach' | 'user'
): Promise<AthleteUrgency[]> {
  
  if (currentUserRole === 'user') {
    throw new Error('אין לך הרשאה לצפות בדף זה')
  }
  
  let athleteEmails: string[] = []
  
  try {
    // Step 1: Get athlete list
    if (currentUserRole === 'admin') {
      const { data: allUsers, error } = await supabase
        .from('Users')
        .select('Email, Name')
        .eq('Role', 'user')
      
      if (error || !allUsers) return []
      athleteEmails = allUsers.map(u => u.Email)
      
    } else if (currentUserRole === 'coach') {
      const { data: assignments, error } = await supabase
        .from('CoachTrainees')
        .select('TraineeEmail')
        .eq('CoachEmail', currentUserEmail)
        .eq('Active', true)
        .eq('Status', 'active')
      
      if (error || !assignments) return []
      athleteEmails = assignments.map(a => a.TraineeEmail)
    }
    
    if (athleteEmails.length === 0) return []
    
    // Step 2: Get athlete details (BATCH)
    const { data: allAthletes } = await supabase
      .from('Users')
      .select('Email, Name, Status, IsActive')
      .in('Email', athleteEmails)
      .order('Name')
    const athletes = (allAthletes || []).filter(isActiveUser)
    
    if (!athletes || athletes.length === 0) return []
    
    // ✅ Step 3: BATCH QUERY - Get ALL workouts for ALL athletes at once!
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    
    const fourDaysAgo = new Date()
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
    const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0]
    
    const { data: allWorkouts } = await supabase
      .from('Calendar')
      .select('Email, StartTime, Completed')
      .in('Email', athleteEmails)
      .eq('Completed', true)
      .gte('StartTime', sevenDaysAgoStr)
      .order('StartTime', { ascending: false })
    
    // ✅ Step 4: BATCH QUERY - Get ALL wellness data for ALL athletes at once!
    const { data: allWellness } = await supabase
      .from('WellnessLog')
      .select('Email, Date, SleepHours, VitalityLevel, PainLevel')
      .in('Email', athleteEmails)
      .gte('Date', sevenDaysAgoStr)
      .order('Date', { ascending: true })
    
    // ✅ Step 5: Group data by email (in-memory, super fast!)
    const workoutsByEmail = new Map<string, any[]>()
    const wellnessByEmail = new Map<string, WellnessData[]>()
    const lastWorkoutByEmail = new Map<string, Date>()
    
    allWorkouts?.forEach(w => {
      if (!workoutsByEmail.has(w.Email)) {
        workoutsByEmail.set(w.Email, [])
      }
      workoutsByEmail.get(w.Email)!.push(w)
      
      // Track last workout
      const workoutDate = new Date(w.StartTime)
      if (!lastWorkoutByEmail.has(w.Email) || workoutDate > lastWorkoutByEmail.get(w.Email)!) {
        lastWorkoutByEmail.set(w.Email, workoutDate)
      }
    })
    
    allWellness?.forEach(w => {
      if (!wellnessByEmail.has(w.Email)) {
        wellnessByEmail.set(w.Email, [])
      }
      wellnessByEmail.get(w.Email)!.push(w as WellnessData)
    })
    
    // ✅ Step 6: Calculate flags for each athlete (in-memory, no queries!)
    const athletesWithFlags = athletes.map(athlete => {
      const flags: UrgencyFlag[] = []
      const workouts = workoutsByEmail.get(athlete.Email) || []
      const wellness = wellnessByEmail.get(athlete.Email) || []
      
      // 🚶 Activity flags
      const sevenDayWorkouts = workouts.filter(w => 
        new Date(w.StartTime) >= sevenDaysAgo
      )
      const fourDayWorkouts = workouts.filter(w => 
        new Date(w.StartTime) >= fourDaysAgo
      )
      
      if (sevenDayWorkouts.length === 0) {
        if (fourDayWorkouts.length === 0) {
          flags.push({
            type: 'red',
            category: 'activity',
            message: '🔴 לא התאמן 7 ימים!',
            data: { daysWithoutWorkout: 7 }
          })
        } else {
          flags.push({
            type: 'yellow',
            category: 'activity',
            message: '🟡 לא התאמן 4-7 ימים',
            data: { daysWithoutWorkout: 5 }
          })
        }
      } else if (fourDayWorkouts.length === 0) {
        flags.push({
          type: 'yellow',
          category: 'activity',
          message: '🟡 לא התאמן 4 ימים',
          data: { daysWithoutWorkout: 4 }
        })
      }
      
      // 📊 Wellness flags
      if (wellness.length > 0) {
        // 😴 Sleep
        const sleepAvg = calculateSleepAverage(wellness)
        if (sleepAvg) {
          flags.push(createSleepFlag(sleepAvg.average, sleepAvg.daysReported))
        }
        
        // ⚡ Vitality
        const vitalityAvg = calculateVitalityAverage(wellness)
        if (vitalityAvg) {
          flags.push(createVitalityFlag(vitalityAvg.average, vitalityAvg.daysReported))
        }
        
        // 🤕 Pain
        const painAvg = calculatePainAverage(wellness)
        if (painAvg) {
          flags.push(createPainFlag(painAvg.average, painAvg.daysReported))
        }
      }
      
      // Calculate urgency
      const urgencyScoreMap = { critical: 100, red: 50, yellow: 25, green: 0 }
      const urgencyScore = flags.reduce((total, flag) => {
        return total + (urgencyScoreMap[flag.type] || 0)
      }, 0)
      
      const urgencyLevel = determineUrgencyLevel(flags)
      const lastWorkout = lastWorkoutByEmail.get(athlete.Email)
      
      return {
        email: athlete.Email,
        name: athlete.Name,
        flags,
        urgencyScore,
        urgencyLevel,
        lastWorkout
      }
    })
    
    // ✅ Sort by urgency
    return athletesWithFlags.sort((a, b) => {
      const aRed = a.flags.filter(f => f.type === 'critical' || f.type === 'red').length
      const bRed = b.flags.filter(f => f.type === 'critical' || f.type === 'red').length
      const aYellow = a.flags.filter(f => f.type === 'yellow').length
      const bYellow = b.flags.filter(f => f.type === 'yellow').length
      
      if (aRed !== bRed) return bRed - aRed
      if (aYellow !== bYellow) return bYellow - aYellow
      
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]
    })
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    return []
  }
}

// Keep old function for backwards compatibility (but it won't be used)
export async function checkAthleteFlags(email: string): Promise<UrgencyFlag[]> {
  // This is now deprecated, kept only for backwards compatibility
  // Use getAthletesByUrgency() instead
  return []
}

export type { UrgencyFlag, AthleteUrgency } from './urgency-types'