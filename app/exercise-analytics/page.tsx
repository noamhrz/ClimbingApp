// app/exercise-analytics/page.tsx
// Main Exercise Analytics Dashboard - WITHOUT useSearchParams

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useUserContext } from '@/context/UserContext'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import { 
  Exercise, 
  ExerciseLog, 
  FilterState, 
  DateRange, 
  StatsData,
  ChartDataPoint 
} from '@/types/analytics'
import ExerciseFilters from '@/components/analytics/ExerciseFilters'
import StatsCards from '@/components/analytics/StatsCards'
import ProgressChart from '@/components/analytics/ProgressChart'
import SessionsTable from '@/components/analytics/SessionsTable'

export default function ExerciseAnalyticsPage() {
  const router = useRouter()
  const { activeUser, loading: authLoading } = useAuth()
  const { selectedUser } = useUserContext()

  // ✅ EMAIL HIERARCHY: URL param > Manual selection > UserContext > AuthContext
  const [targetEmail, setTargetEmail] = useState<string>('')
  const [bodyWeight, setBodyWeight] = useState<number | null>(null)
  const [users, setUsers] = useState<Array<{ Email: string; Name: string }>>([])

  // Check permissions
  const canViewOthers = activeUser?.Role === 'admin' || activeUser?.Role === 'coach'

  useEffect(() => {
    // Load users list for admin/coach
    if (canViewOthers) {
      loadUsers()
    }
  }, [canViewOthers, activeUser])

  useEffect(() => {
    // 1️⃣ Try URL parameter (highest priority)
    const urlParams = new URLSearchParams(window.location.search)
    const urlEmail = urlParams.get('email')
    
    if (urlEmail) {
      setTargetEmail(urlEmail)
      return
    }
    
    // 2️⃣ If admin/coach and users loaded, keep current selection or use first user
    if (canViewOthers && users.length > 0 && !targetEmail) {
      // Use first user from list as default
      setTargetEmail(users[0].Email)
      return
    }
    
    // 3️⃣ Try UserContext (admin impersonation)
    if (selectedUser?.userEmail || selectedUser?.Email) {
      setTargetEmail(selectedUser.userEmail || selectedUser.Email)
      return
    }
    
    // 4️⃣ Fallback to current user
    if (activeUser?.Email) {
      setTargetEmail(activeUser.Email)
    }
  }, [activeUser?.Email, selectedUser, users, canViewOthers])

  const loadUsers = async () => {
    try {
      if (activeUser?.Role === 'admin') {
        // Admin sees ALL users
        const { data, error } = await supabase
          .from('Users')
          .select('Email, Name')
          .eq('IsActive', true)
          .order('Name')

        if (error) throw error
        setUsers(data || [])
      } else if (activeUser?.Role === 'coach') {
        // Coach sees only their assigned trainees
        const { data, error } = await supabase
          .from('CoachTraineesActiveView')
          .select('TraineeEmail, TraineeName')
          .eq('CoachEmail', activeUser.Email)
          .order('TraineeName')

        if (error) throw error
        
        // Map to User format
        const trainees = (data || []).map(t => ({
          Email: t.TraineeEmail,
          Name: t.TraineeName
        }))
        
        setUsers(trainees)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleUserChange = (email: string) => {
    setTargetEmail(email)
  }

  // Fetch body weight when targetEmail changes
  useEffect(() => {
    if (!targetEmail) return

    const fetchBodyWeight = async () => {
      const { data, error } = await supabase
        .from('Profiles')
        .select('BodyWeightKG')
        .eq('Email', targetEmail)
        .single()

      if (!error && data) {
        setBodyWeight(data.BodyWeightKG)
      }
    }

    fetchBodyWeight()
  }, [targetEmail])

  // State
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    exerciseId: null,
    category: null,
    dateRange: '3months',
    customStartDate: null,
    customEndDate: null
  })

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(exercises.map(e => e.Category))
    return Array.from(cats).sort()
  }, [exercises])

  // Get selected exercise
  const selectedExercise = useMemo(() => 
    exercises.find(e => e.ExerciseID === filters.exerciseId),
    [exercises, filters.exerciseId]
  )

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = moment()
    let start = moment()
    
    switch (filters.dateRange) {
      case 'week':
        start = moment().subtract(7, 'days')
        break
      case 'month':
        start = moment().subtract(30, 'days')
        break
      case '3months':
        start = moment().subtract(90, 'days')
        break
      case '6months':
        start = moment().subtract(180, 'days')
        break
      case 'year':
        start = moment().subtract(365, 'days')
        break
      case 'all':
        start = moment('2020-01-01')
        break
    }
    
    return { 
      startDate: start.toISOString(), 
      endDate: end.toISOString() 
    }
  }, [filters.dateRange])

  // Auto-select exercise from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const exerciseId = urlParams.get('exerciseId')
    
    if (exerciseId && exercises.length > 0) {
      setFilters(prev => ({
        ...prev,
        exerciseId: parseInt(exerciseId)
      }))
    }
  }, [exercises])

  // Fetch exercises on mount
  useEffect(() => {
    if (!targetEmail) return
    
    const fetchExercises = async () => {
      // ✅ Get only exercises that have logs for this user
      const { data: logsData, error: logsError } = await supabase
        .from('ExerciseLogs')
        .select('ExerciseID')
        .eq('Email', targetEmail)
      
      if (logsError) {
        console.error('Error fetching exercise logs:', logsError)
        return
      }
      
      // Get unique exercise IDs that user has logs for
      const exerciseIdsWithLogs = [...new Set(logsData?.map(log => log.ExerciseID) || [])]
      
      if (exerciseIdsWithLogs.length === 0) {
        setExercises([])
        return
      }
      
      // Fetch only those exercises
      const { data, error } = await supabase
        .from('Exercises')
        .select('*')
        .eq('Status', 'Active')
        .in('ExerciseID', exerciseIdsWithLogs)
        .order('Name')
      
      if (!error && data) {
        setExercises(data)
      }
    }
    
    fetchExercises()
  }, [targetEmail])

  // Fetch logs when filters change
  useEffect(() => {
    if (!targetEmail) return
    
    // ✅ OPTIMIZATION: Only fetch logs when exercise or category is selected
    if (!filters.exerciseId && !filters.category) {
      setLogs([])
      setLoading(false)
      return
    }
    
    const fetchLogs = async () => {
      setLoading(true)
      
      let query = supabase
        .from('ExerciseLogs')
        .select('*')
        .eq('Email', targetEmail)
        .gte('CreatedAt', startDate)
        .lte('CreatedAt', endDate)
        .order('CreatedAt', { ascending: false })
      
      // Filter by exercise
      if (filters.exerciseId) {
        query = query.eq('ExerciseID', filters.exerciseId)
      }
      
      // Filter by category
      if (filters.category && !filters.exerciseId) {
        const categoryExerciseIds = exercises
          .filter(e => e.Category === filters.category)
          .map(e => e.ExerciseID)
        
        if (categoryExerciseIds.length > 0) {
          query = query.in('ExerciseID', categoryExerciseIds)
        } else {
          // No exercises in this category
          setLogs([])
          setLoading(false)
          return
        }
      }
      
      const { data, error } = await query
      
      if (!error && data) {
        setLogs(data)
      } else {
        setLogs([])
      }
      
      setLoading(false)
    }
    
    // ✅ OPTIMIZATION: Debounce the fetch to avoid too many requests
    const timeoutId = setTimeout(() => {
      fetchLogs()
    }, 300) // Wait 300ms after last filter change
    
    return () => clearTimeout(timeoutId)
  }, [targetEmail, filters, startDate, endDate, exercises])

  // Calculate statistics
  const { rightStats, leftStats, bothHandsStats } = useMemo(() => {
    const calculateStats = (filteredLogs: ExerciseLog[]): StatsData => {
      if (filteredLogs.length === 0) {
        return {
          avgWeight: 0,
          maxWeight: 0,
          minWeight: 0,
          avgReps: 0,
          maxReps: 0,
          minReps: 0,
          avgRPE: 0,
          maxRPE: 0,
          sessionsCount: 0
        }
      }
      
      const weights = filteredLogs.map(l => l.WeightKG).filter(w => w !== null) as number[]
      const reps = filteredLogs.map(l => l.RepsDone).filter(r => r !== null) as number[]
      const rpes = filteredLogs.map(l => l.RPE).filter(r => r !== null) as number[]
      
      return {
        avgWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0,
        maxWeight: weights.length > 0 ? Math.max(...weights) : 0,
        minWeight: weights.length > 0 ? Math.min(...weights) : 0,
        avgReps: reps.length > 0 ? reps.reduce((a, b) => a + b, 0) / reps.length : 0,
        maxReps: reps.length > 0 ? Math.max(...reps) : 0,
        minReps: reps.length > 0 ? Math.min(...reps) : 0,
        avgRPE: rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 0,
        maxRPE: rpes.length > 0 ? Math.max(...rpes) : 0,
        sessionsCount: filteredLogs.length
      }
    }
    
    if (selectedExercise?.IsSingleHand) {
      const rightLogs = logs.filter(l => l.HandSide === 'Right')
      const leftLogs = logs.filter(l => l.HandSide === 'Left')
      
      return {
        rightStats: calculateStats(rightLogs),
        leftStats: calculateStats(leftLogs),
        bothHandsStats: null
      }
    } else {
      return {
        rightStats: null,
        leftStats: null,
        bothHandsStats: calculateStats(logs)
      }
    }
  }, [logs, selectedExercise])

  // Prepare chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    if (logs.length === 0) return []
    
    // Group logs by date
    const groupedByDate: { [key: string]: ExerciseLog[] } = {}
    
    logs.forEach(log => {
      const dateKey = moment(log.CreatedAt).format('DD/MM')
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(log)
    })
    
    // Convert to chart data
    const chartPoints: ChartDataPoint[] = []
    
    Object.keys(groupedByDate).reverse().forEach(dateKey => {
      const dayLogs = groupedByDate[dateKey]
      
      if (selectedExercise?.IsSingleHand) {
        // Single hand - right vs left
        const rightLog = dayLogs.find(l => l.HandSide === 'Right')
        const leftLog = dayLogs.find(l => l.HandSide === 'Left')
        
        chartPoints.push({
          date: dateKey,
          dateTime: new Date(dayLogs[0].CreatedAt),
          right: rightLog?.WeightKG || null,
          left: leftLog?.WeightKG || null,
          rightReps: rightLog?.RepsDone || null,
          leftReps: leftLog?.RepsDone || null
        })
      } else {
        // Both hands - weight, reps, RPE
        const avgWeight = dayLogs.filter(l => l.WeightKG !== null).reduce((sum, l) => sum + (l.WeightKG || 0), 0) / dayLogs.filter(l => l.WeightKG !== null).length || null
        const avgReps = dayLogs.filter(l => l.RepsDone !== null).reduce((sum, l) => sum + (l.RepsDone || 0), 0) / dayLogs.filter(l => l.RepsDone !== null).length || null
        const avgRPE = dayLogs.filter(l => l.RPE !== null).reduce((sum, l) => sum + (l.RPE || 0), 0) / dayLogs.filter(l => l.RPE !== null).length || null
        
        chartPoints.push({
          date: dateKey,
          dateTime: new Date(dayLogs[0].CreatedAt),
          weight: avgWeight,
          reps: avgReps,
          rpe: avgRPE
        })
      }
    })
    
    return chartPoints
  }, [logs, selectedExercise])

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!activeUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">אנא התחבר למערכת</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📊 ניתוח תרגילים</h1>
              <p className="text-blue-100 mt-1">
                מעקב אחר התקדמות ושיפור ביצועים
                {targetEmail && targetEmail !== activeUser?.Email && (
                  <span className="mr-2 bg-blue-800/50 px-2 py-1 rounded text-sm">
                    👤 {targetEmail}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              ← חזרה
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* User Selector - Only for admin/coach */}
        {canViewOthers && users.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-md p-5 mb-6 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl">👥</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">בחירת מתאמן לניתוח</h3>
                <p className="text-sm text-gray-600">
                  {activeUser?.Role === 'admin' ? 'כאדמין, ניתן לצפות בכל המשתמשים' : 'מציג את המתאמנים שלך'}
                </p>
              </div>
            </div>
            <select
              value={targetEmail}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg text-base font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              {users.map((user) => (
                <option key={user.Email} value={user.Email}>
                  {user.Name} • {user.Email}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Filters */}
        <ExerciseFilters
          filters={filters}
          onFiltersChange={setFilters}
          exercises={exercises}
          categories={categories}
        />

        {/* Show message if no exercise selected */}
        {!filters.exerciseId && !filters.category && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">
              בחר תרגיל או קטגוריה
            </h3>
            <p className="text-blue-700">
              השתמש בפילטרים למעלה כדי לראות ניתוח מפורט
            </p>
          </div>
        )}

        {/* Show analytics when exercise/category selected */}
        {(filters.exerciseId || filters.category) && (
          <>
            {/* Exercise Title */}
            {selectedExercise && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  💪 {selectedExercise.Name}
                  {selectedExercise.IsSingleHand && (
                    <span className="text-sm text-blue-600 mr-2">(יד בודדת)</span>
                  )}
                </h2>
                <p className="text-gray-600 mt-1">
                  📅 {filters.dateRange === 'week' ? 'שבוע אחרון' :
                     filters.dateRange === 'month' ? 'חודש אחרון' :
                     filters.dateRange === '3months' ? '3 חודשים' :
                     filters.dateRange === '6months' ? '6 חודשים' :
                     filters.dateRange === 'year' ? 'שנה' : 'כל הזמן'}
                  {' • '}
                  {logs.length} סשנים
                </p>
              </div>
            )}

            {/* Stats Cards */}
            <StatsCards
              rightStats={rightStats}
              leftStats={leftStats}
              isSingleHand={selectedExercise?.IsSingleHand || false}
              bothHandsStats={bothHandsStats}
            />

            {/* Progress Chart */}
            <ProgressChart
              data={chartData}
              isSingleHand={selectedExercise?.IsSingleHand || false}
              bodyWeight={bodyWeight}
            />

            {/* Sessions Table */}
            <SessionsTable
              logs={logs}
              isSingleHand={selectedExercise?.IsSingleHand || false}
            />
          </>
        )}
      </div>
    </div>
  )
}