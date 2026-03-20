// app/coach/urgency/page.tsx
// 🚨 טבלת דחיפות מתאמנים - ממוין מהדחוף ביותר
// ✅ עם הרשאות: Admin רואה הכל, Coach רק את שלו

'use client'

import { useEffect, useState } from 'react'
import { getAthletesByUrgency, getUrgencyIcon, getUrgencyColor, getFlagIcon } from '@/lib/urgency-checker'
import type { AthleteUrgency } from '@/lib/urgency-checker'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function UrgencyDashboard() {
  const { activeUser, currentUser, loading: authLoading } = useAuth()
  const [athletes, setAthletes] = useState<AthleteUrgency[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && activeUser) {
      loadAthletes()
    }
  }, [authLoading, activeUser])

  const loadAthletes = async () => {
    if (!activeUser?.Email) {
      setError('אין משתמש פעיל')
      setLoading(false)
      return
    }
    
    // ✅ Check permissions
    if (activeUser.Role !== 'admin' && activeUser.Role !== 'coach') {
      setError('אין לך הרשאה לצפות בדף זה')
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getAthletesByUrgency(activeUser.Email, activeUser.Role)
      setAthletes(data)
    } catch (error) {
      console.error('❌ Error loading athletes:', error)
      setError(error instanceof Error ? error.message : 'שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }

  const filteredAthletes = athletes.filter(a => {
    if (filter === 'all') return true
    if (filter === 'critical') return a.urgencyLevel === 'critical'
    if (filter === 'high') return a.urgencyLevel === 'critical' || a.urgencyLevel === 'high'
    return true
  })

  const criticalCount = athletes.filter(a => a.urgencyLevel === 'critical').length
  const highCount = athletes.filter(a => a.urgencyLevel === 'high').length
  const mediumCount = athletes.filter(a => a.urgencyLevel === 'medium').length

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-xl">טוען נתוני דחיפות...</div>
        </div>
      </div>
    )
  }

  // Error state - No permission
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">אין הרשאת גישה</h2>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    )
  }

  // No athletes assigned
  if (athletes.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6" dir="rtl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            🚨 טבלת דחיפות מתאמנים
          </h1>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אין מתאמנים משויכים</h2>
          <p className="text-gray-600">
            {activeUser?.Role === 'coach' 
              ? 'עדיין לא שויכו אליך מתאמנים. פנה למנהל המערכת.'
              : 'אין משתמשים במערכת.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              🚨 טבלת דחיפות מתאמנים
            </h1>
            <p className="text-gray-600 text-lg">ממוין מהדחוף ביותר לפחות דחוף</p>
          </div>
          
          {/* User role badge */}
          <div className="text-left">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              activeUser?.Role === 'admin' 
                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              <span className="text-xl">
                {activeUser?.Role === 'admin' ? '👑' : '🎓'}
              </span>
              <div>
                <div className="text-xs opacity-75">מחובר כ</div>
                <div className="font-bold">
                  {activeUser?.Role === 'admin' ? 'מנהל' : activeUser?.Role === 'coach' ? 'מאמן' : 'משתמש'}
                </div>
                {activeUser?.Email && (
                  <div className="text-xs opacity-60">{activeUser.Email}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-gray-400">
          <div className="text-3xl font-bold text-gray-800">{athletes.length}</div>
          <div className="text-gray-600 mt-1">סה"כ מתאמנים</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-red-600">
          <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-gray-600 mt-1">🔴🔴 קריטי</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-red-500">
          <div className="text-3xl font-bold text-red-500">{highCount}</div>
          <div className="text-gray-600 mt-1">🔴 דחוף</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-r-4 border-yellow-500">
          <div className="text-3xl font-bold text-yellow-600">{mediumCount}</div>
          <div className="text-gray-600 mt-1">🟡 בינוני</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2.5 rounded-lg font-medium transition shadow-sm ${
            filter === 'all' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          הכל ({athletes.length})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-5 py-2.5 rounded-lg font-medium transition shadow-sm ${
            filter === 'critical' 
              ? 'bg-red-600 text-white shadow-md' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          🔴🔴 קריטי ({criticalCount})
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-5 py-2.5 rounded-lg font-medium transition shadow-sm ${
            filter === 'high' 
              ? 'bg-red-500 text-white shadow-md' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          🔴 דחוף ({criticalCount + highCount})
        </button>
        <button
          onClick={loadAthletes}
          className="mr-auto px-5 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
        >
          🔄 רענן
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  דחיפות
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  מתאמן
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  דגלים
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAthletes.map((athlete, index) => (
                <tr 
                  key={athlete.email}
                  className={`hover:bg-gray-50 transition-colors ${
                    athlete.urgencyLevel === 'critical' ? 'bg-red-50' :
                    athlete.urgencyLevel === 'high' ? 'bg-orange-50' :
                    athlete.urgencyLevel === 'medium' ? 'bg-yellow-50' : ''
                  }`}
                >
                  {/* Index */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {index + 1}
                  </td>

                  {/* Urgency Icon */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getUrgencyIcon(athlete.urgencyLevel)}</span>
                    </div>
                  </td>

                  {/* Name & Email */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{athlete.name}</div>
                    <div className="text-sm text-gray-500">{athlete.email}</div>
                  </td>

                  {/* Flags */}
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {athlete.flags.map((flag, i) => (
                        <div key={i} className="text-sm flex items-start gap-2">
                          <span className="flex-shrink-0 mt-0.5">
                            {getFlagIcon(flag.category)}
                          </span>
                          <span className="text-gray-700">{flag.message}</span>
                        </div>
                      ))}
                      {athlete.flags.length === 0 && (
                        <div className="text-sm text-green-600 font-medium">
                          🟢 הכל תקין!
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/athlete-stats/${athlete.email}`)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                      >
                        👁️ צפה
                      </button>
                      <button
                        onClick={() => {/* TODO: implement messaging */}}
                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition shadow-sm font-medium"
                      >
                        💬
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredAthletes.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-xl font-medium text-gray-700 mb-2">
              אין מתאמנים בסינון זה
            </div>
            <div className="text-gray-500">
              {filter === 'critical' && 'אין מקרים קריטיים!'}
              {filter === 'high' && 'אין מקרים דחופים!'}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="font-bold text-lg mb-3">📊 מקרא:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium mb-1">😴 שינה</div>
            <div className="text-gray-600">{'<'} 6h = 🔴 | 6-8h = 🟡 | 8+h = 🟢</div>
          </div>
          <div>
            <div className="font-medium mb-1">⚡ חיוניות</div>
            <div className="text-gray-600">{'<'} 5 = 🔴 | 5-7 = 🟡 | 7+ = 🟢</div>
          </div>
          <div>
            <div className="font-medium mb-1">🤕 כאב</div>
            <div className="text-gray-600">{'>'} 4 = 🔴🔴 | {'>'} 3 = 🔴 | {'>'} 2 = 🟡</div>
          </div>
          <div>
            <div className="font-medium mb-1">🏃 פעילות</div>
            <div className="text-gray-600">7 ימים = 🔴 | 4 ימים = 🟡</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔴🔴</span>
              <span>קריטי - יש דגל critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔴</span>
              <span>דחוף - יש דגל אדום</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🟡</span>
              <span>בינוני - רק דגלים צהובים</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🟢</span>
              <span>תקין - הכל ירוק</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}