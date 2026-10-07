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
        <div className="text-center bg-danger/15 border border-danger rounded-lg p-8 max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-danger mb-2">אין הרשאת גישה</h2>
          <p className="text-danger mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-danger text-on-accent rounded-lg hover:bg-danger/90 transition font-medium"
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
        
        <div className="bg-warning/15 border border-warning rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-bold text-fg mb-2">אין מתאמנים משויכים</h2>
          <p className="text-fg-3">
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
            <p className="text-fg-3 text-lg">ממוין מהדחוף ביותר לפחות דחוף</p>
          </div>
          
          {/* User role badge */}
          <div className="text-left">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
 activeUser?.Role === 'admin' 
 ? 'bg-info/10 text-info border border-info/30'
 : 'bg-accent/15 text-accent border border-accent'
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
        <div className="bg-surface rounded-lg p-6 border-r-4 border-line-strong">
          <div className="text-3xl font-bold text-fg">{athletes.length}</div>
          <div className="text-fg-3 mt-1">סה"כ מתאמנים</div>
        </div>
        <div className="bg-surface rounded-lg p-6 border-r-4 border-danger">
          <div className="text-3xl font-bold text-danger">{criticalCount}</div>
          <div className="text-fg-3 mt-1">🔴🔴 קריטי</div>
        </div>
        <div className="bg-surface rounded-lg p-6 border-r-4 border-danger">
          <div className="text-3xl font-bold text-danger">{highCount}</div>
          <div className="text-fg-3 mt-1">🔴 דחוף</div>
        </div>
        <div className="bg-surface rounded-lg p-6 border-r-4 border-warning">
          <div className="text-3xl font-bold text-warning">{mediumCount}</div>
          <div className="text-fg-3 mt-1">🟡 בינוני</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2.5 rounded-lg font-medium transition ${
 filter === 'all' 
 ? 'bg-accent text-on-accent ' 
 : 'bg-surface text-fg-2 hover:bg-surface/90 border border-line'
 }`}
        >
          הכל ({athletes.length})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-5 py-2.5 rounded-lg font-medium transition ${
 filter === 'critical' 
 ? 'bg-danger text-on-accent ' 
 : 'bg-surface text-fg-2 hover:bg-surface/90 border border-line'
 }`}
        >
          🔴🔴 קריטי ({criticalCount})
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-5 py-2.5 rounded-lg font-medium transition ${
 filter === 'high' 
 ? 'bg-danger text-on-accent ' 
 : 'bg-surface text-fg-2 hover:bg-surface/90 border border-line'
 }`}
        >
          🔴 דחוף ({criticalCount + highCount})
        </button>
        <button
          onClick={loadAthletes}
          className="mr-auto px-5 py-2.5 bg-surface border border-line rounded-lg hover:bg-surface/90 transition font-medium"
        >
          🔄 רענן
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-bold text-fg-3 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-fg-3 uppercase tracking-wider">
                  דחיפות
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-fg-3 uppercase tracking-wider">
                  מתאמן
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-fg-3 uppercase tracking-wider">
                  דגלים
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-fg-3 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-line">
              {filteredAthletes.map((athlete, index) => (
                <tr 
                  key={athlete.email}
                  className={`hover:bg-surface transition-colors ${
 athlete.urgencyLevel === 'critical' ? 'bg-danger/15' :
 athlete.urgencyLevel === 'high' ? 'bg-warning/15' :
 athlete.urgencyLevel === 'medium' ? 'bg-warning/15' : ''
 }`}
                >
                  {/* Index */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted font-medium">
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
                    <div className="text-sm font-semibold text-fg">{athlete.name}</div>
                    <div className="text-sm text-muted">{athlete.email}</div>
                  </td>

                  {/* Flags */}
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {athlete.flags.map((flag, i) => (
                        <div key={i} className="text-sm flex items-start gap-2">
                          <span className="flex-shrink-0 mt-0.5">
                            {getFlagIcon(flag.category)}
                          </span>
                          <span className="text-fg-2">{flag.message}</span>
                        </div>
                      ))}
                      {athlete.flags.length === 0 && (
                        <div className="text-sm text-success font-medium">
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
                        className="px-4 py-2 bg-accent text-on-accent text-sm rounded-lg hover:bg-accent-hover transition font-medium"
                      >
                        👁️ צפה
                      </button>
                      <button
                        onClick={() => {/* TODO: implement messaging */}}
                        className="px-4 py-2 bg-raised text-fg-2 text-sm rounded-lg hover:bg-raised/90 transition font-medium"
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
            <div className="text-xl font-medium text-fg-2 mb-2">
              אין מתאמנים בסינון זה
            </div>
            <div className="text-muted">
              {filter === 'critical' && 'אין מקרים קריטיים!'}
              {filter === 'high' && 'אין מקרים דחופים!'}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-surface rounded-lg p-6">
        <h3 className="font-bold text-lg mb-3">📊 מקרא:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium mb-1">😴 שינה</div>
            <div className="text-fg-3">{'<'} 6h = 🔴 | 6-8h = 🟡 | 8+h = 🟢</div>
          </div>
          <div>
            <div className="font-medium mb-1">⚡ חיוניות</div>
            <div className="text-fg-3">{'<'} 5 = 🔴 | 5-7 = 🟡 | 7+ = 🟢</div>
          </div>
          <div>
            <div className="font-medium mb-1">🤕 כאב</div>
            <div className="text-fg-3">{'>'} 4 = 🔴🔴 | {'>'} 3 = 🔴 | {'>'} 2 = 🟡</div>
          </div>
          <div>
            <div className="font-medium mb-1">🏃 פעילות</div>
            <div className="text-fg-3">7 ימים = 🔴 | 4 ימים = 🟡</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-line">
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