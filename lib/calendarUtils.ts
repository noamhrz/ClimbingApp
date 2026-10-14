
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
