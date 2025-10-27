'use client'

import Link from 'next/link'
import { useUserContext } from '@/context/UserContext'

export default function UserHeader() {
  const { selectedUser, clearUser } = useUserContext()

  if (!selectedUser) return null

  return (
    <header className="flex justify-between items-center bg-blue-600 text-white px-6 py-3 shadow">
      <div>
        <p className="font-semibold">משתמש פעיל:</p>
        <p>
          {selectedUser.Name}{' '}
          <span className="text-blue-200 text-sm">({selectedUser.userEmail})</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="bg-white text-blue-700 font-semibold px-3 py-1 rounded hover:bg-blue-100 transition"
        >
          דשבורד
        </Link>
        <Link
          href="/calendar"
          className="bg-white text-blue-700 font-semibold px-3 py-1 rounded hover:bg-blue-100 transition"
        >
          לוח אימונים
        </Link>
        <button
          onClick={clearUser}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded"
        >
          החלף משתמש
        </button>
      </div>
    </header>
  )
}
