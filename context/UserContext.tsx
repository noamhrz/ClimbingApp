'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type User = {
  UserID: number
  Name: string
  Email: string
  Role?: string
  Status?: string
  userEmail?: string // alias נוח לשימוש בקוד
}

type UserContextType = {
  selectedUser: User | null
  setSelectedUser: (user: User | null) => void
  clearUser: () => void
}

const UserContext = createContext<UserContextType>({
  selectedUser: null,
  setSelectedUser: () => {},
  clearUser: () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [selectedUser, setSelectedUserState] = useState<User | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('selectedUser')
    if (saved) {
      try {
        setSelectedUserState(JSON.parse(saved))
      } catch {
        localStorage.removeItem('selectedUser')
      }
    }
  }, [])

  const setSelectedUser = (user: User | null) => {
    if (user) {
      const normalized = { ...user, userEmail: user.Email }
      setSelectedUserState(normalized)
      localStorage.setItem('selectedUser', JSON.stringify(normalized))
    } else {
      setSelectedUserState(null)
      localStorage.removeItem('selectedUser')
    }
  }

  const clearUser = () => {
    setSelectedUserState(null)
    localStorage.removeItem('selectedUser')
  }

  return (
    <UserContext.Provider value={{ selectedUser, setSelectedUser, clearUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUserContext = () => useContext(UserContext)
