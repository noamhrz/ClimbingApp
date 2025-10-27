import CalendarEditClient from './CalendarEditClient'
import UserHeader from '@/components/UserHeader'

export default function CalendarEditPage({ params }: { params: { calendarId: string } }) {
  const calendarId = Number(params.calendarId)

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <UserHeader />
      <CalendarEditClient calendarId={calendarId} />
    </div>
  )
}
