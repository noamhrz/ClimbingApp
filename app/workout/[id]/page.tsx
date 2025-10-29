import UserHeader from '@/components/UserHeader'
import WorkoutDetailClient from './WorkoutDetailClient'

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <UserHeader />
      
      <div className="p-4">
        <WorkoutDetailClient id={Number(id)} />
      </div>
    </div>
  )
}