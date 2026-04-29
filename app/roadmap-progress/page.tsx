'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'

import { useRouter } from 'next/navigation'

interface RoadmapCategory {
  CategoryID: number
  Name: string
  Icon: string
  Color: string
  Order: number
  Group: string
}

interface RoadmapLevel {
  LevelID: number
  CategoryID: number
  LevelNumber: number
  Name: string
  Description: string
}

interface UserProgress {
  CategoryID: number
  Level: number
}

const COLOR_BG: Record<string, string> = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  purple: 'bg-purple-500',
  red:    'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-400',
  pink:   'bg-pink-500',
  gray:   'bg-gray-500',
}

const COLOR_LIGHT: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-800',
  green:  'bg-green-100 text-green-800',
  purple: 'bg-purple-100 text-purple-800',
  red:    'bg-red-100 text-red-800',
  orange: 'bg-orange-100 text-orange-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  pink:   'bg-pink-100 text-pink-800',
  gray:   'bg-gray-100 text-gray-800',
}

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }
}

export default function RoadmapProgressPage() {
  const { loading: authLoading, currentUser } = useAuth()
  const activeEmail = useActiveUserEmail()
  const router = useRouter()

  const [categories, setCategories] = useState<RoadmapCategory[]>([])
  const [levels, setLevels] = useState<RoadmapLevel[]>([])
  const [progress, setProgress] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !activeEmail) router.push('/')
  }, [authLoading, activeEmail, router])

  const fetchAll = useCallback(async () => {
    if (!activeEmail) return
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const [catsRes, lvlsRes, progressRes] = await Promise.all([
        fetch('/api/admin/roadmap/categories', { headers }),
        fetch('/api/admin/roadmap/levels', { headers }),
        fetch(`/api/admin/roadmap/progress?email=${encodeURIComponent(activeEmail)}`, { headers }),
      ])

      const [catsData, lvlsData, progressData] = await Promise.all([
        catsRes.json(), lvlsRes.json(), progressRes.json(),
      ])
      setCategories(catsData ?? [])
      setLevels(lvlsData ?? [])

      const map: Record<number, number> = {}
      for (const row of (Array.isArray(progressData) ? progressData : [])) {
        map[row.CategoryID] = row.CurrentLevel
      }
      setProgress(map)
    } finally {
      setLoading(false)
    }
  }, [activeEmail])

  useEffect(() => { if (!authLoading && activeEmail) fetchAll() }, [authLoading, activeEmail, fetchAll])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    )
  }

  const totalCategories = categories.length
  const startedCategories = categories.filter(c => (progress[c.CategoryID] ?? 0) > 0).length

  // Group categories preserving their original order — only show started categories
  const startedCats = categories.filter(c => (progress[c.CategoryID] ?? 0) > 0)
  const GROUP_ORDER = ['כח ספציפי', 'כח כללי', 'מוביליות', 'כללי']
  const grouped: Record<string, RoadmapCategory[]> = {}
  for (const cat of startedCats) {
    const g = cat.Group || 'כללי'
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(cat)
  }
  const groupKeys = [
    ...GROUP_ORDER.filter(g => grouped[g]),
    ...Object.keys(grouped).filter(g => !GROUP_ORDER.includes(g)),
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">🗺️ מפת ההתקדמות שלי</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {startedCategories} מתוך {totalCategories} תחומים התחלת
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {startedCats.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border flex items-center justify-center h-48">
            <p className="text-gray-400 text-sm">עוד לא עודכנה התקדמות</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groupKeys.map(groupName => (
              <div key={groupName}>
                <h2 className="text-base font-bold text-gray-600 mb-3 px-1 border-b border-gray-200 pb-2">
                  {groupName}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped[groupName].map(cat => {
              const catLevels = levels
                .filter(l => l.CategoryID === cat.CategoryID)
                .sort((a, b) => a.LevelNumber - b.LevelNumber)
              const currentLevel = progress[cat.CategoryID] ?? 0
              const currentLevelObj = catLevels.find(l => l.LevelNumber === currentLevel)
              const maxLevel = catLevels.length
              const colorKey = cat.Color || 'gray'
              const activeBg = COLOR_BG[colorKey] ?? COLOR_BG.gray
              const lightClass = COLOR_LIGHT[colorKey] ?? COLOR_LIGHT.gray
              const pct = maxLevel > 0 ? Math.round((currentLevel / maxLevel) * 100) : 0

              return (
                <div key={cat.CategoryID} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {/* Category header */}
                  <div className="px-5 py-4 flex items-center gap-3">
                    <span className="text-3xl">{cat.Icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-lg">{cat.Name}</p>
                      {currentLevel === 0 ? (
                        <span className="text-xs text-gray-400">לא התחלת עדיין</span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${lightClass}`}>
                          {currentLevelObj?.Name ?? `רמה ${currentLevel}`}
                        </span>
                      )}
                    </div>
                    {maxLevel > 0 && (
                      <span className="text-sm font-semibold text-gray-500 shrink-0">
                        {currentLevel}/{maxLevel}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {maxLevel > 0 && (
                    <div className="px-5 pb-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${activeBg}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Level dots */}
                  {catLevels.length > 0 && (
                    <div className="px-5 pb-4 flex gap-1.5 flex-wrap">
                      {catLevels.map(level => {
                        const done = currentLevel >= level.LevelNumber
                        return (
                          <div
                            key={level.LevelID}
                            title={level.Name}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              done
                                ? `${activeBg} text-white border-transparent`
                                : 'bg-gray-50 text-gray-400 border-gray-200'
                            }`}
                          >
                            L{level.LevelNumber}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Current level description */}
                  {currentLevelObj?.Description && (
                    <div className="px-5 pb-4">
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                        {currentLevelObj.Description}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
