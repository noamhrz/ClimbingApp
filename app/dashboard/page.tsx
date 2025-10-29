'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import dayjs from 'dayjs'
import UserHeader from '@/components/UserHeader'

type CalendarRow = {
  CalendarID: number
  Email: string
  WorkoutID: number
  StartTime: string
  Completed: boolean
  RPE: number | null
  CoachNotes: string | null
  ClimberNotes: string | null
  Deloading?: boolean
}

export default function DashboardPage() {
  const { activeUser, loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  const [nextWorkout, setNextWorkout] = useState<CalendarRow | null>(null)
  const [completedWorkouts, setCompletedWorkouts] = useState<CalendarRow[]>([])
  const [avgRPE, setAvgRPE] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeEmail) return

    const fetchDashboardData = async () => {
      setLoading(true)
      const now = new Date().toISOString()

      // 🟩 1. אימון הבא
      const { data: nextData, error: nextErr } = await supabase
        .from('Calendar')
        .select('*')
        .eq('Email', activeEmail)
        .gt('StartTime', now)
        .order('StartTime', { ascending: true })
        .limit(1)

      if (nextErr) console.error('שגיאה באימון הבא:', nextErr)
      setNextWorkout(nextData?.[0] ?? null)

      // 🟩 2. אימונים שהושלמו
      const { data: completedData, error: compErr } = await supabase
        .from('Calendar')
        .select('*')
        .eq('Email', activeEmail)
        .eq('Completed', true)

      if (compErr) console.error('שגיאה באימונים שהושלמו:', compErr)
      setCompletedWorkouts(completedData ?? [])

      // 🟩 3. ממוצע RPE
      const { data: rpeData, error: rpeErr } = await supabase
        .from('Calendar')
        .select('RPE')
        .eq('Email', activeEmail)
        .not('RPE', 'is', null)

      if (rpeErr) console.error('שגיאה בחישוב RPE:', rpeErr)

      if (rpeData && rpeData.length > 0) {
        const avg =
          rpeData.reduce((sum, r) => sum + (r.RPE ?? 0), 0) / rpeData.length
        setAvgRPE(Number(avg.toFixed(1)))
      } else {
        setAvgRPE(null)
      }

      setLoading(false)
    }

    fetchDashboardData()
  }, [activeEmail])

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  // No user
  if (!activeUser) {
    return (
      <div className="text-center mt-10 text-gray-600">
        <p>אנא בחר משתמש כדי להציג את הנתונים</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative pb-20">
      {/* Header */}
      <UserHeader />

      <div className="p-6 text-center max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          שלום {activeUser.Name} 👋
        </h2>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && (
          <>
            {/* 🟦 האימון הבא */}
            <div className="border p-4 rounded mb-4 bg-white shadow-sm">
              <h3 className="font-semibold text-lg text-blue-700 mb-2">
                האימון הבא
              </h3>
              {nextWorkout ? (
                <div>
                  <p className="text-lg font-medium">
                    {dayjs(nextWorkout.StartTime).format('DD/MM/YYYY HH:mm')}
                  </p>
                  <p className="text-gray-700 mt-1">
                    {nextWorkout.CoachNotes || 'בהצלחה באימון!'}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">אין אימון קרוב בלוח הזמנים.</p>
              )}
            </div>

            {/* 💚 סטטיסטיקות */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-yellow-100 rounded p-4 shadow-sm">
                <p className="text-3xl font-bold">{avgRPE ?? '-'}</p>
                <p className="text-sm text-gray-600">ממוצע RPE</p>
              </div>

              <div className="bg-green-100 rounded p-4 shadow-sm">
                <p className="text-3xl font-bold">{completedWorkouts.length}</p>
                <p className="text-sm text-gray-600">אימונים שהושלמו</p>
              </div>

              <div className="bg-blue-100 rounded p-4 shadow-sm">
                <p className="text-3xl font-bold">
                  {completedWorkouts.filter((w) => w.Deloading).length}
                </p>
                <p className="text-sm text-gray-600">ימי דילואד</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}