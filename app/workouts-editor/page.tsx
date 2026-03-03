// app/workouts-editor/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import WorkoutsList from '@/components/workouts/WorkoutsList'

export default function WorkoutsEditorPage() {
  const router = useRouter()
  const { activeUser, loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  const [userRole, setUserRole] = useState<'admin' | 'coach' | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && !activeUser) {
        router.push('/dashboard')
        return
      }
      if (!activeEmail) return

      const { data: user } = await supabase
        .from('Users')
        .select('Role')
        .eq('Email', activeEmail)
        .single()

      if (!user || (user.Role !== 'admin' && user.Role !== 'coach')) {
        router.push('/dashboard')
        return
      }

      setUserRole(user.Role)
    }
    checkAuth()
  }, [authLoading, activeUser, activeEmail, router])

  if (!userRole) return null

  return (
    <>
      <WorkoutsList />
    </>
  )
}