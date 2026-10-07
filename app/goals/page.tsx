// app/goals/page.tsx
// 🎯 Goals - User Selection Page (for admin/coach)
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getUsersForGoals } from '@/lib/goals-api'

interface User {
  Email: string
  Name: string
}

export default function GoalsPage() {
  const { activeUser, currentUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && activeUser) {
      loadUsers()
    }
  }, [authLoading, activeUser])

  const loadUsers = async () => {
    if (!activeUser) return

    // If regular user, redirect directly to their goals
    if (activeUser.Role === 'user') {
      router.push(`/goals/${activeUser.Email}`)
      return
    }

    setLoading(true)
    const usersList = await getUsersForGoals(activeUser.Email, activeUser.Role)
    setUsers(usersList)
    setLoading(false)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-xl">טוען...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🎯 הגדרת יעדים</h1>
        <p className="text-fg-3 text-lg">בחר משתמש לעריכת יעדים</p>
      </div>

      {/* User Role Badge */}
      {activeUser && (
        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
 activeUser.Role === 'admin'
 ? 'bg-info/10 text-info border border-info/30'
 : 'bg-accent/15 text-accent border border-accent'
 }`}>
            <span className="text-xl">
              {activeUser.Role === 'admin' ? '👑' : '🎓'}
            </span>
            <div>
              <div className="text-xs opacity-75">מחובר כ</div>
              <div className="font-bold">
                {activeUser.Role === 'admin' ? 'מנהל' : 'מאמן'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      {users.length === 0 ? (
        <div className="bg-warning/15 border border-warning rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-fg mb-2">אין משתמשים</h2>
          <p className="text-fg-3">
            {activeUser?.Role === 'coach'
              ? 'עדיין לא שויכו אליך מתאמנים'
              : 'אין משתמשים במערכת'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user) => (
            <button
              key={user.Email}
              onClick={() => router.push(`/goals/${encodeURIComponent(user.Email)}`)}
              className="bg-surface border-2 border-line rounded-xl p-6 hover:border-accent transition-all text-right"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">👤</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-fg">{user.Name}</div>
                  <div className="text-sm text-muted">{user.Email}</div>
                </div>
                <div className="text-2xl text-accent">→</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}