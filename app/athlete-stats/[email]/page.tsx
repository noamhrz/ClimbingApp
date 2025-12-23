// app/athlete-stats/[email]/page.tsx
// 📊 דף סטטיסטיקות מתאמן
// ✅ הרשאות: User רואה רק עצמו, Coach/Admin רואים הכל

'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { getProfileMetrics } from '@/lib/athlete-stats-metrics'
import type { ProfileMetrics } from '@/lib/athlete-stats-metrics'

interface PageProps {
  params: Promise<{ email: string }>
}

export default function ProfilePage({ params }: PageProps) {
  const resolvedParams = use(params)
  const { activeUser, currentUser } = useAuth()
  const router = useRouter()

  const [selectedEmail, setSelectedEmail] = useState<string>(decodeURIComponent(resolvedParams.email))
  const [users, setUsers] = useState<Array<{ Email: string; Name: string }>>([])
  const [metrics, setMetrics] = useState<ProfileMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date range state - default: last 30 days
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })

  // Check permissions
  const canViewOthers = currentUser?.Role === 'admin' || currentUser?.Role === 'coach'
  const isViewingSelf = selectedEmail === activeUser?.Email

  useEffect(() => {
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
        // Admin sees ALL users
        const { data, error } = await supabase
          .from('Users')
          .select('Email, Name')
          .eq('IsActive', true)
          .order('Name')

        if (error) throw error
        setUsers(data || [])
      } else if (currentUser?.Role === 'coach') {
        // Coach sees only their assigned trainees
        const { data, error } = await supabase
          .from('CoachTraineesActiveView')
          .select('TraineeEmail, TraineeName')
          .eq('CoachEmail', currentUser.Email)
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

  const loadMetrics = async () => {
    if (!selectedEmail || !startDate || !endDate) return

    setLoading(true)
    setError(null)

    try {
      const data = await getProfileMetrics(selectedEmail, startDate, endDate)
      setMetrics(data)
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

  const handleDateRangeChange = () => {
    loadMetrics()
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-xl">טוען נתונים...</div>
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
            <h1 className="text-4xl font-bold mb-2">📊 סטטיסטיקות מתאמן</h1>
            <p className="text-gray-600">
              {isViewingSelf ? 'הנתונים שלך' : `נתונים עבור ${metrics?.userName || selectedEmail}`}
            </p>
          </div>

          {/* User selector - only for admin/coach */}
          {canViewOthers && users.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 border-2 border-blue-300">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 בחר משתמש:
              </label>
              <select
                value={selectedEmail}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {users.map((user) => (
                  <option key={user.Email} value={user.Email}>
                    {user.Name} ({user.Email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date Range Picker */}
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-300">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📅 מתאריך:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📅 עד תאריך:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleDateRangeChange}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                🔄 רענן
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <div className="font-bold text-red-900">שגיאה בטעינת נתונים</div>
              <div className="text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Workout Completion Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-r-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">✅ אחוז השלמת אימונים</h3>
            </div>
            
            <div className="text-center">
              <div className={`text-6xl font-bold mb-4 ${
                metrics.workoutCompletion >= 80 ? 'text-green-600' :
                metrics.workoutCompletion >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {metrics.workoutCompletion.toFixed(1)}%
              </div>
              
              <div className="text-gray-600 text-sm space-y-1">
                <div>✅ הושלמו: <strong>{metrics.completedWorkouts}</strong></div>
                <div>📋 סה"כ: <strong>{metrics.totalWorkouts}</strong></div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    metrics.workoutCompletion >= 80 ? 'bg-green-600' :
                    metrics.workoutCompletion >= 50 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${metrics.workoutCompletion}%` }}
                />
              </div>
            </div>
          </div>

          {/* Sleep Average Card */}
          <div className={`bg-white rounded-lg shadow-lg p-6 border-r-4 ${
            metrics.sleepAverage >= 8 ? 'border-green-500' :
            metrics.sleepAverage >= 6 ? 'border-yellow-500' :
            'border-red-500'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">😴 ממוצע שעות שינה</h3>
            </div>
            
            <div className="text-center">
              <div className={`text-6xl font-bold mb-4 ${
                metrics.sleepAverage >= 8 ? 'text-green-600' :
                metrics.sleepAverage >= 6 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {metrics.sleepAverage > 0 ? metrics.sleepAverage.toFixed(1) : '—'}
              </div>
              
              <div className="text-gray-600 text-sm mb-4">
                {metrics.sleepAverage > 0 ? (
                  <>שעות לילה בממוצע</>
                ) : (
                  <span className="text-gray-400">לא דווח על שינה בתקופה זו</span>
                )}
              </div>

              {/* Color Legend */}
              {metrics.sleepAverage > 0 && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    {metrics.sleepAverage >= 8 ? (
                      <span className="text-green-600 font-bold">🟢 מעולה!</span>
                    ) : metrics.sleepAverage >= 6 ? (
                      <span className="text-yellow-600 font-bold">🟡 בינוני</span>
                    ) : (
                      <span className="text-red-600 font-bold">🔴 נמוך מדי</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2 border-t">
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

      {/* No Data State */}
      {metrics && metrics.totalWorkouts === 0 && metrics.sleepAverage === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center mt-6">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אין נתונים לתקופה זו</h2>
          <p className="text-gray-600">
            נסה לבחור טווח תאריכים אחר או בדוק שיש רשומות במערכת.
          </p>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
        >
          ← חזרה
        </button>
        {canViewOthers && (
          <button
            onClick={() => router.push('/coach/urgency')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            🚨 חזרה לדחיפות
          </button>
        )}
      </div>
    </div>
  )
}