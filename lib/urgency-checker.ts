// lib/urgency-checker.ts
// 🚨 מערכת דחיפות מתאמנים - קובץ ראשי
// מתחבר ל-Supabase ומשתמש באלגוריתמים

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

// ═══════════════════════════════════════════════════════
// Helper functions for urgency display
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
// Check all flags for a single athlete
// ═══════════════════════════════════════════════════════
export async function checkAthleteFlags(email: string): Promise<UrgencyFlag[]> {
  const flags: UrgencyFlag[] = []
  
  // ═══════════════════════════════════════════════════════
  // 🟡/🔴 דגל פעילות: לא התאמן 4/7 ימים
  // ═══════════════════════════════════════════════════════
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    
    const fourDaysAgo = new Date()
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
    const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0]
    
    const { data: recentWorkouts, error: workoutsError } = await supabase
      .from('Calendar')
      .select('CalendarID')
      .eq('Email', email)
      .eq('Completed', true)
      .gte('StartTime', sevenDaysAgoStr)
    
    if (workoutsError) {
      console.warn('⚠️ Error checking workouts:', workoutsError)
    } else {
      const workoutCount = recentWorkouts?.length || 0
      
      if (workoutCount === 0) {
        // בדיקה אם גם לא התאמן ב-4 ימים האחרונים
        const { data: fourDayWorkouts } = await supabase
          .from('Calendar')
          .select('CalendarID')
          .eq('Email', email)
          .eq('Completed', true)
          .gte('StartTime', fourDaysAgoStr)
        
        const fourDayCount = fourDayWorkouts?.length || 0
        
        if (fourDayCount === 0) {
          // לא התאמן 7 ימים = אדום
          flags.push({
            type: 'red',
            category: 'activity',
            message: '🔴 לא התאמן 7 ימים!',
            data: { daysWithoutWorkout: 7 }
          })
        } else {
          // התאמן ב-4 ימים אחרונים אבל לא ב-7 = צהוב
          flags.push({
            type: 'yellow',
            category: 'activity',
            message: '🟡 לא התאמן 4-7 ימים',
            data: { daysWithoutWorkout: 5 }
          })
        }
      } else {
        // בדוק אם לא התאמן 4 ימים
        const { data: fourDayWorkouts } = await supabase
          .from('Calendar')
          .select('CalendarID')
          .eq('Email', email)
          .eq('Completed', true)
          .gte('StartTime', fourDaysAgoStr)
        
        const fourDayCount = fourDayWorkouts?.length || 0
        
        if (fourDayCount === 0) {
          // לא התאמן 4 ימים = צהוב
          flags.push({
            type: 'yellow',
            category: 'activity',
            message: '🟡 לא התאמן 4 ימים',
            data: { daysWithoutWorkout: 4 }
          })
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in activity check:', error)
  }
  
  // ═══════════════════════════════════════════════════════
  // 📊 ממוצע חכם - 7 ימים אחרונים (Wellness)
  // ═══════════════════════════════════════════════════════
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    
    const { data: wellnessData, error: wellnessError } = await supabase
      .from('WellnessLog')
      .select('Date, SleepHours, VitalityLevel, PainLevel')
      .eq('Email', email)
      .gte('Date', sevenDaysAgoStr)
      .order('Date', { ascending: true })
    
    // ✅ טיפול בשגיאות - אם אין טבלת Wellness
    if (wellnessError) {
      if (wellnessError.code === '42P01' || wellnessError.message.includes('does not exist')) {
        // טבלה לא קיימת - התעלם בשקט
        console.warn('⚠️ Wellness table does not exist - skipping wellness checks')
      } else {
        console.warn('⚠️ Error fetching wellness data:', wellnessError)
      }
      return flags  // החזר רק דגלי פעילות
    }
    
    if (wellnessData && wellnessData.length > 0) {
      // 😴 שינה
      const sleepAvg = calculateSleepAverage(wellnessData as WellnessData[])
      if (sleepAvg) {
        flags.push(createSleepFlag(sleepAvg.average, sleepAvg.daysReported))
      }
      
      // ⚡ חיוניות
      const vitalityAvg = calculateVitalityAverage(wellnessData as WellnessData[])
      if (vitalityAvg) {
        flags.push(createVitalityFlag(vitalityAvg.average, vitalityAvg.daysReported))
      }
      
      // 🤕 כאב
      const painAvg = calculatePainAverage(wellnessData as WellnessData[])
      if (painAvg) {
        flags.push(createPainFlag(painAvg.average, painAvg.daysReported))
      }
    }
  } catch (error) {
    console.error('❌ Error in wellness check:', error)
  }
  
  return flags
}

// ═══════════════════════════════════════════════════════
// Get all athletes sorted by urgency (with permissions)
// ═══════════════════════════════════════════════════════
export async function getAthletesByUrgency(
  currentUserEmail: string,
  currentUserRole: 'admin' | 'coach' | 'user'
): Promise<AthleteUrgency[]> {
  
  // ✅ Check permissions
  if (currentUserRole === 'user') {
    throw new Error('אין לך הרשאה לצפות בדף זה')
  }
  
  let athleteEmails: string[] = []
  
  try {
    if (currentUserRole === 'admin') {
      // Admin sees everyone
      const { data: allUsers, error } = await supabase
        .from('Users')
        .select('Email, Name, Role, IsActive')
        .eq('Role', 'user')
      
      if (error) {
        console.error('❌ Error fetching users:', error)
        return []
      }
      
      athleteEmails = allUsers?.map(u => u.Email) || []
      
    } else if (currentUserRole === 'coach') {
      // Coach sees only assigned trainees
      const { data: assignments, error } = await supabase
        .from('CoachTrainees')
        .select('TraineeEmail')
        .eq('CoachEmail', currentUserEmail)
        .eq('Active', true)
        .eq('Status', 'active')
      
      if (error) {
        console.error('❌ Error fetching assignments:', error)
        return []
      }
      
      athleteEmails = assignments?.map(a => a.TraineeEmail) || []
    }
    
    if (athleteEmails.length === 0) {
      return []
    }
    
    // Get athlete details
    const { data: athletes, error: athletesError } = await supabase
      .from('Users')
      .select('Email, Name')
      .in('Email', athleteEmails)
      .order('Name')
    
    if (athletesError) {
      console.error('❌ Error fetching athlete details:', athletesError)
      return []
    }
    
    if (!athletes || athletes.length === 0) {
      return []
    }
    
    // Check flags for each athlete
    const athletesWithFlags = await Promise.all(
      athletes.map(async (athlete) => {
        const flags = await checkAthleteFlags(athlete.Email)
        
        // Calculate urgency score
        const urgencyScoreMap = { critical: 100, red: 50, yellow: 25, green: 0 }
        const urgencyScore = flags.reduce((total, flag) => {
          return total + (urgencyScoreMap[flag.type] || 0)
        }, 0)
        
        // Determine urgency level based on flags
        const urgencyLevel = determineUrgencyLevel(flags)
        
        // Get last completed workout
        let lastWorkout: Date | undefined
        try {
          const { data: lastWorkoutData } = await supabase
            .from('Calendar')
            .select('StartTime')
            .eq('Email', athlete.Email)
            .eq('Completed', true)
            .order('StartTime', { ascending: false })
            .limit(1)
          
          if (lastWorkoutData?.[0]?.StartTime) {
            lastWorkout = new Date(lastWorkoutData[0].StartTime)
          }
        } catch (error) {
          console.warn('⚠️ Error fetching last workout:', error)
        }
        
        return {
          email: athlete.Email,
          name: athlete.Name,
          flags,
          urgencyScore,
          urgencyLevel,
          lastWorkout
        }
      })
    )
    
    // Sort by urgency: first by red flags, then by yellow flags
    return athletesWithFlags.sort((a, b) => {
      // Count flags by type
      const aRed = a.flags.filter(f => f.type === 'critical' || f.type === 'red').length
      const bRed = b.flags.filter(f => f.type === 'critical' || f.type === 'red').length
      const aYellow = a.flags.filter(f => f.type === 'yellow').length
      const bYellow = b.flags.filter(f => f.type === 'yellow').length
      
      // Sort by red flags first
      if (aRed !== bRed) {
        return bRed - aRed  // More red flags = higher priority
      }
      
      // If same red flags, sort by yellow flags
      if (aYellow !== bYellow) {
        return bYellow - aYellow  // More yellow flags = higher priority
      }
      
      // If same flags, sort by urgency level
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]
    })
    
  } catch (error) {
    console.error('❌ Fatal error in getAthletesByUrgency:', error)
    return []
  }
}

// Export types for use in other files
export type { UrgencyFlag, AthleteUrgency } from './urgency-types'