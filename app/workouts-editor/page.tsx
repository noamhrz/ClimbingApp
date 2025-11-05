// app/workouts-editor/page.tsx
'use client'

import { useEffect } from 'react'
import WorkoutsList from '@/components/workouts/WorkoutsList'

export default function WorkoutsEditorPage() {
  useEffect(() => {
    console.log('🎯 WorkoutsEditorPage loaded - URL:', window.location.href)
  }, [])

  return (
    <>
      <WorkoutsList />
    </>
  )
}