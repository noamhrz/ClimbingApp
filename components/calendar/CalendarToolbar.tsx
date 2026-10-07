// components/calendar/CalendarToolbar.tsx
'use client'

import { ToolbarProps } from 'react-big-calendar'
import moment from 'moment'

export default function CalendarToolbar({ date, onNavigate }: ToolbarProps) {
  const currentMonth = moment(date).format('MMMM')
  const currentYear = moment(date).year()
  
  const goToToday = () => {
    onNavigate('TODAY')
  }

  const goToNext = () => {
    onNavigate('NEXT')
  }

  const goToPrev = () => {
    onNavigate('PREV')
  }

  const handleYearChange = (year: number) => {
    const newDate = moment(date).year(year).toDate()
    onNavigate('DATE', newDate)
  }

  // Generate year options (current year ± 2 years)
  const currentYearNum = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYearNum - 2 + i)

  return (
    <div className="flex items-center justify-between mb-4 bg-surface p-3 rounded-lg border border-line">
      {/* Right: Navigation Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToPrev}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
          title="חודש קודם"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-accent/15 text-accent hover:bg-accent/15 rounded-lg font-medium transition-colors"
        >
          היום
        </button>
        
        <button
          onClick={goToNext}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
          title="חודש הבא"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Center: Month & Year Display */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-fg">
          {currentMonth}
        </h2>
        
        {/* Year Selector */}
        <select
          value={currentYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="px-3 py-1 border border-line rounded-lg font-medium text-fg-2 hover:border-accent focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
        >
          {years.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Left: Empty space for balance */}
      <div className="w-[140px]"></div>
    </div>
  )
}