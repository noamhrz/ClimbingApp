// app/athlete-stats/[email]/page.tsx
// 📊 דף סטטיסטיקות מתאמן
// ✅ הרשאות: User רואה רק עצמו, Coach/Admin רואים הכל
// 🔧 FIXED: Pass selectedEmail to ExerciseStatsDisplay

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { getProfileMetrics } from '@/lib/athlete-stats-metrics'
import type { ProfileMetrics } from '@/lib/athlete-stats-metrics'
import { getClimbingPerformance } from '@/lib/climbing-stats-metrics'
import type { ClimbingPerformance } from '@/lib/climbing-stats-metrics'
import { ClimbingStatsDisplay } from '@/components/climbing-stats-display'
import { getWorkoutPerformance } from '@/lib/workout-stats-metrics'
import type { WorkoutPerformance } from '@/lib/workout-stats-metrics'
import { WorkoutStatsDisplay } from '@/components/workout-stats-display'
import { getExercisePerformance } from '@/lib/exercise-stats-metrics'
import type { ExercisePerformance } from '@/lib/exercise-stats-metrics'
import { LuCalendarDays, LuChartColumn, LuCircleCheck, LuClipboardList, LuHourglass, LuTriangleAlert, LuUser } from 'react-icons/lu'
import { PageSkeleton } from '@/components/ui/Skeleton'

export default function ProfilePage() {
  const params = useParams()
  const { activeUser, currentUser } = useAuth()
  const router = useRouter()

  const [selectedEmail, setSelectedEmail] = useState<string>('')
  const [users, setUsers] = useState<Array<{ Email: string; Name: string; Status?: string }>>([])
  const [metrics, setMetrics] = useState<ProfileMetrics | null>(null)
  const [climbingPerformance, setClimbingPerformance] = useState<ClimbingPerformance | null>(null)
  const [workoutPerformance, setWorkoutPerformance] = useState<WorkoutPerformance | null>(null)
  const [exercisePerformance, setExercisePerformance] = useState<ExercisePerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Date range state - default: last 30 days
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })

  // Initialize selectedEmail from params
  useEffect(() => {
    if (params.email) {
      setSelectedEmail(decodeURIComponent(params.email as string))
    }
  }, [params.email])

  // Check permissions
  const canViewOthers = currentUser?.Role === 'admin' || currentUser?.Role === 'coach'
  const isViewingSelf = selectedEmail === activeUser?.Email

  useEffect(() => {
    if (!selectedEmail) return

    // Redirect if user tries to view others without permission
    if (!canViewOthers && selectedEmail !== activeUser?.Email) {
      router.push(`/athlete-stats/${activeUser?.Email}`)
      return
    }

    if (canViewOthers) {
      loadUsers()
    }

    loadMetrics()
  }, [selectedEmail, startDate, endDate])

  const loadUsers = async () => {
    try {
      if (currentUser?.Role === 'admin') {
        const { data, error } = await supabase
          .from('Users')
          .select('Email, Name, Status')
          .order('Name')

        if (error) throw error
        const sorted = (data || []).sort((a, b) => {
          const aActive = a.Status === 'Active' ? 0 : 1
          const bActive = b.Status === 'Active' ? 0 : 1
          return aActive - bActive
        })
        setUsers(sorted)
      } else if (currentUser?.Role === 'coach') {
        const { data, error } = await supabase
          .from('CoachTraineesActiveView')
          .select('TraineeEmail, TraineeName')
          .eq('CoachEmail', currentUser.Email)
          .order('TraineeName')

        if (error) throw error

        const emails = (data || []).map(t => t.TraineeEmail)
        const { data: statusData } = emails.length > 0
          ? await supabase.from('Users').select('Email, Status').in('Email', emails)
          : { data: [] }
        const statusMap = new Map((statusData || []).map(u => [u.Email, u.Status]))

        const trainees = (data || []).map(t => ({
          Email: t.TraineeEmail,
          Name: t.TraineeName,
          Status: statusMap.get(t.TraineeEmail) as string | undefined
        })).sort((a, b) => {
          const aActive = a.Status === 'Active' ? 0 : 1
          const bActive = b.Status === 'Active' ? 0 : 1
          return aActive - bActive
        })

        setUsers(trainees)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadMetrics = async () => {
    if (!selectedEmail || !startDate || !endDate) return

    setLoading(true)
    setError(null)

    try {
      // Load all metrics in parallel
      const [metricsData, climbingData, workoutData, exerciseData] = await Promise.all([
        getProfileMetrics(selectedEmail, startDate, endDate),
        getClimbingPerformance(selectedEmail, startDate, endDate),
        getWorkoutPerformance(selectedEmail, startDate, endDate),
        getExercisePerformance(selectedEmail, startDate, endDate)
      ])
      
      setMetrics(metricsData)
      setClimbingPerformance(climbingData)
      setWorkoutPerformance(workoutData)
      setExercisePerformance(exerciseData)
    } catch (error) {
      console.error('Error loading metrics:', error)
      setError(error instanceof Error ? error.message : 'שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }

  const handleUserChange = (email: string) => {
    setSelectedEmail(email)
    router.push(`/athlete-stats/${email}`)
  }

  const handleDateRangeChange = async () => {
    setRefreshLoading(true)
    await loadMetrics()
    setRefreshLoading(false)
  }

  if (loading && !metrics) {
    return (
      <PageSkeleton variant="dashboard" label="טוען נתונים..." />
    )
  }

  if (!selectedEmail) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2"><LuHourglass aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
          <div className="text-xl">טוען...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2"><LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />סטטיסטיקות מתאמן</h1>
            <p className="text-fg-3">
              {isViewingSelf ? 'הנתונים שלך' : `נתונים עבור ${metrics?.userName || selectedEmail}`}
            </p>
          </div>

          {/* User selector - only for admin/coach */}
          {canViewOthers && users.length > 0 && (
            <div className="bg-surface rounded-lg p-4 border-2 border-accent">
              <label className="block text-sm font-medium text-fg-2 mb-2">
                <LuUser aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />בחר משתמש:
              </label>
              <select
                value={selectedEmail}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              >
                {users.map((user) => (
                  <option
                    key={user.Email}
                    value={user.Email}
                    style={user.Status === 'Inactive' ? { color: 'gray' } : undefined}
                  >
                    {user.Name}{user.Status === 'Inactive' ? ' (לא פעיל)' : ''} ({user.Email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date Range Picker - only for admin/coach */}
        {canViewOthers && <div className="bg-surface rounded-lg p-4 border border-line">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-fg-2 mb-1">
                <LuCalendarDays aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />מתאריך:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                disabled={refreshLoading}
                className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-fg-2 mb-1">
                <LuCalendarDays aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />עד תאריך:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                disabled={refreshLoading}
                className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleDateRangeChange}
                disabled={refreshLoading}
                className="px-6 py-2 bg-accent text-on-accent rounded-lg hover:bg-accent-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {refreshLoading ? (
                  <>
                    <span className="animate-spin"><LuHourglass aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></span>
                    טוען...
                  </>
                ) : (
                  '🔄 רענן'
                )}
              </button>
            </div>
          </div>
        </div>}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-danger/15 border border-danger rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl"><LuTriangleAlert aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></span>
            <div>
              <div className="font-bold text-danger">שגיאה בטעינת נתונים</div>
              <div className="text-danger">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Workout Completion Card */}
          <div className="bg-surface rounded-lg p-6 border-r-4 border-accent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-fg"><LuCircleCheck aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />אחוז השלמת אימונים</h3>
            </div>
            
            <div className="text-center">
              <div className={`text-6xl font-bold mb-4 ${
 metrics.workoutCompletion >= 80 ? 'text-success' :
 metrics.workoutCompletion >= 50 ? 'text-warning' :
 'text-danger'
 }`}>
                {metrics.workoutCompletion.toFixed(1)}%
              </div>
              
              <div className="text-fg-3 text-sm space-y-1">
                <div><LuCircleCheck aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />הושלמו: <strong>{metrics.completedWorkouts}</strong></div>
                <div><LuClipboardList aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />סה"כ: <strong>{metrics.totalWorkouts}</strong></div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 w-full bg-raised rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
 metrics.workoutCompletion >= 80 ? 'bg-success' :
 metrics.workoutCompletion >= 50 ? 'bg-warning' :
 'bg-danger'
 }`}
                  style={{ width: `${metrics.workoutCompletion}%` }}
                />
              </div>
            </div>
          </div>

          {/* Sleep Average Card */}
          <div className={`bg-surface rounded-lg p-6 border-r-4 ${
 metrics.sleepAverage >= 8 ? 'border-success' :
 metrics.sleepAverage >= 6 ? 'border-warning' :
 'border-danger'
 }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-fg">😴 ממוצע שעות שינה</h3>
            </div>
            
            <div className="text-center">
              <div className={`text-6xl font-bold mb-4 ${
 metrics.sleepAverage >= 8 ? 'text-success' :
 metrics.sleepAverage >= 6 ? 'text-warning' :
 'text-danger'
 }`}>
                {metrics.sleepAverage > 0 ? metrics.sleepAverage.toFixed(1) : '—'}
              </div>
              
              <div className="text-fg-3 text-sm mb-4">
                {metrics.sleepAverage > 0 ? (
                  <>שעות לילה בממוצע</>
                ) : (
                  <span className="text-faint">לא דווח על שינה בתקופה זו</span>
                )}
              </div>

              {/* Color Legend */}
              {metrics.sleepAverage > 0 && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    {metrics.sleepAverage >= 8 ? (
                      <span className="text-success font-bold">🟢 מעולה!</span>
                    ) : metrics.sleepAverage >= 6 ? (
                      <span className="text-warning font-bold">🟡 בינוני</span>
                    ) : (
                      <span className="text-danger font-bold">🔴 נמוך מדי</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted pt-2 border-t">
                    <div>🟢 מעולה: 8+ שעות</div>
                    <div>🟡 בינוני: 6-8 שעות</div>
                    <div>🔴 נמוך: פחות מ-6 שעות</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Climbing Performance Stats */}
      {climbingPerformance && (
        <div className="mb-8">
          <ClimbingStatsDisplay performance={climbingPerformance} />
        </div>
      )}

      {/* Workout Performance Stats */}
      {workoutPerformance && (
        <div className="mb-8">
          <WorkoutStatsDisplay performance={workoutPerformance} email={selectedEmail} />
        </div>
      )}

      {/* No Data State */}
      {metrics && metrics.totalWorkouts === 0 && metrics.sleepAverage === 0 && (
        <div className="bg-warning/15 border border-warning rounded-lg p-12 text-center mt-6">
          <div className="text-6xl mb-4"><LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
          <h2 className="text-2xl font-bold text-fg mb-2">אין נתונים לתקופה זו</h2>
          <p className="text-fg-3">
            נסה לבחור טווח תאריכים אחר או בדוק שיש רשומות במערכת.
          </p>
        </div>
      )}

    </div>
  )
}