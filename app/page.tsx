'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { getRoleConfig } from '@/lib/permissions'

type User = {
  UserID: number
  Name: string
  Email: string
  Role: string
}

export default function HomePage() {
  const router = useRouter()
  const { login, currentUser, logout } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('Users')
          .select('UserID, Name, Email, Role')
          .order('Name', { ascending: true })

        if (error) throw error
        setUsers(data || [])
      } catch (err: any) {
        console.error('❌ שגיאה בשליפת משתמשים:', err)
        setError('שגיאה בטעינת המשתמשים')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleSelectUser = async (user: User) => {
    try {
      await login(user.Email)
      router.push('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      alert('שגיאה בהתחברות')
    }
  }

  const handleLogout = () => {
    logout()
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">טוען משתמשים...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-500 font-semibold">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mb-8 text-center">
        <div className="text-6xl mb-4">🧗</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Climbing Training
        </h1>
        <p className="text-gray-600">בחר משתמש להתחברות</p>
        
        {currentUser && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              מחובר כ: <strong>{currentUser.Name}</strong>
            </p>
            <button
              onClick={handleLogout}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              התנתק והחלף משתמש
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-6">
        {users.length === 0 ? (
          <p className="text-center text-gray-500">לא נמצאו משתמשים.</p>
        ) : (
          <ul className="space-y-3">
            {users.map((u) => {
              const config = getRoleConfig(u.Role as any)
              const isCurrentUser = currentUser?.Email === u.Email
              
              return (
                <li
                  key={u.UserID}
                  onClick={() => handleSelectUser(u)}
                  className={`cursor-pointer border-2 p-4 rounded-xl transition-all group ${
                    isCurrentUser
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-blue-50 hover:border-blue-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{config.icon}</span>
                    
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-700">
                        {u.Name}
                      </div>
                      <div className="text-sm text-gray-500">{u.Email}</div>
                    </div>
                    
                    <div className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
                      {config.label}
                    </div>
                    
                    {isCurrentUser && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        מחובר
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-6 max-w-md w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
        💡 <strong>למפתחים:</strong> זהו login פשוט ללא סיסמה. בפרודקשן צריך אימות אמיתי!
      </div>
    </div>
  )
}