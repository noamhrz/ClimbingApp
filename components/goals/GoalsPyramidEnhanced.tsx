// components/goals/GoalsPyramidEnhanced.tsx
// 🏔️ Goals Pyramid Visualization - Enhanced Version
'use client'

import { useMemo } from 'react'

interface Props {
  type: 'boulder' | 'board' | 'lead'
  data: any | null  // BoulderGoalsData | LeadGoalsData | Record<string, number>
  showEmpty?: boolean
  maxWidth?: number
  title?: string
}

const V_GRADES = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5',
  'V6', 'V7', 'V8', 'V9', 'V10', 'V11',
  'V12', 'V13', 'V14', 'V15', 'V16', 'V17'
]

const LEAD_GRADES = [
  '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b', '9b+'
]

export default function GoalsPyramidEnhanced({ 
  type, 
  data, 
  showEmpty = false,
  maxWidth = 700,
  title
}: Props) {
  const grades = type === 'lead' ? LEAD_GRADES : V_GRADES

  const pyramidLevels = useMemo(() => {
    if (!data) return []

    return grades
      .map(grade => ({
        grade,
        count: data[grade] || 0
      }))
      .filter(level => showEmpty || level.count > 0)
      .reverse()  // Hardest at top
  }, [data, grades, showEmpty])

  if (!data || pyramidLevels.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        {title && <h3 className="text-xl font-bold mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-48 text-gray-400 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <div>אין יעדים להצגה</div>
          </div>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...pyramidLevels.map(l => l.count), 1)
  const totalGoals = pyramidLevels.reduce((sum, l) => sum + l.count, 0)

  const getGradientClass = (index: number, total: number) => {
    const position = (total - index - 1) / total  // 0 (easy) to 1 (hard)
    
    if (type === 'lead') {
      // Blue gradient
      if (position < 0.2) return 'from-blue-200 to-blue-300 border-blue-400 text-blue-900'
      if (position < 0.4) return 'from-blue-300 to-blue-400 border-blue-500 text-blue-900'
      if (position < 0.6) return 'from-blue-400 to-blue-500 border-blue-600 text-white'
      if (position < 0.8) return 'from-blue-500 to-blue-600 border-blue-700 text-white'
      return 'from-blue-600 to-blue-700 border-blue-800 text-white'
    }
    
    // Orange to Red gradient for boulder/board
    if (position < 0.2) return 'from-orange-200 to-orange-300 border-orange-400 text-orange-900'
    if (position < 0.4) return 'from-orange-300 to-orange-400 border-orange-500 text-orange-900'
    if (position < 0.6) return 'from-orange-400 to-orange-500 border-orange-600 text-white'
    if (position < 0.8) return 'from-red-500 to-red-600 border-red-700 text-white'
    return 'from-red-600 to-red-700 border-red-800 text-white'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8" dir="rtl">
      {/* Title */}
      {title && (
        <h3 className="text-2xl font-bold mb-6 text-center">{title}</h3>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalGoals}</div>
          <div className="text-sm text-gray-600">סה"כ יעדים</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{pyramidLevels.length}</div>
          <div className="text-sm text-gray-600">דרגות</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{pyramidLevels[0]?.grade || '-'}</div>
          <div className="text-sm text-gray-600">יעד מרבי</div>
        </div>
      </div>

      {/* Pyramid */}
      <div className="relative">
        <div 
          className="flex flex-col items-center gap-2" 
          style={{ maxWidth: `${maxWidth}px`, margin: '0 auto' }}
        >
          {pyramidLevels.map((level, index) => {
            const widthPercent = (level.count / maxCount) * 100
            const minWidth = 15
            const finalWidth = Math.max(widthPercent, minWidth)

            return (
              <div
                key={level.grade}
                className="group relative w-full"
                style={{
                  width: `${finalWidth}%`,
                }}
              >
                <div
                  className={`
                    bg-gradient-to-r
                    rounded-lg 
                    border-2
                    transition-all
                    duration-200
                    cursor-pointer
                    hover:scale-[1.02]
                    hover:shadow-xl
                    ${getGradientClass(index, pyramidLevels.length)}
                  `}
                  style={{
                    minHeight: '56px',
                  }}
                >
                  {/* Content */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                      {/* Grade */}
                      <div className="text-lg font-bold min-w-[60px]">
                        {level.grade}
                      </div>
                      
                      {/* Count */}
                      <div className="text-2xl font-extrabold">
                        {level.count}
                      </div>

                      {/* Visual bar */}
                      <div className="hidden sm:block ml-4">
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(level.count, 10) }).map((_, i) => (
                            <div 
                              key={i} 
                              className="w-2 h-6 bg-current opacity-40 rounded-sm"
                              style={{ animationDelay: `${index * 0.05 + i * 0.02}s` }}
                            />
                          ))}
                          {level.count > 10 && (
                            <div className="text-sm opacity-75">+{level.count - 10}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Percentage */}
                    <div className="text-sm font-semibold opacity-75">
                      {Math.round((level.count / totalGoals) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Tooltip */}
                <div className="
                  absolute 
                  -top-12
                  left-1/2 
                  -translate-x-1/2
                  bg-gray-900 
                  text-white 
                  px-4
                  py-2
                  rounded-lg
                  text-sm 
                  whitespace-nowrap
                  opacity-0
                  group-hover:opacity-100
                  pointer-events-none
                  transition-opacity
                  shadow-lg
                  z-10
                ">
                  <div className="font-bold">{level.grade}</div>
                  <div className="text-xs opacity-90">{level.count} טיפוסים ({Math.round((level.count / totalGoals) * 100)}%)</div>
                  
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
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded bg-gradient-to-r ${
            type === 'lead' 
              ? 'from-blue-200 to-blue-600' 
              : 'from-orange-200 to-red-600'
          }`}></div>
          <span>קל → קשה</span>
        </div>
        <div className="text-gray-400">|</div>
        <div>
          רוחב מייצג כמות יעדים
        </div>
      </div>
    </div>
  )
}