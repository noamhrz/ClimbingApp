'use client'

// Keeps a per-user page in step with the trainee selected in the footer (the active user).
//  - On load: if the page was opened for a specific user (URL) that differs from the active
//    user, that user becomes the active one (when the logged-in user may view them).
//  - Afterwards: whenever the active user changes, onActiveChange(email) is called so the
//    page can navigate / reload for the new user.

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

export function useFollowActiveUser(pageEmail: string | null | undefined, onActiveChange: (email: string) => void) {
  const { activeUser, currentUser, availableUsers, switchToUser, switchToSelf, loading } = useAuth()
  const synced = useRef(false)
  const cb = useRef(onActiveChange)
  useEffect(() => { cb.current = onActiveChange })

  const activeEmail = activeUser?.Email
  useEffect(() => {
    if (loading || !activeEmail) return
    if (!synced.current) {
      synced.current = true
      if (pageEmail && pageEmail !== activeEmail) {
        if (pageEmail === currentUser?.Email) { switchToSelf(); return }
        const target = availableUsers.find(u => u.Email === pageEmail)
        if (target) { switchToUser(target); return }
        cb.current(activeEmail) // not allowed to view that user: fall back to the active one
      }
      return
    }
    if (pageEmail !== activeEmail) cb.current(activeEmail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmail, loading])
}

/** Select a user for viewing everywhere in the app (the same as picking them in the footer). */
export function useSelectUser() {
  const { currentUser, availableUsers, switchToUser, switchToSelf } = useAuth()
  return (email: string) => {
    if (email === currentUser?.Email) return switchToSelf()
    const u = availableUsers.find(x => x.Email === email)
    if (u) switchToUser(u)
  }
}
