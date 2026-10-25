'use client'
// Free session: pick exercises, then the regular workout flow runs with them.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveUserEmail } from '@/context/AuthContext'
import ExercisePicker from '@/components/workout-flow/ExercisePicker'
import { freeSessionHref, getFreeSessionWorkoutId } from '@/lib/free-session'
import { PageSkeleton } from '@/components/ui/Skeleton'

export default function FreeSessionPage() {
  const router = useRouter()
  const email = useActiveUserEmail()
  const [workoutId, setWorkoutId] = useState<number | null | undefined>(undefined)

  useEffect(() => { getFreeSessionWorkoutId().then(setWorkoutId) }, [])

  if (!email || workoutId === undefined) return <PageSkeleton label="טוען…" />
  if (workoutId === null) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-fg-2" dir="rtl">
        סשן חופשי עוד לא הוגדר במערכת. פנו למאמן.
      </div>
    )
  }
  return (
    <ExercisePicker
      email={email}
      title="סשן חופשי"
      actionLabel={n => `התחל סשן · ${n} ${n === 1 ? 'תרגיל' : 'תרגילים'}`}
      onCancel={() => router.push('/workouts')}
      onDone={picked => router.push(freeSessionHref(workoutId, picked.map(p => p.ExerciseID)))}
    />
  )
}
