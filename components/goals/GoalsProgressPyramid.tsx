// components/goals/GoalsProgressPyramid.tsx
// 🏔️ Goals Progress Pyramid - Real pyramid shape!
'use client'

import { useEffect, useState } from 'react'
import { getBoulderProgress, getLeadProgress, getBoardProgress, GoalProgress } from '@/lib/goals-progress-api'
import { LuTarget } from 'react-icons/lu'

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
      <div className="bg-surface rounded-2xl border border-line p-8">
        {title && <h3 className="text-2xl font-bold mb-6 text-fg">{title}</h3>}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <div className="text-muted">טוען נתונים...</div>
          </div>
        </div>
      </div>
    )
  }

  if (progress.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-line p-8">
        {title && <h3 className="text-2xl font-bold mb-6 text-fg">{title}</h3>}
        <div className="flex items-center justify-center h-64 bg-surface rounded-xl">
          <div className="text-center">
            <div className="text-6xl mb-4"><LuTarget aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
            <div className="text-muted font-medium">אין יעדים מוגדרים</div>
            <div className="text-sm text-faint mt-2">הגדר יעדים כדי לראות התקדמות</div>
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
        completed: 'bg-accent',
        remaining: 'bg-accent/20',
        text: 'text-accent',
        bgLight: 'bg-accent/10',
        border: 'border-accent/30'
      }
    }
    if (type === 'board') {
      return {
        completed: 'bg-info',
        remaining: 'bg-info/20',
        text: 'text-info',
        bgLight: 'bg-info/10',
        border: 'border-info/30'
      }
    }
    return {
      completed: 'bg-warning',
      remaining: 'bg-warning/20',
      text: 'text-warning',
      bgLight: 'bg-warning/10',
      border: 'border-warning/30'
    }
  }

  const colors = getColorClasses()

  return (
    <div className="bg-surface rounded-2xl border border-line p-8" dir="rtl">
      {/* Title */}
      {title && (
        <h3 className="text-2xl font-bold mb-6 text-fg">{title}</h3>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className={`${colors.bgLight} rounded-xl p-4 text-center border ${colors.border}`}>
          <div className={`text-3xl font-bold ${colors.text}`}>{overallPercentage}%</div>
          <div className="text-xs text-fg-3 mt-1">התקדמות</div>
        </div>
        <div className="bg-success/15 rounded-xl p-4 text-center border border-success">
          <div className="text-3xl font-bold text-success">{totalActual}</div>
          <div className="text-xs text-fg-3 mt-1">הושלמו</div>
        </div>
        <div className="bg-surface rounded-xl p-4 text-center border border-line">
          <div className="text-3xl font-bold text-fg-2">{totalTarget - totalActual}</div>
          <div className="text-xs text-fg-3 mt-1">נותרו</div>
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
                      <div className={`${colors.completed} text-on-accent font-bold text-lg px-3 py-1 rounded-md `}>
                        {item.grade}
                      </div>
                      <div className="text-sm font-semibold text-fg-2">
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
                  bg-bg 
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
                    bg-bg 
                    rotate-45
                  "></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-fg-3 mt-6 pt-6 border-t border-line">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${colors.completed} rounded`}></div>
          <span>הושלם</span>
        </div>
        <div className="text-faint">|</div>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${colors.remaining} rounded`}></div>
          <span>נותר</span>
        </div>
        <div className="text-faint">|</div>
        <div className="text-xs">
          רוחב = כמות יעדים (רחב יותר = יותר מסלולים)
        </div>
      </div>
    </div>
  )
}