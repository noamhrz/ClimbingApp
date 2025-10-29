'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import UserHeader from '@/components/UserHeader'

type Workout = {
  WorkoutID: number
  Name: string
  Category: string
  Description: string
  WhenToPractice: string
}

export default function WorkoutsPage() {
  const { activeUser } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!activeUser) {
        setWorkouts([])
        setLoading(false)
        return
      }

      setLoading(true)

      // Fetch workouts assigned to the active user
      const { data: assignments, error: assignError } = await supabase
        .from('WorkoutsForUser')
        .select('WorkoutID')
        .eq('Email', activeUser.Email)

      if (assignError) {
        console.error('❌ שגיאה בטעינת WorkoutsForUser:', assignError)
        setWorkouts([])
        setLoading(false)
        return
      }

      const workoutIds = (assignments || []).map(a => a.WorkoutID)

      if (workoutIds.length === 0) {
        setWorkouts([])
        setLoading(false)
        return
      }

      // Fetch workout details
      const { data: workoutData, error: workoutError } = await supabase
        .from('Workouts')
        .select('WorkoutID, Name, Category, Description, WhenToPractice')
        .in('WorkoutID', workoutIds)
        .order('Name')

      if (workoutError) {
        console.error('❌ שגיאה בטעינת Workouts:', workoutError)
        setWorkouts([])
      } else {
        setWorkouts(workoutData || [])
      }

      setLoading(false)
    }

    fetchWorkouts()
  }, [activeUser])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <UserHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען אימונים...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      <UserHeader />

      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600">🏋️ האימונים שלי</h1>
          {activeUser && (
            <p className="text-sm text-gray-600 mt-1">
              {workouts.length} אימונים מוקצים ל{activeUser.Name}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {workouts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              עדיין לא הוקצו לך אימונים
            </h2>
            <p className="text-gray-500">
              המאמן שלך יוכל להקצות לך אימונים בקרוב
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workouts.map((workout) => (
              <div
                key={workout.WorkoutID}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-5"
              >
                {/* Category Badge */}
                {workout.Category && (
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {workout.Category}
                    </span>
                  </div>
                )}

                {/* Workout Name */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {workout.Name}
                </h3>

                {/* When to Practice */}
                {workout.WhenToPractice && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="text-lg">⏰</span>
                    <span>{workout.WhenToPractice}</span>
                  </div>
                )}

                {/* Description */}
                {workout.Description && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {workout.Description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}