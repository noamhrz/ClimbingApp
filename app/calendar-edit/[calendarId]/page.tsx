import CalendarEditClient from './CalendarEditClient'

export default function CalendarEditPage({ params }: { params: { calendarId: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <CalendarEditClient />
    </div>
  )
}
