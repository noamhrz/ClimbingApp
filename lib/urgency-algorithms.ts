// lib/urgency-algorithms.ts
// 🧮 אלגוריתמים טהורים למערכת דחיפות (ללא Supabase)

import { UrgencyFlag, WellnessData, AverageResult } from './urgency-types'

// ═══════════════════════════════════════════════════════
// חישוב ממוצע חכם - שינה
// ═══════════════════════════════════════════════════════
export function calculateSleepAverage(
  wellnessData: WellnessData[]
): AverageResult | null {
  let days = wellnessData.length
  let totalHours = 0
  
  wellnessData.forEach(day => {
    if (day.SleepHours === null || day.SleepHours === 0) {
      days--  // לא דיווח - הורד יום
    } else {
      totalHours += day.SleepHours
    }
  })
  
  if (days === 0) return null
  
  return {
    average: totalHours / days,
    daysReported: days
  }
}

// ═══════════════════════════════════════════════════════
// חישוב ממוצע חכם - חיוניות
// ═══════════════════════════════════════════════════════
export function calculateVitalityAverage(
  wellnessData: WellnessData[]
): AverageResult | null {
  let days = wellnessData.length
  let totalVitality = 0
  
  wellnessData.forEach(day => {
    if (day.VitalityLevel === null) {
      days--  // לא דיווח - הורד יום (0 = "אין כוח לכלום", ערך לגיטימי)
    } else {
      totalVitality += day.VitalityLevel
    }
  })
  
  if (days === 0) return null
  
  return {
    average: totalVitality / days,
    daysReported: days
  }
}

// ═══════════════════════════════════════════════════════
// חישוב ממוצע חכם - כאב
// ═══════════════════════════════════════════════════════
export function calculatePainAverage(
  wellnessData: WellnessData[]
): AverageResult | null {
  let days = wellnessData.length
  let totalPain = 0
  
  wellnessData.forEach(day => {
    if (day.PainLevel === null) {
      days--  // לא דיווח - הורד יום
    } else {
      totalPain += day.PainLevel  // 0 לגיטימי! (אין כאב)
    }
  })
  
  if (days === 0) return null
  
  return {
    average: totalPain / days,
    daysReported: days
  }
}

// ═══════════════════════════════════════════════════════
// יצירת דגל לפי ממוצע שינה
// ספים: < 6 🔴 | 6-8 🟡 | 8+ 🟢
// ═══════════════════════════════════════════════════════
export function createSleepFlag(
  avgSleep: number,
  daysReported: number
): UrgencyFlag {
  if (avgSleep < 6) {
    return {
      type: 'red',
      category: 'sleep',
      message: `😴 שינה: ${avgSleep.toFixed(1)}h (${daysReported} ימים)`,
      average: avgSleep,
      daysReported
    }
  } else if (avgSleep < 8) {
    return {
      type: 'yellow',
      category: 'sleep',
      message: `😴 שינה: ${avgSleep.toFixed(1)}h (${daysReported} ימים)`,
      average: avgSleep,
      daysReported
    }
  } else {
    return {
      type: 'green',
      category: 'sleep',
      message: `😴 שינה: ${avgSleep.toFixed(1)}h ✅`,
      average: avgSleep,
      daysReported
    }
  }
}

// ═══════════════════════════════════════════════════════
// יצירת דגל לפי ממוצע חיוניות
// סקאלה 0–3 (WellnessModal). ספים: ≤ 1 🔴 | < 2 🟡 | 2+ 🟢
// ═══════════════════════════════════════════════════════
export function createVitalityFlag(
  avgVitality: number,
  daysReported: number
): UrgencyFlag {
  if (avgVitality <= 1) {
    return {
      type: 'red',
      category: 'vitality',
      message: `⚡ חיוניות: ${avgVitality.toFixed(1)} (${daysReported} ימים)`,
      average: avgVitality,
      daysReported
    }
  } else if (avgVitality < 2) {
    return {
      type: 'yellow',
      category: 'vitality',
      message: `⚡ חיוניות: ${avgVitality.toFixed(1)} (${daysReported} ימים)`,
      average: avgVitality,
      daysReported
    }
  } else {
    return {
      type: 'green',
      category: 'vitality',
      message: `⚡ חיוניות: ${avgVitality.toFixed(1)} ✅`,
      average: avgVitality,
      daysReported
    }
  }
}

// ═══════════════════════════════════════════════════════
// יצירת דגל לפי ממוצע כאב
// סקאלה 0–3 (WellnessModal). ספים: ≥ 2.5 🔴🔴 | ≥ 2 🔴 | ≥ 1.5 🟡 | < 1.5 🟢
// ═══════════════════════════════════════════════════════
export function createPainFlag(
  avgPain: number,
  daysReported: number
): UrgencyFlag {
  if (avgPain >= 2.5) {
    return {
      type: 'critical',
      category: 'pain',
      message: `🤕 כאב: ${avgPain.toFixed(1)} - דורש התייחסות! (${daysReported} ימים)`,
      average: avgPain,
      daysReported
    }
  } else if (avgPain >= 2) {
    return {
      type: 'red',
      category: 'pain',
      message: `🤕 כאב: ${avgPain.toFixed(1)} - חמור (${daysReported} ימים)`,
      average: avgPain,
      daysReported
    }
  } else if (avgPain >= 1.5) {
    return {
      type: 'yellow',
      category: 'pain',
      message: `🤕 כאב: ${avgPain.toFixed(1)} (${daysReported} ימים)`,
      average: avgPain,
      daysReported
    }
  } else {
    return {
      type: 'green',
      category: 'pain',
      message: `🤕 כאב: ${avgPain.toFixed(1)} ✅`,
      average: avgPain,
      daysReported
    }
  }
}

// ═══════════════════════════════════════════════════════
// קביעת דרגת דחיפות
// ═══════════════════════════════════════════════════════
export function determineUrgencyLevel(
  flags: UrgencyFlag[]
): 'critical' | 'high' | 'medium' | 'low' {
  const hasCritical = flags.some(f => f.type === 'critical')
  const hasRed = flags.some(f => f.type === 'red')
  const hasYellow = flags.some(f => f.type === 'yellow')
  
  if (hasCritical) return 'critical'
  if (hasRed) return 'high'
  if (hasYellow) return 'medium'
  return 'low'
}