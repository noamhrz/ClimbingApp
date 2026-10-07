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
    <footer className="fixed bottom-0 left-0 right-0 bg-bg text-fg text-sm py-2 px-4 flex justify-between items-center shadow-md z-50">
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
        className="bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded text-xs"
      >
        החלף משתמש
      </button>
    </footer>
  )
}
