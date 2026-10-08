'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { LuDumbbell, LuInbox, LuMessageSquare, LuSearch, LuStar } from 'react-icons/lu'
import { PageSkeleton } from '@/components/ui/Skeleton'

interface Workout {
  WorkoutID: number
  Name: string
  Description?: string
  Category?: string
  IsKeyWorkout?: boolean
  Notes?: string
}

export default function WorkoutsPage() {
  const { currentUser, activeUser, isImpersonating } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])

  // השתמש ב-activeUser אם קיים, אחרת currentUser
  const userToShow = activeUser || currentUser

  useEffect(() => {
    if (userToShow?.Email) {
      fetchWorkouts()
    }
  }, [userToShow?.Email])

  const fetchWorkouts = async () => {
    if (!userToShow?.Email) return

    try {
      setLoading(true)

      // שלב 1: קבל את ה-WorkoutIDs של המשתמש
      const { data: userWorkouts, error: userError } = await supabase
        .from('WorkoutsForUser')
        .select('WorkoutID, IsKeyWorkout, Notes')
        .eq('Email', userToShow.Email)

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
      alert('שגיאה בטעינת אימונים')
    } finally {
      setLoading(false)
    }
  }

  // סינון אימונים
  const filteredWorkouts = workouts.filter(workout => {
    if (selectedCategory !== 'all' && workout.Category !== selectedCategory) {
      return false
    }

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
      <PageSkeleton variant="list" label="טוען אימונים..." />
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-surface pb-20">
      {/* Header */}
      <div className="bg-surface border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-fg mb-4 flex items-center gap-2">
            <LuDumbbell aria-hidden className="w-6 h-6 shrink-0 text-accent" />האימונים של {userToShow?.Name || 'המשתמש'}
          </h1>
          
          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 max-w-xs px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-accent"
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
              className="flex-1 px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Stats */}
          <div className="mt-3 flex gap-4 text-sm text-fg-3">
            <span>סה"כ: {workouts.length} אימונים</span>
            {keyWorkouts.length > 0 && (
              <span className="text-warning font-semibold inline-flex items-center gap-1"><LuStar aria-hidden className="w-4 h-4 fill-current" />{keyWorkouts.length} אימוני מפתח</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {workouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4"><LuInbox aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
            <p className="text-xl text-fg-3 mb-2">עדיין לא הוקצו אימונים ל-{userToShow?.Name}</p>
            <p className="text-muted">פנה למאמן להקצאת אימונים</p>
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4"><LuSearch aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
            <p className="text-xl text-fg-3">לא נמצאו אימונים מתאימים</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* אימוני מפתח */}
            {keyWorkouts.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-warning mb-4 flex items-center gap-2">
                  <LuStar aria-hidden className="w-5 h-5 fill-current" />אימוני מפתח
                  <span className="text-sm font-normal text-muted">
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
                      <div className="border-2 border-warning rounded-xl p-5 transition-all hover:scale-105 bg-surface">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{getCategoryEmoji(workout.Category)}</span>
                            <LuStar aria-hidden className="w-6 h-6 text-warning fill-current" />
                          </div>
                          {workout.Category && (
                            <span className="px-2 py-1 bg-warning/15 text-warning text-xs rounded font-medium">
                              {workout.Category}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-fg mb-2">
                          {workout.Name}
                        </h3>

                        {workout.Description && (
                          <p className="text-sm text-fg-3 line-clamp-2 mb-3">
                            {workout.Description}
                          </p>
                        )}

                        {workout.Notes && (
                          <div className="mt-3 p-3 bg-warning/10 rounded-lg border border-warning/40">
                            <p className="text-xs font-semibold text-warning mb-1">
                              <LuMessageSquare aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />הערת המאמן:
                            </p>
                            <p className="text-sm text-fg-2">
                              {workout.Notes}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-warning font-semibold">
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
                  <h2 className="text-xl font-bold text-fg-2 mb-4 flex items-center gap-2">
                    <LuDumbbell aria-hidden className="w-5 h-5 text-accent" />אימונים נוספים
                    <span className="text-sm font-normal text-muted">
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
                      <div className="bg-surface border border-line rounded-xl p-5 transition-all hover:border-accent">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-3xl">{getCategoryEmoji(workout.Category)}</span>
                          {workout.Category && (
                            <span className="px-2 py-1 bg-accent/15 text-accent text-xs rounded font-medium">
                              {workout.Category}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-fg mb-2">
                          {workout.Name}
                        </h3>

                        {workout.Description && (
                          <p className="text-sm text-fg-3 line-clamp-2 mb-3">
                            {workout.Description}
                          </p>
                        )}

                        {workout.Notes && (
                          <div className="mt-3 p-3 bg-accent/15 rounded-lg border border-accent">
                            <p className="text-xs font-semibold text-accent mb-1">
                              <LuMessageSquare aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />הערת המאמן:
                            </p>
                            <p className="text-sm text-fg-2">
                              {workout.Notes}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-accent font-semibold">
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