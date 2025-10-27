'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserContext } from '@/context/UserContext'
import UserHeader from '@/components/UserHeader'
import AdminFooter from '@/components/AdminFooter'

type Workout = {
  WorkoutID: number
  Name: string
  Category: string
  Description: string
  WhenToPractice: string
}

export default function WorkoutsPage() {
  const { selectedUser } = useUserContext()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true)

      if (selectedUser) {
        // ✅ אימונים לפי המשתמש
        const { data, error } = await supabase
          .from('WorkoutsForUser')
          .select(`
            WorkoutID,
            Workouts (WorkoutID, Name, Category, Description, WhenToPractice)
          `)
          .eq('UserID', selectedUser.UserID)

        if (!error && data) {
          const mapped = (data as any[])
            .map((r) => r.Workouts)
            .filter(Boolean) as Workout[]
          setWorkouts(mapped)
        } else {
          console.error('❌ שגיאה בטעינת WorkoutsForUser:', error)
          setWorkouts([])
        }
      } else {
        // ✅ ללא משתמש נבחר – כל האימונים
        const { data, error } = await supabase.from('Workouts').select('*')
        if (!error && data) setWorkouts(data as Workout[])
        else setWorkouts([])
      }

      setLoading(false)
    }
    fetchWorkouts()
  }, [selectedUser])

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <p className="p-6 text-gray-600">⌛ טוען אימונים...</p>
        <AdminFooter />
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <UserHeader />

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-blue-600">רשימת אימונים</h1>

        {!selectedUser && (
          <p className="mb-3 text-sm text-gray-500">
            💡 טיפ: בחר משתמש (מימין למעלה) כדי לראות אימונים שהוקצו לו.
          </p>
        )}

        {workouts.length === 0 ? (
          <p className="text-gray-500">לא נמצאו אימונים להצגה.</p>
        ) : (
          <table className="w-full border border-gray-300 rounded-md">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">שם אימון</th>
                <th className="p-2 border">קטגוריה</th>
                <th className="p-2 border">מתי לתרגל</th>
                <th className="p-2 border">תיאור</th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((w) => (
                <tr
                  key={w.WorkoutID}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <td className="p-2 border font-medium text-blue-700">
                    {w.Name}
                  </td>
                  <td className="p-2 border">{w.Category}</td>
                  <td className="p-2 border">{w.WhenToPractice}</td>
                  <td className="p-2 border text-sm text-gray-700">
                    {w.Description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AdminFooter />
    </div>
  )
}
