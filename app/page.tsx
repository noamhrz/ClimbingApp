'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUserContext } from '@/context/UserContext'
import UserHeader from '@/components/UserHeader'


type User = {
  UserID: number
  Name: string
  Email: string
}

export default function HomePage() {
  const router = useRouter()
  const { setSelectedUser } = useUserContext()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('Users')
          .select('UserID, Name, Email')
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

  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    router.push('/dashboard')
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">בחר משתמש</h1>

      <div className="w-full max-w-sm bg-white shadow-lg rounded-lg p-6">
        {users.length === 0 ? (
          <p className="text-center text-gray-500">לא נמצאו משתמשים.</p>
        ) : (
          <ul className="space-y-3">
            {users.map((u) => (
              <li
                key={u.UserID}
                onClick={() => handleSelectUser(u)}
                className="cursor-pointer border border-gray-200 p-3 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition"
              >
                <div className="font-medium text-gray-800">{u.Name}</div>
                <div className="text-sm text-gray-500">{u.Email}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
