import CalendarEditClient from './CalendarEditClient'
import UserHeader from '@/components/UserHeader'

export default function CalendarEditPage({ params }: { params: { calendarId: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <UserHeader />
      <CalendarEditClient />
    </div>
  )
}