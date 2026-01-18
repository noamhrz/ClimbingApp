// components/goals/GoalsProgressPyramid.tsx
// 🏔️ Goals Progress Pyramid - Real pyramid shape!
'use client'

import { useEffect, useState } from 'react'
import { getBoulderProgress, getLeadProgress, getBoardProgress, GoalProgress } from '@/lib/goals-progress-api'

interface Props {
  email: string
  year: number
  quarter: number
  type: 'boulder' | 'board' | 'lead'
  title?: string
}

export default function GoalsProgressPyramid({
  email,
  year,
  quarter,
  type,
  title
}: Props) {
  const [progress, setProgress] = useState<GoalProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [email, year, quarter, type])

  const loadProgress = async () => {
    setLoading(true)
    
    let data: GoalProgress[] = []
    
    if (type === 'boulder') {
      data = await getBoulderProgress(email, year, quarter)
    } else if (type === 'board') {
      data = await getBoardProgress(email, year, quarter)
    } else if (type === 'lead') {
      data = await getLeadProgress(email, year, quarter)
    }
    
    setProgress(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
        {title && <h3 className="text-2xl font-bold mb-6 text-gray-800">{title}</h3>}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-500">טוען נתונים...</div>
          </div>
        </div>
      </div>
    )
  }

  if (progress.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
        {title && <h3 className="text-2xl font-bold mb-6 text-gray-800">{title}</h3>}
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <div className="text-gray-500 font-medium">אין יעדים מוגדרים</div>
            <div className="text-sm text-gray-400 mt-2">הגדר יעדים כדי לראות התקדמות</div>
          </div>
        </div>
      </div>
    )
  }

  const totalTarget = progress.reduce((sum, p) => sum + p.target, 0)
  const totalActual = progress.reduce((sum, p) => sum + p.actual, 0)
  const overallPercentage = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  // Find max target for width calculation
  const maxTarget = Math.max(...progress.map(p => p.target), 1)

  const getColorClasses = () => {
    if (type === 'lead') {
      return {
        completed: 'bg-blue-500',
        remaining: 'bg-blue-200',
        text: 'text-blue-700',
        bgLight: 'bg-blue-50',
        border: 'border-blue-300'
      }
    }
    if (type === 'board') {
      return {
        completed: 'bg-purple-500',
        remaining: 'bg-purple-200',
        text: 'text-purple-700',
        bgLight: 'bg-purple-50',
        border: 'border-purple-300'
      }
    }
    return {
      completed: 'bg-orange-500',
      remaining: 'bg-orange-200',
      text: 'text-orange-700',
      bgLight: 'bg-orange-50',
      border: 'border-orange-300'
    }
  }

  const colors = getColorClasses()

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8" dir="rtl">
      {/* Title */}
      {title && (
        <h3 className="text-2xl font-bold mb-6 text-gray-800">{title}</h3>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className={`${colors.bgLight} rounded-xl p-4 text-center border ${colors.border}`}>
          <div className={`text-3xl font-bold ${colors.text}`}>{overallPercentage}%</div>
          <div className="text-xs text-gray-600 mt-1">התקדמות</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-300">
          <div className="text-3xl font-bold text-green-700">{totalActual}</div>
          <div className="text-xs text-gray-600 mt-1">הושלמו</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-300">
          <div className="text-3xl font-bold text-gray-700">{totalTarget - totalActual}</div>
          <div className="text-xs text-gray-600 mt-1">נותרו</div>
        </div>
      </div>

      {/* Pyramid Structure */}
      <div className="flex flex-col items-center gap-2 py-6">
        {progress.map((item, index) => {
          // Calculate width based on target (pyramid gets wider at bottom)
          const widthPercent = (item.target / maxTarget) * 100
          const minWidth = 30
          const finalWidth = Math.max(widthPercent, minWidth)

          return (
            <div
              key={item.grade}
              className="relative"
              style={{ width: `${finalWidth}%` }}
            >
              {/* Pyramid Block */}
              <div className="relative group">
                {/* Background (total target) */}
                <div className={`${colors.remaining} rounded-lg h-14 flex items-center overflow-hidden border-2 ${colors.border}`}>
                  {/* Completed portion */}
                  <div 
                    className={`${colors.completed} h-full transition-all duration-500 ease-out`}
                    style={{ width: `${item.percentage}%` }}
                  />
                  
                  {/* Content overlay */}
                  <div className="absolute inset-0 flex items-center justify-between px-4">
                    {/* Right side - Grade */}
                    <div className="flex items-center gap-3">
                      <div className={`${colors.completed} text-white font-bold text-lg px-3 py-1 rounded-md shadow-sm`}>
                        {item.grade}
                      </div>
                      <div className="text-sm font-semibold text-gray-700">
                        {item.actual}/{item.target}
                      </div>
                    </div>
                    
                    {/* Left side - Percentage */}
                    <div className={`text-xl font-bold ${colors.text}`}>
                      {item.percentage}%
                    </div>
                  </div>
                </div>

                {/* Hover Tooltip */}
                <div className="
                  absolute 
                  -top-20
                  left-1/2 
                  -translate-x-1/2
                  bg-gray-900 
                  text-white 
                  px-4
                  py-3
                  rounded-lg
                  text-sm 
                  whitespace-nowrap
                  opacity-0
                  group-hover:opacity-100
                  pointer-events-none
                  transition-opacity
                  shadow-xl
                  z-10
                ">
                  <div className="font-bold text-lg mb-1">{item.grade}</div>
                  <div className="text-xs">יעד: {item.target} מסלולים</div>
                  <div className="text-xs">הושלמו: {item.actual} ✓</div>
                  <div className="text-xs">נותרו: {item.remaining}</div>
                  
                  {/* Arrow */}
                  <div className="
                    absolute 
                    -bottom-1 
                    left-1/2 
                    -translate-x-1/2 
                    w-2 
                    h-2 
                    bg-gray-900 
                    rotate-45
                  "></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-gray-600 mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${colors.completed} rounded`}></div>
          <span>הושלם</span>
        </div>
        <div className="text-gray-400">|</div>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${colors.remaining} rounded`}></div>
          <span>נותר</span>
        </div>
        <div className="text-gray-400">|</div>
        <div className="text-xs">
          רוחב = כמות יעדים (רחב יותר = יותר מסלולים)
        </div>
      </div>
    </div>
  )
}