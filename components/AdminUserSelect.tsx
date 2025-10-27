'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUserContext } from '@/context/UserContext'

type UserRow = {
  Email: string
  Name: string
}

export default function AdminUserSelect() {
  const { selectedUser, setSelectedUser } = useUserContext()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const isAdmin = true // DEV בלבד

  // שליפת רשימת המשתמשים מהטבלה
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('Users')
        .select('Email, Name')
        .order('Name')

      if (!error && data) setUsers(data)
      else console.error('שגיאה בשליפת משתמשים:', error)

      setLoading(false)
    }

    fetchUsers()
  }, [])

  if (!isAdmin) return null

  // שינוי משתמש נבחר
  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const email = e.target.value
    const user = users.find((u) => u.Email === email) || null
    console.log('🟩 משתמש נבחר:', user)
    setSelectedUser(user ? { email: user.Email, name: user.Name } : null)
  }

  return (
    <div className="fixed top-2 right-4 bg-white border rounded-lg shadow p-2 z-50">
      <label className="text-xs text-gray-600 mr-2">הצג כמשתמש:</label>
      <select
        className="border rounded p-1 text-sm"
        disabled={loading}
        value={selectedUser?.email ?? ''}
        onChange={handleUserChange}
      >
        <option value="">בחר משתמש</option>
        {users.map((u) => (
          <option key={u.Email} value={u.Email}>
            {u.Name}
          </option>
        ))}
      </select>
    </div>
  )
}
