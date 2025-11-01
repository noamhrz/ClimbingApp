// app/exercises/page.tsx
// FIXED VERSION - without @supabase/auth-helpers-nextjs

import { redirect } from 'next/navigation'
import ExercisesClient from './ExercisesClient'

export const metadata = {
  title: 'ניהול תרגילים | ClimbingLog',
  description: 'ניהול ועריכת תרגילי כוח והתניה'
}

// This is now a client component that will handle auth checking
export default function ExercisesPage() {
  // Auth checking will be done in ExercisesClient
  return <ExercisesClientWrapper />
}

// Wrapper to handle the client-side auth
function ExercisesClientWrapper() {
  return <ExercisesClient />
}