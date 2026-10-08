'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'

import { useRouter } from 'next/navigation'
import { LuMap } from 'react-icons/lu'

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
  blue:   'bg-accent',
  green:  'bg-success',
  purple: 'bg-info',
  red:    'bg-danger',
  orange: 'bg-warning',
  yellow: 'bg-warning',
  pink:   'bg-info',
  gray:   'bg-line-strong',
}

const COLOR_LIGHT: Record<string, string> = {
  blue:   'bg-accent/10 text-accent',
  green:  'bg-success/10 text-success',
  purple: 'bg-info/10 text-info',
  red:    'bg-danger/10 text-danger',
  orange: 'bg-warning/10 text-warning',
  yellow: 'bg-warning/10 text-warning',
  pink:   'bg-info/10 text-info',
  gray:   'bg-surface text-fg',
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-fg-3">טוען...</p>
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
    <div dir="rtl" className="min-h-screen bg-surface pb-20">
      {/* Header */}
      <div className="bg-surface border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-fg"><LuMap aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />מפת ההתקדמות שלי</h1>
          <p className="text-sm text-muted mt-0.5">
            {startedCategories} מתוך {totalCategories} תחומים התחלת
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {startedCats.length === 0 ? (
          <div className="bg-surface rounded-xl border flex items-center justify-center h-48">
            <p className="text-faint text-sm">עוד לא עודכנה התקדמות</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groupKeys.map(groupName => (
              <div key={groupName}>
                <h2 className="text-base font-bold text-fg-3 mb-3 px-1 border-b border-line pb-2">
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
                <div key={cat.CategoryID} className="bg-surface rounded-xl border overflow-hidden">
                  {/* Category header */}
                  <div className="px-5 py-4 flex items-center gap-3">
                    <span className="text-3xl">{cat.Icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-fg text-lg">{cat.Name}</p>
                      {currentLevel === 0 ? (
                        <span className="text-xs text-faint">לא התחלת עדיין</span>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${lightClass}`}>
                          {currentLevelObj?.Name ?? `רמה ${currentLevel}`}
                        </span>
                      )}
                    </div>
                    {maxLevel > 0 && (
                      <span className="text-sm font-semibold text-muted shrink-0">
                        {currentLevel}/{maxLevel}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {maxLevel > 0 && (
                    <div className="px-5 pb-3">
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
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
 : 'bg-surface text-faint border-line'
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
                      <p className="text-xs text-muted bg-surface rounded-lg px-3 py-2 leading-relaxed">
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
