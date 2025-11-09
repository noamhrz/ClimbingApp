'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

interface Workout {
  WorkoutID: number
  Name: string
  Description?: string
  Category?: string
  IsKeyWorkout?: boolean
  Notes?: string
}

export default function WorkoutsPage() {
  const { currentUser } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    if (currentUser?.Email) {
      fetchWorkouts()
    }
  }, [currentUser])

  const fetchWorkouts = async () => {
    if (!currentUser?.Email) return

    try {
      setLoading(true)

      // שלב 1: קבל את ה-WorkoutIDs + IsKeyWorkout + Notes של המשתמש
      const { data: userWorkouts, error: userError } = await supabase
        .from('WorkoutsForUser')
        .select('WorkoutID, IsKeyWorkout, Notes')
        .eq('Email', currentUser.Email)

      if (userError) throw userError

      const workoutIds = (userWorkouts || []).map(w => w.WorkoutID)

      if (workoutIds.length === 0) {
        setWorkouts([])
        setLoading(false)
        return
      }

      // שלב 2: קבל את פרטי האימונים
      const { data: workoutDetails, error: detailsError } = await supabase
        .from('Workouts')
        .select('WorkoutID, Name, Description, Category')
        .in('WorkoutID', workoutIds)

      if (detailsError) throw detailsError

      // שלב 3: שלב את הנתונים
      const combinedWorkouts = (workoutDetails || []).map(workout => {
        const userWorkout = userWorkouts?.find(uw => uw.WorkoutID === workout.WorkoutID)
        return {
          ...workout,
          IsKeyWorkout: userWorkout?.IsKeyWorkout || false,
          Notes: userWorkout?.Notes || ''
        }
      })

      setWorkouts(combinedWorkouts)

      // חלץ קטגוריות
      const uniqueCategories = [...new Set(combinedWorkouts.map(w => w.Category).filter(Boolean) as string[])]
      setCategories(uniqueCategories)

    } catch (error) {
      console.error('Error fetching workouts:', error)
      alert('שגיאה בטעינת אימונים')
    } finally {
      setLoading(false)
    }
  }

  // סינון אימונים
  const filteredWorkouts = workouts.filter(workout => {
    // סינון לפי קטגוריה
    if (selectedCategory !== 'all' && workout.Category !== selectedCategory) {
      return false
    }

    // סינון לפי חיפוש
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        workout.Name.toLowerCase().includes(query) ||
        workout.Description?.toLowerCase().includes(query) ||
        workout.Category?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // אימוני מפתח - הצג קודם
  const keyWorkouts = filteredWorkouts.filter(w => w.IsKeyWorkout)
  const regularWorkouts = filteredWorkouts.filter(w => !w.IsKeyWorkout)

  const getCategoryEmoji = (category?: string) => {
    const emojiMap: Record<string, string> = {
      'Strength': '💪',
      'Cardio': '🏃',
      'Flexibility': '🧘',
      'Climbing': '🧗',
      'Upper Body': '🏋️',
      'Lower Body': '🦵',
      'Full Body': '🤸',
      'Core': '🎯'
    }
    return category ? emojiMap[category] || '🏋️' : '🏋️'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען אימונים...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">🏋️ האימונים שלי</h1>
          
          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">כל הקטגוריות</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="🔍 חיפוש..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stats */}
          <div className="mt-3 flex gap-4 text-sm text-gray-600">
            <span>סה"כ: {workouts.length} אימונים</span>
            {keyWorkouts.length > 0 && (
              <span className="text-yellow-600 font-semibold">⭐ {keyWorkouts.length} אימוני מפתח</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {workouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl text-gray-600 mb-2">עדיין לא הוקצו לך אימונים</p>
            <p className="text-gray-500">פנה למאמן שלך להקצאת אימונים</p>
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-600">לא נמצאו אימונים מתאימים</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* אימוני מפתח */}
            {keyWorkouts.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-yellow-600 mb-4 flex items-center gap-2">
                  ⭐ אימוני מפתח
                  <span className="text-sm font-normal text-gray-500">
                    ({keyWorkouts.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {keyWorkouts.map(workout => (
                    <Link
                      key={workout.WorkoutID}
                      href={`/workout/${workout.WorkoutID}`}
                      className="block"
                    >
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-105">
                        {/* תג אימון מפתח */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{getCategoryEmoji(workout.Category)}</span>
                            <span className="text-2xl">⭐</span>
                          </div>
                          {workout.Category && (
                            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded font-medium">
                              {workout.Category}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {workout.Name}
                        </h3>

                        {workout.Description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {workout.Description}
                          </p>
                        )}

                        {/* הערת המאמן */}
                        {workout.Notes && (
                          <div className="mt-3 p-3 bg-white/80 rounded-lg border border-yellow-300">
                            <p className="text-xs font-semibold text-yellow-700 mb-1">
                              💬 הערת המאמן:
                            </p>
                            <p className="text-sm text-gray-700">
                              {workout.Notes}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-yellow-700 font-semibold">
                            לחץ לפרטים →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* אימונים רגילים */}
            {regularWorkouts.length > 0 && (
              <div>
                {keyWorkouts.length > 0 && (
                  <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    🏋️ אימונים נוספים
                    <span className="text-sm font-normal text-gray-500">
                      ({regularWorkouts.length})
                    </span>
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regularWorkouts.map(workout => (
                    <Link
                      key={workout.WorkoutID}
                      href={`/workout/${workout.WorkoutID}`}
                      className="block"
                    >
                      <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all hover:border-blue-300">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-3xl">{getCategoryEmoji(workout.Category)}</span>
                          {workout.Category && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                              {workout.Category}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {workout.Name}
                        </h3>

                        {workout.Description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {workout.Description}
                          </p>
                        )}

                        {/* הערת המאמן */}
                        {workout.Notes && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-semibold text-blue-700 mb-1">
                              💬 הערת המאמן:
                            </p>
                            <p className="text-sm text-gray-700">
                              {workout.Notes}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-blue-600 font-semibold">
                            לחץ לפרטים →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}