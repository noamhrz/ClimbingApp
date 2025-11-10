// app/dashboard/page.tsx - SINGLE COLUMN LAYOUT
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
import { subDays, format, startOfWeek, differenceInWeeks, eachDayOfInterval, eachWeekOfInterval } from 'date-fns'

export default function DashboardPage() {
  const { currentUser } = useAuth()
  
  const [timeRange, setTimeRange] = useState<'week' | '6weeks' | '12weeks'>('week')
  const [wellnessData, setWellnessData] = useState<any[]>([])
  const [climbingData, setClimbingData] = useState<any[]>([])
  const [exerciseData, setExerciseData] = useState<any[]>([])
  const [stats, setStats] = useState({
    planned: 0,
    thisWeek: 0,
    completed: 0,
    keyWorkouts: 0,
    assigned: 0
  })
  const [loading, setLoading] = useState(true)
  
  const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false)
  const [hasFilledToday, setHasFilledToday] = useState(true)

  useEffect(() => {
    if (currentUser?.Email) {
      checkTodayWellness()
      loadAllData()
    }
  }, [currentUser, timeRange])

  const checkTodayWellness = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('WellnessLog')
        .select('WellnessID')
        .eq('Email', currentUser?.Email)
        .eq('Date', today)
        .maybeSingle()

      if (!data) {
        setHasFilledToday(false)
        setIsWellnessModalOpen(true)
      } else {
        setHasFilledToday(true)
      }
    } catch (error) {
      console.error('Error checking today wellness:', error)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    const days = timeRange === 'week' ? 7 : timeRange === '6weeks' ? 42 : 84
    const start = subDays(now, days - 1)
    return { start, end: now }
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
      loadStats()
    ])
    
    setLoading(false)
  }

  const loadWellnessData = async ({ start, end }: { start: Date, end: Date }) => {
    try {
      const { data, error } = await supabase
        .from('WellnessLog')
        .select('*')
        .eq('Email', currentUser?.Email)
        .gte('Date', format(start, 'yyyy-MM-dd'))
        .lte('Date', format(end, 'yyyy-MM-dd'))
        .order('Date')
      
      if (error) console.error('Wellness error:', error)
      
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
          energy: existingData?.energy || 0,
          soreness: existingData?.soreness || 0
        }
      })
      
      setWellnessData(chartData)
    } catch (error) {
      console.error('Error loading wellness data:', error)
      setWellnessData([])
    }
  }

  const loadClimbingData = async ({ start, end }: { start: Date, end: Date }) => {
    try {
      const { data, error } = await supabase
        .from('ClimbingLog')
        .select('LogDateTime, ClimbType, VolumeScore')
        .eq('Email', currentUser?.Email)
        .gte('LogDateTime', start.toISOString())
        .lte('LogDateTime', end.toISOString())
        .order('LogDateTime')
      
      if (error) console.error('Climbing error:', error)
      
      const groupByDays = timeRange === 'week'
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
          const weekStart = startOfWeek(logDate, { weekStartsOn: 1 })
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
        
        const allWeeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
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
      console.error('Error loading climbing data:', error)
      setClimbingData([])
    }
  }

  const loadExerciseData = async ({ start, end }: { start: Date, end: Date }) => {
    try {
      const { data, error } = await supabase
        .from('ExerciseLogs')
        .select('CreatedAt, RepsDone, WeightKG, DurationSec')
        .eq('Email', currentUser?.Email)
        .gte('CreatedAt', start.toISOString())
        .lte('CreatedAt', end.toISOString())
        .order('CreatedAt')
      
      if (error) console.error('Exercise error:', error)
      
      const groupByDays = timeRange === 'week'
      const now = new Date()
      
      if (groupByDays) {
        const volumeMap = new Map<string, number>()
        
        data?.forEach(log => {
          const dateKey = format(new Date(log.CreatedAt), 'dd/MM')
          let volume = 0
          
          if (log.DurationSec) {
            volume = log.DurationSec
          } else {
            const reps = log.RepsDone || 0
            const weight = log.WeightKG || 0
            volume = weight === 0 ? reps : reps * weight
          }
          
          volumeMap.set(dateKey, (volumeMap.get(dateKey) || 0) + volume)
        })
        
        const allDays = eachDayOfInterval({ start, end })
        const chartData = allDays.map(day => {
          const dateKey = format(day, 'dd/MM')
          return {
            date: dateKey,
            volume: Math.round(volumeMap.get(dateKey) || 0)
          }
        })
        
        setExerciseData(chartData)
      } else {
        const volumeMap = new Map<string, { volume: number, weekStart: Date }>()
        
        data?.forEach(log => {
          const logDate = new Date(log.CreatedAt)
          const weekStart = startOfWeek(logDate, { weekStartsOn: 1 })
          const weekKey = format(weekStart, 'yyyy-MM-dd')
          
          let volume = 0
          if (log.DurationSec) {
            volume = log.DurationSec
          } else {
            const reps = log.RepsDone || 0
            const weight = log.WeightKG || 0
            volume = weight === 0 ? reps : reps * weight
          }
          
          if (!volumeMap.has(weekKey)) {
            volumeMap.set(weekKey, { volume: 0, weekStart })
          }
          volumeMap.get(weekKey)!.volume += volume
        })
        
        const allWeeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
        const chartData = allWeeks.map(weekStart => {
          const weekKey = format(weekStart, 'yyyy-MM-dd')
          const data = volumeMap.get(weekKey)
          return {
            date: getWeekLabel(weekStart, now),
            volume: Math.round(data?.volume || 0)
          }
        })
        
        setExerciseData(chartData)
      }
    } catch (error) {
      console.error('Error loading exercise data:', error)
      setExerciseData([])
    }
  }

  const loadStats = async () => {
    try {
      const { data: workouts } = await supabase
        .from('WorkoutsForUser')
        .select('*')
        .eq('Email', currentUser?.Email)
      
      const now = new Date()
      const weekStart = subDays(now, 7)
      
      const newStats = {
        planned: workouts?.filter(w => 
          w.Status === 'Pending' && new Date(w.DueDate) > now
        ).length || 0,
        thisWeek: workouts?.filter(w => {
          const dueDate = new Date(w.DueDate)
          return dueDate >= weekStart && dueDate <= now
        }).length || 0,
        completed: workouts?.filter(w => w.Status === 'Completed').length || 0,
        keyWorkouts: workouts?.filter(w => w.IsKeyWorkout === true).length || 0,
        assigned: workouts?.length || 0
      }
      
      setStats(newStats)
    } catch (error) {
      console.error('Error loading stats:', error)
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
              📊 Dashboard
            </h1>
            
            <button
              onClick={() => setIsWellnessModalOpen(true)}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <span className="text-xl">+</span>
              <span>Wellness</span>
            </button>
          </div>
          
          <TimeRangeSelector 
            selected={timeRange} 
            onChange={setTimeRange} 
          />
          
          <p className="text-sm text-gray-600 mt-2 text-center">
            {timeRange === 'week' ? '📅 תצוגה לפי ימים' : '📅 תצוגה לפי שבועות'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <StatsCards stats={stats} />

        {/* Climbing Volume - TOP */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            🧗 Climbing Volume
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            🟣 הובלה  •  🟡 בורד  •  🟤 בולדר
          </p>
          <ClimbingVolumeChart data={climbingData} />
        </div>

        {/* Wellness - MIDDLE */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            💚 Wellness
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            🔵 שינה  •  🟢 אנרגיה  •  🔴 כאב
          </p>
          <WellnessChart data={wellnessData} />
        </div>

        {/* Exercise Volume - BOTTOM */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            🏋️ Exercise Volume
          </h2>
          <ExerciseAmountChart data={exerciseData} />
        </div>

        <MotivationalQuote />
      </div>

      <WellnessModal
        isOpen={isWellnessModalOpen}
        onClose={() => setIsWellnessModalOpen(false)}
        currentUser={currentUser}
        onSave={handleWellnessSave}
      />
    </div>
  )
}