// app/workouts-editor/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import WorkoutsList from '@/components/workouts/WorkoutsList'

export default function WorkoutsEditorPage() {
  const router = useRouter()
  const { loading: authLoading, currentUser } = useAuth()
  const signedInEmail = currentUser?.Email
  const [userRole, setUserRole] = useState<'admin' | 'coach' | null>(null)

  useEffect(() => {
    // permissions follow the signed-in coach, not the trainee being viewed
    const checkAuth = async () => {
      if (!authLoading && !currentUser) {
        router.push('/dashboard')
        return
      }
      if (!signedInEmail) return

      const { data: user } = await supabase
        .from('Users')
        .select('Role')
        .eq('Email', signedInEmail)
        .single()

      if (!user || (user.Role !== 'admin' && user.Role !== 'coach')) {
        router.push('/dashboard')
        return
      }

      setUserRole(user.Role)
    }
    checkAuth()
  }, [authLoading, currentUser, signedInEmail, router])

  if (!userRole) return null

  return (
    <>
      <WorkoutsList />
    </>
  )
}