// components/dashboard/StatsCards.tsx
'use client'

interface Props {
  stats: {
    planned: number
    thisWeek: number
    completed: number
    keyWorkouts: number
    assigned: number
  }
}

export default function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* מתוכננים */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">➡️</div>
          <div className="text-4xl font-bold mb-1">{stats.planned}</div>
          <div className="text-sm opacity-90">מתוכננים</div>
        </div>
      </div>

      {/* השבוע */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">📅</div>
          <div className="text-4xl font-bold mb-1">{stats.thisWeek}</div>
          <div className="text-sm opacity-90">השבוע</div>
        </div>
      </div>

      {/* הושלמו */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-4xl font-bold mb-1">{stats.completed}</div>
          <div className="text-sm opacity-90">אימונים שהושלמו</div>
        </div>
      </div>

      {/* אימוני מפתח */}
      <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">⭐</div>
          <div className="text-4xl font-bold mb-1">{stats.keyWorkouts}</div>
          <div className="text-sm opacity-90">אימוני מפתח</div>
        </div>
      </div>

      {/* מוקצים */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">🎯</div>
          <div className="text-4xl font-bold mb-1">{stats.assigned}</div>
          <div className="text-sm opacity-90">אימונים מוקצים</div>
        </div>
      </div>
    </div>
  )
}