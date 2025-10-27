import UserHeader from '@/components/UserHeader'
import AdminFooter from '@/components/AdminFooter'
import WorkoutDetailClient from './WorkoutDetailClient'

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // ✅ פותרים את ה־Promise נכון

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* רק Header ו־Footer כאן — אין צורך לרנדר פעמיים את הדשבורד */}
      <UserHeader />

      <div className="p-4">
        <WorkoutDetailClient id={Number(id)} />
      </div>

      <AdminFooter />
    </div>
  )
}
