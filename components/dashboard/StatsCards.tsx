// components/dashboard/StatsCards.tsx - COMPACT FOR MOBILE
'use client'

interface Props {
  stats: {
    completedThisWeek: number
    pendingThisWeek: number
    missedThisWeek: number
  }
}

export default function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      {/* Completed This Week */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg md:rounded-xl p-3 md:p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="text-[10px] md:text-sm opacity-90 leading-tight">בוצעו השבוע</p>
            <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats.completedThisWeek}</p>
          </div>
          <div className="hidden md:block text-5xl opacity-80">✅</div>
        </div>
      </div>

      {/* Pending This Week */}
      <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg md:rounded-xl p-3 md:p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="text-[10px] md:text-sm opacity-90 leading-tight">עדיין לא בוצעו</p>
            <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats.pendingThisWeek}</p>
          </div>
          <div className="hidden md:block text-5xl opacity-80">⏳</div>
        </div>
      </div>

      {/* Missed This Week */}
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg md:rounded-xl p-3 md:p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="text-[10px] md:text-sm opacity-90 leading-tight">פספסתי השבוע</p>
            <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats.missedThisWeek}</p>
          </div>
          <div className="hidden md:block text-5xl opacity-80">❌</div>
        </div>
      </div>
    </div>
  )
}