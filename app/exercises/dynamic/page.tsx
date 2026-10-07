'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { Exercise } from '@/types/exercises'

export default function DynamicExercisesPage() {
  const router = useRouter()
  const { activeUser, loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  const [userRole, setUserRole] = useState<'admin' | 'coach' | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && !activeUser) { router.push('/dashboard'); return }
      if (!activeEmail) return
      const { data: user } = await supabase.from('Users').select('Role').eq('Email', activeEmail).single()
      if (!user || (user.Role !== 'admin' && user.Role !== 'coach')) { router.push('/dashboard'); return }
      setUserRole(user.Role)
    }
    checkAuth()
  }, [authLoading, activeUser, activeEmail, router])

  useEffect(() => {
    if (!userRole) return
    supabase
      .from('Exercises')
      .select('*')
      .eq('is_dynamic', true)
      .eq('Status', 'Active')
      .order('Name')
      .then(({ data }) => {
        setExercises(data || [])
        setLoading(false)
      })
  }, [userRole])

  if (authLoading || !userRole) return null

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">🧩 תרגילים דינמיים</h1>
          <p className="text-muted mt-1">תרגילים המוגדרים לפי רמות רודמאפ</p>
        </div>
        <button
          onClick={() => router.push('/exercises')}
          className="text-sm text-accent hover:underline"
        >
          לניהול כל התרגילים ←
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-line">
          <p className="text-muted text-lg mb-2">אין תרגילים דינמיים עדיין</p>
          <p className="text-sm text-faint">צור תרגיל חדש עם הדגל "דינמי" מדף התרגילים</p>
          <button
            onClick={() => router.push('/exercises')}
            className="mt-4 px-4 py-2 bg-accent text-on-accent rounded-lg text-sm hover:bg-accent-hover"
          >
            עבור לניהול תרגילים
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((ex) => (
            <div
              key={ex.ExerciseID}
              className="bg-surface border border-line rounded-xl p-4 transition-shadow cursor-pointer"
              onClick={() => router.push(`/exercises/dynamic/${ex.ExerciseID}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-fg leading-tight">{ex.Name}</h3>
                <span className="shrink-0 text-xs bg-success/15 text-success px-2 py-0.5 rounded-full">
                  🧩 דינמי
                </span>
              </div>
              {ex.Category && (
                <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                  {ex.Category}
                </span>
              )}
              {ex.Description && (
                <p className="text-sm text-muted mt-2 line-clamp-2">{ex.Description}</p>
              )}
              <button
                className="mt-3 w-full text-sm text-accent border border-accent rounded-lg py-1.5 hover:bg-accent/15 transition-colors"
                onClick={(e) => { e.stopPropagation(); router.push(`/exercises/dynamic/${ex.ExerciseID}`) }}
              >
                פתח עורך ←
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
