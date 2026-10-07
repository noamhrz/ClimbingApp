// components/goals/GoalsPyramid.tsx
// 🏔️ Goals Pyramid Visualization
'use client'

import { useMemo } from 'react'

interface Props {
  type: 'boulder' | 'board' | 'lead'
  data: any | null  // BoulderGoalsData | LeadGoalsData | Record<string, number>
  showEmpty?: boolean  // Show grades with 0 goals?
  maxWidth?: number    // Max width in pixels
}

// V Grades for Boulder/Board
const V_GRADES = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5',
  'V6', 'V7', 'V8', 'V9', 'V10', 'V11',
  'V12', 'V13', 'V14', 'V15', 'V16', 'V17'
]

// French Grades for Lead (starting from 5c)
const LEAD_GRADES = [
  '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b', '9b+'
]

export default function GoalsPyramid({ 
  type, 
  data, 
  showEmpty = false,
  maxWidth = 600 
}: Props) {
  const grades = type === 'lead' ? LEAD_GRADES : V_GRADES

  // Process data into pyramid levels
  const pyramidLevels = useMemo(() => {
    if (!data) return []

    // Get grades with values (reversed - hardest at top)
    const levelsWithValues = grades
      .map(grade => ({
        grade,
        count: data[grade] || 0
      }))
      .filter(level => showEmpty || level.count > 0)
      .reverse()  // Hardest grades at top

    return levelsWithValues
  }, [data, grades, showEmpty])

  if (!data || pyramidLevels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted bg-surface rounded-xl">
        אין יעדים להצגה
      </div>
    )
  }

  // Find max count for width calculation
  const maxCount = Math.max(...pyramidLevels.map(l => l.count), 1)

  // Color scheme based on type
  const getColor = (grade: string, index: number, total: number) => {
    const intensity = Math.floor((index / total) * 5)  // 0-4
    
    if (type === 'lead') {
      // Blue gradient for lead
      const colors = [
        'bg-accent/20 border-accent text-accent',
        'bg-accent/20 border-accent text-accent',
        'bg-accent border-accent text-on-accent',
        'bg-accent border-accent text-on-accent',
        'bg-accent border-accent text-on-accent',
      ]
      return colors[intensity]
    }
    
    // Orange/Red gradient for boulder/board
    const colors = [
      'bg-warning/20 border-warning text-warning',
      'bg-warning/20 border-warning text-warning',
      'bg-warning border-warning text-on-accent',
      'bg-danger border-danger text-on-accent',
      'bg-danger border-danger text-on-accent',
    ]
    return colors[intensity]
  }

  return (
    <div className="py-8" dir="rtl">
      {/* Pyramid */}
      <div className="flex flex-col items-center gap-1" style={{ maxWidth: `${maxWidth}px`, margin: '0 auto' }}>
        {pyramidLevels.map((level, index) => {
          const widthPercent = (level.count / maxCount) * 100
          const minWidth = 20  // Minimum width percentage
          const finalWidth = Math.max(widthPercent, minWidth)

          return (
            <div
              key={level.grade}
              className={`
 relative
 rounded-lg 
 border-2
 transition-all
 duration-200
 hover:scale-105
 
 ${getColor(level.grade, pyramidLevels.length - index - 1, pyramidLevels.length)}
 `}
              style={{
                width: `${finalWidth}%`,
                minHeight: '50px',
              }}
            >
              {/* Content */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Grade */}
                  <div className="text-xl font-bold">
                    {level.grade}
                  </div>
                  
                  {/* Count */}
                  <div className="text-2xl font-extrabold">
                    {level.count}
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="text-sm opacity-75">
                  {Math.round(widthPercent)}%
                </div>
              </div>

              {/* Tooltip on hover */}
              <div className="
                absolute 
                -top-10 
                left-1/2 
                -translate-x-1/2
                bg-bg 
                text-white 
                px-3 
                py-1 
                rounded 
                text-sm 
                whitespace-nowrap
                opacity-0
                group-hover:opacity-100
                pointer-events-none
                transition-opacity
              ">
                {level.grade}: {level.count} טיפוסים
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-8 text-center text-sm text-fg-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 rounded bg-surface border border-line"></div>
          <span>קל → קשה</span>
        </div>
        <div className="mt-2">
          סה"כ יעדים: <span className="font-bold">{pyramidLevels.reduce((sum, l) => sum + l.count, 0)}</span>
        </div>
      </div>
    </div>
  )
}