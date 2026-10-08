'use client'

// "Today's workouts" card for the dashboard.
// Read-only: Calendar rows for today + workout names + the trainee's personal
// coach note from the assignment (WorkoutsForUser).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { startOfDay, endOfDay } from 'date-fns'
import { LuCalendarDays, LuCircleCheck, LuHourglass, LuMessageSquare, LuPlay, LuEye, LuSunMedium } from 'react-icons/lu'
import { Skeleton } from '@/components/ui/Skeleton'

type TodayItem = {
  calendarId: number
  workoutId: number
  name: string
  completed: boolean
  deloading: boolean
  note: string
}

export default function TodayWorkouts({ email }: { email?: string }) {
  const [items, setItems] = useState<TodayItem[] | null>(null)

  useEffect(() => {
    if (!email) return
    let cancelled = false

    const load = async () => {
      const now = new Date()
      const { data: rows, error } = await supabase
        .from('Calendar')
        .select('CalendarID, WorkoutID, StartTime, Completed, Deloading, Order')
        .eq('Email', email)
        .gte('StartTime', startOfDay(now).toISOString())
        .lte('StartTime', endOfDay(now).toISOString())
        .order('StartTime')

      if (error || !rows || rows.length === 0) {
        if (!cancelled) setItems([])
        return
      }

      const ids = [...new Set(rows.map(r => r.WorkoutID))]
      const [{ data: workouts }, { data: assigned }] = await Promise.all([
        supabase.from('Workouts').select('WorkoutID, Name').in('WorkoutID', ids),
        supabase.from('WorkoutsForUser').select('WorkoutID, Notes, CoachNote').eq('Email', email).in('WorkoutID', ids),
      ])

      const nameById = new Map((workouts || []).map(w => [w.WorkoutID, w.Name as string]))
      const noteById = new Map(
        (assigned || []).map(a => [a.WorkoutID, ((a.Notes || a.CoachNote || '') as string).trim()])
      )

      const sorted = [...rows].sort((a, b) => {
        const ao = a.Order ?? Number.MAX_SAFE_INTEGER
        const bo = b.Order ?? Number.MAX_SAFE_INTEGER
        return ao !== bo ? ao - bo : new Date(a.StartTime).getTime() - new Date(b.StartTime).getTime()
      })

      if (!cancelled) {
        setItems(sorted.map(r => ({
          calendarId: r.CalendarID,
          workoutId: r.WorkoutID,
          name: nameById.get(r.WorkoutID) || `Workout #${r.WorkoutID}`,
          completed: !!r.Completed,
          deloading: !!r.Deloading,
          note: noteById.get(r.WorkoutID) || '',
        })))
      }
    }

    load()
    return () => { cancelled = true }
  }, [email])

  return (
    <section className="bg-surface border border-line rounded-xl p-4 md:p-6" dir="rtl">
      <h2 className="text-xl font-bold text-fg mb-4 flex items-center gap-2">
        <LuCalendarDays aria-hidden className="w-5 h-5 shrink-0 text-accent" />
        האימונים שלך להיום
      </h2>

      {items === null && (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
        </div>
      )}

      {items && items.length === 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-muted flex items-center gap-2">
            <LuSunMedium aria-hidden className="w-5 h-5 text-warning" />
            אין אימונים מתוכננים להיום
          </p>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full border border-line-strong text-fg-2 hover:border-fg-3 hover:text-fg text-sm font-semibold transition-colors"
          >
            ללוח האימונים
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.calendarId} className="bg-raised border border-line rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold text-fg truncate">{item.name}</p>
                  <p className={`text-sm flex items-center gap-1.5 mt-0.5 ${item.completed ? 'text-success' : 'text-warning'}`}>
                    {item.completed
                      ? <><LuCircleCheck aria-hidden className="w-4 h-4" />בוצע</>
                      : <><LuHourglass aria-hidden className="w-4 h-4" />מחכה לך היום</>}
                    {item.deloading && <span className="text-info ms-2">· דילודינג</span>}
                  </p>
                </div>
                <Link
                  href={`/workout/${item.workoutId}?calendar=${item.calendarId}`}
                  className={`inline-flex items-center gap-1.5 min-h-11 px-5 rounded-full font-bold transition-colors ${
                    item.completed
                      ? 'border border-line-strong text-fg-2 hover:border-fg-3 hover:text-fg'
                      : 'bg-accent text-on-accent hover:bg-accent-hover'
                  }`}
                >
                  {item.completed
                    ? <><LuEye aria-hidden className="w-4 h-4" />צפה באימון</>
                    : <><LuPlay aria-hidden className="w-4 h-4" />התחל אימון</>}
                </Link>
              </div>

              {item.note && (
                <div className="mt-3 p-3 bg-warning/10 border border-warning/40 rounded-lg">
                  <p className="text-xs font-semibold text-warning mb-1 flex items-center gap-1.5">
                    <LuMessageSquare aria-hidden className="w-3.5 h-3.5" />הערת המאמן:
                  </p>
                  <p className="text-sm text-fg-2 whitespace-pre-wrap">{item.note}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
