'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import UserHeader from '@/components/UserHeader'

// Types
interface User {
  Email: string
  Name: string
  Role: string
}

interface Workout {
  id: number
  name: string
  description?: string
  category?: string
}

interface WorkoutForUser {
  WorkoutID: number
}

export default function AssignWorkoutsClient() {
  const { currentUser, trainees, loading: authLoading } = useAuth()
  
  // State
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('')
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([])
  const [userWorkouts, setUserWorkouts] = useState<Workout[]>([])
  const [availableWorkouts, setAvailableWorkouts] = useState<Workout[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Check permissions
  const isAdmin = currentUser?.Role === 'admin'
  const isCoach = currentUser?.Role === 'coach'
  const canAssign = isAdmin || isCoach

  // Redirect if no permission
  useEffect(() => {
    if (!authLoading && !canAssign) {
      window.location.href = '/dashboard'
    }
  }, [authLoading, canAssign])

  // Fetch all workouts on mount
  useEffect(() => {
    fetchAllWorkouts()
  }, [])

  // Update available workouts when user or category changes
  useEffect(() => {
    if (selectedUserEmail) {
      fetchUserWorkouts(selectedUserEmail)
    }
  }, [selectedUserEmail])

  useEffect(() => {
    updateAvailableWorkouts()
  }, [allWorkouts, userWorkouts, selectedCategory, searchQuery])

  /**
   * Fetch all workouts from Workouts table
   */
  const fetchAllWorkouts = async () => {
    const { data, error } = await supabase
      .from('Workouts')
      .select('WorkoutID, Name, Description, Category')
      .order('Name')

    if (error) {
      console.error('Error fetching workouts:', error)
      return
    }

    // Map to lowercase for internal consistency
    const workoutsWithId = (data || []).map(w => ({
      id: w.WorkoutID,
      name: w.Name,
      description: w.Description,
      category: w.Category
    }))

    setAllWorkouts(workoutsWithId)

    // Extract unique categories
    const uniqueCategories = [...new Set(workoutsWithId.map(w => w.category).filter(Boolean) as string[])]
    setCategories(uniqueCategories)
  }

  /**
   * Fetch workouts assigned to specific user
   */
  const fetchUserWorkouts = async (email: string) => {
    setLoading(true)

    // Get workout IDs for user
    const { data: assignments, error: assignError } = await supabase
      .from('WorkoutsForUser')
      .select('WorkoutID')
      .eq('Email', email)

    if (assignError) {
      console.error('Error fetching user workouts:', assignError)
      setLoading(false)
      return
    }

    const workoutIds = (assignments || []).map(a => a.WorkoutID)

    // Get workout details
    if (workoutIds.length === 0) {
      setUserWorkouts([])
      setLoading(false)
      return
    }

    const { data: workouts, error: workoutError } = await supabase
      .from('Workouts')
      .select('WorkoutID, Name, Description, Category')
      .in('WorkoutID', workoutIds)
      .order('Name')

    if (workoutError) {
      console.error('Error fetching workout details:', workoutError)
    } else {
      // Map to lowercase for consistency
      const workoutsWithId = (workouts || []).map(w => ({
        id: w.WorkoutID,
        name: w.Name,
        description: w.Description,
        category: w.Category
      }))
      setUserWorkouts(workoutsWithId)
    }

    setLoading(false)
  }

  /**
   * Update available workouts (excluding user's workouts)
   */
  const updateAvailableWorkouts = () => {
    const userWorkoutIds = new Set(userWorkouts.map(w => w.id))
    
    let filtered = allWorkouts.filter(w => !userWorkoutIds.has(w.id))

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(w => w.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(w => 
        w.name.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query)
      )
    }

    setAvailableWorkouts(filtered)
  }

  /**
   * Add workout to user
   */
  const handleAddWorkout = async (workout: Workout) => {
    if (!selectedUserEmail) return

    const { error } = await supabase
      .from('WorkoutsForUser')
      .insert({
        Email: selectedUserEmail,
        WorkoutID: workout.id
      })

    if (error) {
      console.error('Error adding workout:', error)
      alert('שגיאה בהוספת אימון')
      return
    }

    // Update UI
    setUserWorkouts(prev => [...prev, workout].sort((a, b) => a.name.localeCompare(b.name)))
  }

  /**
   * Remove workout from user
   */
  const handleRemoveWorkout = async (workout: Workout) => {
    if (!selectedUserEmail) return

    const { error } = await supabase
      .from('WorkoutsForUser')
      .delete()
      .eq('Email', selectedUserEmail)
      .eq('WorkoutID', workout.id)

    if (error) {
      console.error('Error removing workout:', error)
      alert('שגיאה בהסרת אימון')
      return
    }

    // Update UI
    setUserWorkouts(prev => prev.filter(w => w.id !== workout.id))
  }

  // Get emoji for category
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

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  // No permission
  if (!canAssign) {
    return null
  }

  const selectedUser = trainees.find(t => t.Email === selectedUserEmail)

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      <UserHeader />

      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">👥 הקצאת אימונים</h1>
          
          {/* User Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">בחר מתאמן:</label>
            <select
              value={selectedUserEmail}
              onChange={(e) => setSelectedUserEmail(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- בחר מתאמן --</option>
              {trainees.map(user => (
                <option key={user.Email} value={user.Email}>
                  {user.Name} ({user.Email})
                  {user.Email === currentUser?.Email ? ' - אני' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!selectedUserEmail ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👆</div>
            <p className="text-xl text-gray-600">בחר מתאמן כדי להתחיל</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Workouts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <h2 className="text-lg font-bold text-blue-800 mb-3">📚 אימונים זמינים</h2>
                
                {/* Filters */}
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
              </div>

              {/* Available Workouts List */}
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {availableWorkouts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'לא נמצאו אימונים מתאימים'
                      : 'כל האימונים כבר מוקצים'}
                  </div>
                ) : (
                  availableWorkouts.map(workout => (
                    <div
                      key={workout.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{getCategoryEmoji(workout.category)}</span>
                            <h3 className="font-bold text-gray-900">{workout.name}</h3>
                          </div>
                          {workout.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{workout.description}</p>
                          )}
                          {workout.category && (
                            <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {workout.category}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddWorkout(workout)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          + הוסף
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* User's Workouts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
                <h2 className="text-lg font-bold text-green-800">
                  ✅ אימונים של {selectedUser?.Name}
                </h2>
                <p className="text-sm text-green-700 mt-1">
                  {userWorkouts.length} אימונים מוקצים
                </p>
              </div>

              {/* User Workouts List */}
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">טוען אימונים...</p>
                  </div>
                ) : userWorkouts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📭</div>
                    <p>עדיין לא הוקצו אימונים</p>
                  </div>
                ) : (
                  userWorkouts.map(workout => (
                    <div
                      key={workout.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:bg-red-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{getCategoryEmoji(workout.category)}</span>
                            <h3 className="font-bold text-gray-900">{workout.name}</h3>
                          </div>
                          {workout.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{workout.description}</p>
                          )}
                          {workout.category && (
                            <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {workout.category}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveWorkout(workout)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          ❌ הסר
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}