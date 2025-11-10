// components/dashboard/TimeRangeSelector.tsx
'use client'

interface Props {
  selected: 'week' | '6weeks' | '12weeks'
  onChange: (range: 'week' | '6weeks' | '12weeks') => void
}

export default function TimeRangeSelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      <button
        onClick={() => onChange('week')}
        className={`px-6 py-3 rounded-lg font-medium transition-all ${
          selected === 'week'
            ? 'bg-blue-600 text-white shadow-lg scale-105'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        📅 שבוע
      </button>
      
      <button
        onClick={() => onChange('6weeks')}
        className={`px-6 py-3 rounded-lg font-medium transition-all ${
          selected === '6weeks'
            ? 'bg-blue-600 text-white shadow-lg scale-105'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        📅 6 שבועות
      </button>
      
      <button
        onClick={() => onChange('12weeks')}
        className={`px-6 py-3 rounded-lg font-medium transition-all ${
          selected === '12weeks'
            ? 'bg-blue-600 text-white shadow-lg scale-105'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        📅 12 שבועות
      </button>
    </div>
  )
}