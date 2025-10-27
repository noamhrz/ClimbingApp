'use client'

import { useRouter } from 'next/navigation'
import { useUserContext } from '@/context/UserContext'

export default function AdminFooter() {
  const { clearUser, selectedUser } = useUserContext()
  const router = useRouter()

  const handleSwitchUser = () => {
    clearUser()
    router.push('/')
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-100 text-sm py-2 px-4 flex justify-between items-center shadow-md z-50">
      <div>
        {selectedUser ? (
          <span>
            👤 משתמש פעיל: <strong>{selectedUser.Name}</strong>{' '}
            <span className="text-blue-300">({selectedUser.userEmail})</span>
          </span>
        ) : (
          <span>אין משתמש פעיל</span>
        )}
      </div>

      <button
        onClick={handleSwitchUser}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
      >
        החלף משתמש
      </button>
    </footer>
  )
}
