// components/dashboard/TimeRangeSelector.tsx - UPDATED
'use client'
import { LuCalendarDays } from 'react-icons/lu'

interface Props {
  selected: '10days' | '6weeks' | '12weeks'
  onChange: (range: '10days' | '6weeks' | '12weeks') => void
}

export default function TimeRangeSelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      <button
        onClick={() => onChange('10days')}
        className={`px-6 py-3 rounded-lg font-medium transition-all ${
 selected === '10days'
 ? 'bg-accent text-on-accent scale-105'
 : 'bg-raised text-fg-2 hover:bg-raised/90'
 }`}
      >
        <LuCalendarDays aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />10 ימים
      </button>
      
      <button
        onClick={() => onChange('6weeks')}
        className={`px-6 py-3 rounded-lg font-medium transition-all ${
 selected === '6weeks'
 ? 'bg-accent text-on-accent scale-105'
 : 'bg-raised text-fg-2 hover:bg-raised/90'
 }`}
      >
        <LuCalendarDays aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />6 שבועות
      </button>
      
      <button
        onClick={() => onChange('12weeks')}
        className={`px-6 py-3 rounded-lg font-medium transition-all ${
 selected === '12weeks'
 ? 'bg-accent text-on-accent scale-105'
 : 'bg-raised text-fg-2 hover:bg-raised/90'
 }`}
      >
        <LuCalendarDays aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />12 שבועות
      </button>
    </div>
  )
}