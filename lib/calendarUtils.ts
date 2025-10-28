import { supabase } from './supabaseClient'

// Event color utility based on state
export function getEventColor(event: {
  StartTime: string | Date
  Completed: boolean
  Deloading?: boolean
  DeloadingPercentage?: number | null
}) {
  const now = new Date()
  const eventDate = new Date(event.StartTime)
  const isToday = eventDate.toDateString() === now.toDateString()

  // Deloading overrides normal colors
  if (event.Deloading) {
    if (event.Completed) {
      return {
        bg: '#b7f7b3', // light green for completed deload
        text: '#1a1a1a',
      }
    } else {
      return {
        bg: '#cce9ff', // light blue for upcoming deload
        text: '#1a1a1a',
      }
    }
  }

  // Normal (non-deload) states:
  if (event.Completed) {
    return { bg: 'rgb(34 197 94)', text: 'white' } // green-500
  }

  if (isToday) {
    return { bg: 'rgb(251 191 36)', text: '#1a1a1a' } // amber/yellow for "today"
  }

  if (eventDate < now) {
    return { bg: 'rgb(239 68 68)', text: 'white' } // red-500 (missed/past)
  }

  // future
  return { bg: 'rgb(37 99 235)', text: 'white' } // blue-600 for upcoming
}

// Apply deloading to all events in date range for a user
export async function applyDeloading(
  email: string,
  startDate: Date,
  endDate: Date,
  percentage: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Set time to start of day for startDate and end of day for endDate
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const { error } = await supabase
      .from('Calendar')
      .update({
        Deloading: true,
        DeloadingPercentage: percentage,
      })
      .eq('Email', email)
      .gte('StartTime', start.toISOString())
      .lte('StartTime', end.toISOString())

    if (error) {
      console.error('❌ Error applying deloading:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('❌ Exception applying deloading:', err)
    return { success: false, error: String(err) }
  }
}

// Remove deloading from all events in date range for a user
export async function clearDeloading(
  email: string,
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    // Set time to start of day for startDate and end of day for endDate
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const { error } = await supabase
      .from('Calendar')
      .update({
        Deloading: false,
        DeloadingPercentage: null,
      })
      .eq('Email', email)
      .gte('StartTime', start.toISOString())
      .lte('StartTime', end.toISOString())

    if (error) {
      console.error('❌ Error clearing deloading:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('❌ Exception clearing deloading:', err)
    return { success: false, error: String(err) }
  }
}
