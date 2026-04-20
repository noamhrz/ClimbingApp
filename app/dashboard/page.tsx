// app/dashboard/page.tsx - UPDATED: Days back instead of calendar weeks
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import TimeRangeSelector from '@/components/dashboard/TimeRangeSelector'
import StatsCards from '@/components/dashboard/StatsCards'
import WellnessChart from '@/components/dashboard/WellnessChart'
import ClimbingVolumeChart from '@/components/dashboard/ClimbingVolumeChart'
import ExerciseAmountChart from '@/components/dashboard/ExerciseAmountChart'
import MotivationalQuote from '@/components/dashboard/MotivationalQuote'
import WellnessModal from '@/components/dashboard/WellnessModal'
import { subDays, format, startOfWeek, endOfWeek, differenceInWeeks, eachDayOfInterval, eachWeekOfInterval, setHours, setMinutes, setSeconds, isBefore, startOfDay, endOfDay } from 'date-fns'

// WEEK CONFIGURATION - SUNDAY TO SATURDAY (for stats cards only)
const WEEK_STARTS_ON = 0 // 0 = Sunday, 6 = Saturday

export default function DashboardPage() {
  const { currentUser, activeUser } = useAuth()
  
  // Use activeUser if available, otherwise currentUser
  const userToShow = activeUser || currentUser
  
  const [timeRange, setTimeRange] = useState<'10days' | '6weeks' | '12weeks'>('10days') // ✅ CHANGED
  const [wellnessData, setWellnessData] = useState<any[]>([])
  const [climbingData, setClimbingData] = useState<any[]>([])
  const [exerciseData, setExerciseData] = useState<any[]>([])
  const [stats, setStats] = useState({
    completedThisWeek: 0,
    pendingThisWeek: 0,
    missedThisWeek: 0
  })
  const [loading, setLoading] = useState(true)
  
  const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false)
  const [hasFilledToday, setHasFilledToday] = useState(true)

  useEffect(() => {
    if (userToShow?.Email) {
      checkTodayWellness()
      loadAllData()
    }
  }, [userToShow?.Email, timeRange])

  const checkTodayWellness = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('WellnessLog')
        .select('WellnessID')
        .eq('Email', userToShow?.Email)
        .eq('Date', today)
        .maybeSingle()

      if (!data) {
        setHasFilledToday(false)
        // Show modal only when viewing own data (not when impersonating)
        if (userToShow?.Email === currentUser?.Email) {
          setIsWellnessModalOpen(true)
        }
      } else {
        setHasFilledToday(true)
      }
    } catch (error) {
      // Error handled silently
    }
  }

  // ✅ CHANGED: Days back from now instead of calendar weeks
  const getDateRange = () => {
    const now = new Date()
    
    let daysBack: number
    if (timeRange === '10days') {
      daysBack = 10
    } else if (timeRange === '6weeks') {
      daysBack = 42 // 6 weeks = 42 days
    } else {
      daysBack = 84 // 12 weeks = 84 days
    }
    
    const start = subDays(now, daysBack)
    // ✨ FIX: Use end of day to include all of today
    const end = endOfDay(now)
    return { start, end }
  }

  const getWeekLabel = (weekStart: Date, now: Date) => {
    const weeksDiff = differenceInWeeks(now, weekStart)
    if (weeksDiff === 0) return 'נוכחי'
    return `-${weeksDiff} week${weeksDiff > 1 ? 's' : ''}`
  }

  const loadAllData = async () => {
    setLoading(true)
    const dateRange = getDateRange()
    
    await Promise.all([
      loadWellnessData(dateRange),
      loadClimbingData(dateRange),
      loadExerciseData(dateRange),
      loadCalendarStats()
    ])
    
    setLoading(false)
  }

  // ✅ Stats cards still use calendar week (Sunday-Saturday)
  const loadCalendarStats = async () => {
    try {
      const now = new Date()
      
      let weekStart = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })
      let weekEnd = endOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })
      
      weekStart = setHours(setMinutes(setSeconds(weekStart, 0), 0), 0)
      weekEnd = setHours(setMinutes(setSeconds(weekEnd, 59), 59), 23)

      const { data: workouts, error } = await supabase
        .from('Calendar')
        .select('*')
        .eq('Email', userToShow?.Email)
        .gte('StartTime', weekStart.toISOString())
        .lte('StartTime', weekEnd.toISOString())

      if (error) return

      const completed: typeof workouts = []
      const pending: typeof workouts = []
      const missed: typeof workouts = []

      // ✨ FIX: Compare dates only, not times
      const todayStart = startOfDay(now)

      workouts?.forEach(w => {
        const workoutTime = new Date(w.StartTime)
        const workoutDay = startOfDay(workoutTime)
        
        if (w.Completed === true) {
          completed.push(w)
        } else {
          // ✨ Compare day-to-day: if workout day is BEFORE today (not including today)
          if (isBefore(workoutDay, todayStart)) {
            missed.push(w)
          } else {
            pending.push(w)
          }
        }
      })

      setStats({
        completedThisWeek: completed.length,
        pendingThisWeek: pending.length,
        missedThisWeek: missed.length
      })
    } catch (error) {
      // Error handled silently
    }
  }

  const loadWellnessData = async ({ start, end }: { start: Date, end: Date }) => {
    try {
      const { data, error } = await supabase
        .from('WellnessLog')
        .select('*')
        .eq('Email', userToShow?.Email)
        .gte('Date', format(start, 'yyyy-MM-dd'))
        .lte('Date', format(end, 'yyyy-MM-dd'))
        .order('Date')
      
      if (error) return
      
      const dataMap = new Map()
      data?.forEach(log => {
        const dateKey = format(new Date(log.Date), 'dd/MM')
        dataMap.set(dateKey, {
          sleep: log.SleepHours || 0,
          energy: log.VitalityLevel || 0,
          soreness: log.PainLevel || 0
        })
      })
      
      const allDays = eachDayOfInterval({ start, end })
      const chartData = allDays.map(day => {
        const dateKey = format(day, 'dd/MM')
        const existingData = dataMap.get(dateKey)
        
        return {
          date: dateKey,
          sleep: existingData?.sleep || 0,
          energy: existingData ? (existingData.energy ?? null) : null,
          soreness: existingData ? (existingData.soreness ?? null) : null,
        }
      })
      
      setWellnessData(chartData)
    } catch (error) {
      setWellnessData([])
    }
  }

  const loadClimbingData = async ({ start, end }: { start: Date, end: Date }) => {
    try {
      const { data, error } = await supabase
        .from('ClimbingLog')
        .select('LogDateTime, ClimbType, VolumeScore')
        .eq('Email', userToShow?.Email)
        .gte('LogDateTime', start.toISOString())
        .lte('LogDateTime', end.toISOString())
        .order('LogDateTime')
      
      if (error) return
      
      // ✅ CHANGED: Always group by days for 10 days, by weeks for longer periods
      const groupByDays = timeRange === '10days'
      const now = new Date()
      
      if (groupByDays) {
        const volumeMap = new Map<string, { lead: number, board: number, boulder: number }>()
        
        data?.forEach(log => {
          const dateKey = format(new Date(log.LogDateTime), 'dd/MM')
          if (!volumeMap.has(dateKey)) {
            volumeMap.set(dateKey, { lead: 0, board: 0, boulder: 0 })
          }
          
          const volumes = volumeMap.get(dateKey)!
          const volume = log.VolumeScore || 0
          const climbType = log.ClimbType?.toLowerCase() || ''
          
          if (climbType === 'lead') volumes.lead += volume
          else if (climbType === 'board') volumes.board += volume
          else if (climbType === 'boulder') volumes.boulder += volume
        })
        
        const allDays = eachDayOfInterval({ start, end })
        const chartData = allDays.map(day => {
          const dateKey = format(day, 'dd/MM')
          const volumes = volumeMap.get(dateKey) || { lead: 0, board: 0, boulder: 0 }
          return { date: dateKey, ...volumes }
        })
        
        setClimbingData(chartData)
      } else {
        const volumeMap = new Map<string, { lead: number, board: number, boulder: number, weekStart: Date }>()
        
        data?.forEach(log => {
          const logDate = new Date(log.LogDateTime)
          const weekStart = startOfWeek(logDate, { weekStartsOn: WEEK_STARTS_ON })
          const weekKey = format(weekStart, 'yyyy-MM-dd')
          
          if (!volumeMap.has(weekKey)) {
            volumeMap.set(weekKey, { lead: 0, board: 0, boulder: 0, weekStart })
          }
          
          const volumes = volumeMap.get(weekKey)!
          const volume = log.VolumeScore || 0
          const climbType = log.ClimbType?.toLowerCase() || ''
          
          if (climbType === 'lead') volumes.lead += volume
          else if (climbType === 'board') volumes.board += volume
          else if (climbType === 'boulder') volumes.boulder += volume
        })
        
        const allWeeks = eachWeekOfInterval({ start, end }, { weekStartsOn: WEEK_STARTS_ON })
        const chartData = allWeeks.map(weekStart => {
          const weekKey = format(weekStart, 'yyyy-MM-dd')
          const volumes = volumeMap.get(weekKey) || { lead: 0, board: 0, boulder: 0, weekStart }
          return {
            date: getWeekLabel(weekStart, now),
            lead: volumes.lead,
            board: volumes.board,
            boulder: volumes.boulder
          }
        })
        
        setClimbingData(chartData)
      }
    } catch (error) {
      setClimbingData([])
    }
  }

  const loadExerciseData = async ({ start, end }: { start: Date, end: Date }) => {
    try {
      const { data, error } = await supabase
        .from('Calendar')
        .select('StartTime')
        .eq('Email', userToShow?.Email)
        .eq('Completed', true)
        .gte('StartTime', start.toISOString())
        .lte('StartTime', end.toISOString())
        .order('StartTime')

      if (error) return

      const groupByDays = timeRange === '10days'
      const now = new Date()

      if (groupByDays) {
        const countMap = new Map<string, number>()
        data?.forEach(w => {
          const dateKey = format(new Date(w.StartTime), 'dd/MM')
          countMap.set(dateKey, (countMap.get(dateKey) || 0) + 1)
        })
        const allDays = eachDayOfInterval({ start, end })
        setExerciseData(allDays.map(day => ({
          date: format(day, 'dd/MM'),
          count: countMap.get(format(day, 'dd/MM')) || 0,
        })))
      } else {
        const countMap = new Map<string, { count: number, weekStart: Date }>()
        data?.forEach(w => {
          const weekStart = startOfWeek(new Date(w.StartTime), { weekStartsOn: WEEK_STARTS_ON })
          const weekKey = format(weekStart, 'yyyy-MM-dd')
          if (!countMap.has(weekKey)) countMap.set(weekKey, { count: 0, weekStart })
          countMap.get(weekKey)!.count += 1
        })
        const allWeeks = eachWeekOfInterval({ start, end }, { weekStartsOn: WEEK_STARTS_ON })
        setExerciseData(allWeeks.map(weekStart => {
          const weekKey = format(weekStart, 'yyyy-MM-dd')
          return {
            date: getWeekLabel(weekStart, now),
            count: countMap.get(weekKey)?.count || 0,
          }
        }))
      }
    } catch (error) {
      setExerciseData([])
    }
  }

  const handleWellnessSave = () => {
    setHasFilledToday(true)
    loadAllData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-xl text-gray-600">טוען Dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-blue-600">
              📊 Dashboard - {userToShow?.Name}
            </h1>
            
            {/* Show wellness button only when viewing own data */}
            {userToShow?.Email === currentUser?.Email && (
              <button
                onClick={() => setIsWellnessModalOpen(true)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span className="text-xl">+</span>
                <span>Wellness</span>
              </button>
            )}
          </div>
          
          <TimeRangeSelector 
            selected={timeRange} 
            onChange={setTimeRange} 
          />
          
          <p className="text-sm text-gray-600 mt-2 text-center">
            {timeRange === '10days' ? '📅 תצוגה לפי ימים' : '📅 תצוגה לפי שבועות'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <StatsCards stats={stats} />

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            🧗 Climbing Volume
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            🟣 הובלה  •  🟡 בורד  •  🟤 בולדר
          </p>
          <ClimbingVolumeChart data={climbingData} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start justify-between mb-4" dir="rtl">
            <h2 className="text-xl font-bold text-gray-800">💚 Wellness</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500 text-right">
              <span className="font-semibold text-red-500 col-span-1">🤕 כאב</span>
              <span className="font-semibold text-green-500 col-span-1">⚡ אנרגיה</span>
              <span>0 — ללא כאב 🟢</span>
              <span>0 — אין כוח לכלום 😴</span>
              <span>1 — כאב קל, להתאמן 🟡</span>
              <span>1 — תנועה קלה 🐢</span>
              <span>2 — בינוני, התאוששות 🟠</span>
              <span>2 — אימון משמעותי 💪</span>
              <span>3 — חזק, לטפל ולנוח 🔴</span>
              <span>3 — לפרק את הקיר! 🔥</span>
            </div>
          </div>
          <WellnessChart data={wellnessData} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            ✅ אימונים שבוצעו
          </h2>
          <ExerciseAmountChart data={exerciseData} />
        </div>

        <MotivationalQuote />
      </div>

      {/* Show wellness modal only when viewing own data */}
      {userToShow?.Email === currentUser?.Email && (
        <WellnessModal
          isOpen={isWellnessModalOpen}
          onClose={() => setIsWellnessModalOpen(false)}
          currentUser={currentUser}
          onSave={handleWellnessSave}
        />
      )}
    </div>
  )
}