// components/workout-stats-display.tsx
// 💪 תצוגת סטטיסטיקות אימונים - Timeline + Categories

'use client'

import { useState } from 'react'
import type { WorkoutPerformance, WorkoutStats } from '@/lib/workout-stats-metrics'
import { getCompletionRateColor, getRPEColor, getRPELabel } from '@/lib/workout-stats-metrics'

interface WorkoutStatsDisplayProps {
  performance: WorkoutPerformance
}

export function WorkoutStatsDisplay({ performance }: WorkoutStatsDisplayProps) {
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  if (performance.workouts.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">💪</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">אין נתוני אימונים</h3>
        <p className="text-gray-600">לא נמצאו אימונים בטווח התאריכים הנבחר</p>
      </div>
    )
  }

  // Group workouts by category
  const categorizedWorkouts = groupByCategory(performance.workouts)
  
  // Get all unique categories for filter
  const allCategories = Object.keys(categorizedWorkouts).sort()
  
  // Filter workouts based on selected category
  const filteredWorkouts = selectedCategory === 'all' 
    ? categorizedWorkouts 
    : { [selectedCategory]: categorizedWorkouts[selectedCategory] }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">💪 סיכום אימונים</h2>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-90">סנן לפי קטגוריה:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            >
              <option value="all" className="text-gray-900">🔍 הכל ({performance.workouts.length})</option>
              {allCategories.map((category) => (
                <option key={category} value={category} className="text-gray-900">
                  {getCategoryIcon(category)} {category} ({categorizedWorkouts[category].length})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-sm opacity-90">סה"כ אימונים</div>
            <div className="text-3xl font-bold">{performance.totalSessions}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-sm opacity-90">בוצעו</div>
            <div className="text-3xl font-bold">{performance.completedSessions}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm col-span-2 md:col-span-1">
            <div className="text-sm opacity-90">אחוז השלמה</div>
            <div className="text-3xl font-bold">
              {performance.overallCompletionRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Category Sections */}
      {Object.entries(filteredWorkouts).map(([category, workouts]) => (
        <CategorySection key={category} category={category} workouts={workouts} />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Group by Category
// ═══════════════════════════════════════════════════════════════════

function groupByCategory(workouts: WorkoutStats[]): Record<string, WorkoutStats[]> {
  const grouped: Record<string, WorkoutStats[]> = {}
  
  for (const workout of workouts) {
    const category = workout.workoutCategory || 'אחר'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(workout)
  }

  // Sort within each category by totalSessions descending
  for (const category in grouped) {
    grouped[category].sort((a, b) => b.totalSessions - a.totalSessions)
  }

  return grouped
}

// ═══════════════════════════════════════════════════════════════════
// Category Icon Mapping
// ═══════════════════════════════════════════════════════════════════

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    // Strength
    'General strength': '🏋️',
    'Specific-strength': '💪',
    'Lead - Strength': '🧗‍♂️',
    'Mobility \\ strength': '🤸',
    
    // Endurance & Power
    'Power Endurance': '⚡',
    'Power': '💥',
    'Specific Aerobic': '🏃',
    'Endurance': '🔋',
    'Power endurance lead': '⚡🧗',
    'Lead-aerobic': '🏃🧗',
    
    // Technique & Mental
    'Technique': '🎯',
    'Body tension': '🧘',
    'Mental/Fear': '🧠',
    
    // Warm-up & Recovery
    'Warm-up / Rehab': '🧘',
    'Efficient Warm-Up': '🔥',
    
    // Climbing Sessions
    'HangBoard': '🪵',
    'Climbing session': '🧗',
    'Rock climbing': '🏔️',
    
    // Other
    'personal-workouts': '👤',
    'אחר': '📋'
  }
  
  return icons[category] || '📋'
}

// ═══════════════════════════════════════════════════════════════════
// Category Section
// ═══════════════════════════════════════════════════════════════════

function CategorySection({ category, workouts }: { category: string; workouts: WorkoutStats[] }) {
  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200">
      {/* Category Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b-2 border-gray-200 rounded-t-lg">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>{getCategoryIcon(category)}</span>
          <span>{category}</span>
          <span className="text-sm font-normal text-gray-600">({workouts.length} אימונים)</span>
        </h3>
      </div>

      {/* Timeline Table */}
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-700 text-xs">
                <th className="text-center p-2 font-bold w-16">תאריך</th>
                <th className="text-center p-2 font-bold w-32">ציר זמן</th>
                <th className="text-center p-2 font-bold w-12">#</th>
                <th className="text-right p-2 font-bold">שם אימון</th>
                <th className="text-center p-2 font-bold w-16">סה"כ</th>
                <th className="text-center p-2 font-bold w-16">✅</th>
                <th className="text-center p-2 font-bold w-16">%</th>
                <th className="text-center p-2 font-bold w-16">RPE</th>
                <th className="text-center p-2 font-bold w-12"></th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((workout, index) => (
                <WorkoutTimelineRow 
                  key={workout.workoutId} 
                  workout={workout} 
                  rank={index + 1}
                  maxSessions={workouts[0].totalSessions}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Timeline Row
// ═══════════════════════════════════════════════════════════════════

function WorkoutTimelineRow({ 
  workout, 
  rank,
  maxSessions 
}: { 
  workout: WorkoutStats
  rank: number
  maxSessions: number
}) {
  const bgColor = workout.completionRate >= 80 ? 'bg-green-50' :
                  workout.completionRate >= 50 ? 'bg-yellow-50' : 'bg-red-50'

  const statusIcon = workout.completionRate >= 80 ? '🟢' :
                     workout.completionRate >= 50 ? '🟡' : '🔴'

  // Calculate timeline bar width (relative to max)
  const timelineWidth = maxSessions > 0 ? (workout.totalSessions / maxSessions) * 100 : 0

  // Format last completed date
  const lastDate = workout.lastCompleted 
    ? new Date(workout.lastCompleted).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
    : '—'

  // Rank badge
  const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition ${bgColor}`}>
      {/* Last Date */}
      <td className="text-center p-2 text-xs text-gray-600 font-mono">
        {lastDate}
      </td>

      {/* Timeline */}
      <td className="p-2">
        <div className="flex items-center gap-1">
          <div className="w-full bg-gray-200 rounded-full h-2 relative">
            <div
              className={`h-2 rounded-full ${
                workout.completionRate >= 80 ? 'bg-green-500' :
                workout.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${timelineWidth}%` }}
            />
          </div>
        </div>
      </td>

      {/* Rank */}
      <td className="text-center p-2 text-xs font-bold">
        {rankBadge}
      </td>

      {/* Workout Name */}
      <td className="text-right p-2 font-semibold text-gray-900">
        {workout.workoutName}
      </td>

      {/* Total Sessions */}
      <td className="text-center p-2 font-medium text-gray-700">
        {workout.totalSessions}
      </td>

      {/* Completed */}
      <td className="text-center p-2 text-green-700 font-semibold">
        {workout.completedSessions}
      </td>

      {/* Completion % */}
      <td className="text-center p-2">
        <span className={`font-bold ${getCompletionRateColor(workout.completionRate)}`}>
          {workout.completionRate.toFixed(0)}%
        </span>
      </td>

      {/* RPE */}
      <td className="text-center p-2">
        {workout.averageRPE !== null ? (
          <span className={`font-bold ${getRPEColor(workout.averageRPE)}`}>
            {workout.averageRPE.toFixed(1)}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      {/* Status Icon */}
      <td className="text-center p-2">
        {statusIcon}
      </td>
    </tr>
  )
}