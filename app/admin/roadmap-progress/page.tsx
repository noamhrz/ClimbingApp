'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trainee {
  Email: string
  Name: string
}

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
}

interface UserProgress {
  CategoryID: number
  Level: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-500',   text: 'text-white', border: 'border-blue-500' },
  green:  { bg: 'bg-green-500',  text: 'text-white', border: 'border-green-500' },
  purple: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-500' },
  red:    { bg: 'bg-red-500',    text: 'text-white', border: 'border-red-500' },
  orange: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500' },
  yellow: { bg: 'bg-yellow-400', text: 'text-gray-800', border: 'border-yellow-400' },
  pink:   { bg: 'bg-pink-500',   text: 'text-white', border: 'border-pink-500' },
  gray:   { bg: 'bg-gray-500',   text: 'text-white', border: 'border-gray-500' },
}

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoadmapProgressPage() {
  const { loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  const router = useRouter()

  const [authorized, setAuthorized] = useState(false)
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null)
  const [categories, setCategories] = useState<RoadmapCategory[]>([])
  const [levels, setLevels] = useState<RoadmapLevel[]>([])
  const [progress, setProgress] = useState<Record<number, number>>({}) // categoryId → level
  const [pendingProgress, setPendingProgress] = useState<Record<number, number>>({})
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Auth check ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!activeEmail) { router.push('/dashboard'); return }

    supabase.from('Users').select('Role').eq('Email', activeEmail).single().then(({ data }) => {
      if (!data || !['admin', 'coach'].includes(data.Role)) {
        router.push('/dashboard')
      } else {
        setAuthorized(true)
      }
    })
  }, [authLoading, activeEmail, router])

  // ── Fetch trainees ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authorized) return
    supabase
      .from('Users')
      .select('Email, Name')
      .order('Name', { ascending: true })
      .then(({ data }) => setTrainees(data ?? []))
  }, [authorized])

  // ── Fetch categories + levels ─────────────────────────────────────────────────
  const fetchCategoriesAndLevels = useCallback(async () => {
    const headers = await getAuthHeaders()
    const [catsRes, lvlsRes] = await Promise.all([
      fetch('/api/admin/roadmap/categories', { headers }),
      fetch('/api/admin/roadmap/levels', { headers }),
    ])
    const [catsData, lvlsData] = await Promise.all([catsRes.json(), lvlsRes.json()])
    setCategories(catsData ?? [])
    setLevels(lvlsData ?? [])
  }, [])

  useEffect(() => { if (authorized) fetchCategoriesAndLevels() }, [authorized, fetchCategoriesAndLevels])

  // ── Fetch progress for selected trainee ───────────────────────────────────────
  const fetchProgress = useCallback(async (email: string) => {
    setLoadingData(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/roadmap/progress?email=${encodeURIComponent(email)}`, { headers })
      const data = await res.json()
      if (!res.ok) { console.error('[roadmap progress GET error]', data); return }
      const map: Record<number, number> = {}
      for (const row of (Array.isArray(data) ? data : [])) {
        map[row.CategoryID] = row.CurrentLevel
      }
      setProgress(map)
      setPendingProgress(map)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTrainee) fetchProgress(selectedTrainee.Email)
  }, [selectedTrainee, fetchProgress])

  // ── Save progress ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedTrainee) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const headers = await getAuthHeaders()
      const updates = Object.entries(pendingProgress).map(([catId, level]) => ({
        categoryId: Number(catId),
        level,
      }))
      const res = await fetch('/api/admin/roadmap/progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: selectedTrainee.Email, updates }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setProgress(pendingProgress)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err: any) {
      alert(`שגיאה בשמירה: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const hasPendingChanges = JSON.stringify(pendingProgress) !== JSON.stringify(progress)

  const filteredTrainees = trainees.filter(t =>
    t.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.Email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!authorized) return null

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">📊 עדכון התקדמות Roadmap</h1>
          <p className="text-sm text-gray-500 mt-0.5">עדכן את רמות ההתקדמות של המתאמנים</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* Left panel — Trainees list */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-700 mb-2">מתאמנים</h2>
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {filteredTrainees.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">אין מתאמנים</p>
            ) : (
              <ul className="divide-y overflow-y-auto max-h-[calc(100vh-220px)]">
                {filteredTrainees.map(t => (
                  <li key={t.Email}>
                    <button
                      onClick={() => setSelectedTrainee(t)}
                      className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedTrainee?.Email === t.Email ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
                    >
                      <p className={`font-medium text-sm truncate ${selectedTrainee?.Email === t.Email ? 'text-blue-700' : 'text-gray-800'}`}>
                        {t.Name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{t.Email}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right panel — Progress editor */}
        <div className="flex-1">
          {!selectedTrainee ? (
            <div className="bg-white rounded-xl shadow-sm border flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <p className="text-4xl mb-2">👈</p>
                <p className="text-sm">בחר מתאמן כדי לעדכן את ההתקדמות שלו</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Trainee header */}
              <div className="bg-white rounded-xl shadow-sm border px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedTrainee.Name}</h2>
                  <p className="text-sm text-gray-500">{selectedTrainee.Email}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasPendingChanges}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    saveSuccess
                      ? 'bg-green-500 text-white'
                      : hasPendingChanges
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  } disabled:opacity-60`}
                >
                  {saving ? '⏳ שומר...' : saveSuccess ? '✅ נשמר!' : '💾 שמור שינויים'}
                </button>
              </div>

              {/* Categories grid */}
              {loadingData ? (
                <div className="bg-white rounded-xl shadow-sm border flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : categories.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border flex items-center justify-center h-48">
                  <p className="text-gray-400 text-sm">אין קטגוריות — צור קטגוריות ב-Roadmap Builder</p>
                </div>
              ) : (() => {
                const GROUP_ORDER = ['כח ספציפי', 'כח כללי', 'מוביליות', 'כללי']
                const grouped: Record<string, RoadmapCategory[]> = {}
                for (const cat of categories) {
                  const g = cat.Group || 'כללי'
                  if (!grouped[g]) grouped[g] = []
                  grouped[g].push(cat)
                }
                const groupKeys = [
                  ...GROUP_ORDER.filter(g => grouped[g]),
                  ...Object.keys(grouped).filter(g => !GROUP_ORDER.includes(g)),
                ]

                return (
                  <div className="flex flex-col gap-6">
                    {groupKeys.map(groupName => (
                      <div key={groupName}>
                        <h3 className="text-sm font-bold text-gray-500 mb-3 px-1 border-b border-gray-200 pb-2">
                          {groupName}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {grouped[groupName].map(cat => {
                            const catLevels = levels
                              .filter(l => l.CategoryID === cat.CategoryID)
                              .sort((a, b) => a.LevelNumber - b.LevelNumber)
                            const currentLevel = pendingProgress[cat.CategoryID] ?? 0
                            const currentLevelName = catLevels.find(l => l.LevelNumber === currentLevel)?.Name
                            const colorKey = cat.Color || 'gray'
                            const colors = COLOR_CLASSES[colorKey] ?? COLOR_CLASSES.gray

                            return (
                              <div key={cat.CategoryID} className="bg-white rounded-xl shadow-sm border px-5 py-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-2xl">{cat.Icon}</span>
                                  <div>
                                    <p className="font-semibold text-gray-800">{cat.Name}</p>
                                    {currentLevel > 0 && currentLevelName ? (
                                      <p className="text-xs text-gray-500">רמה נוכחית: {currentLevelName}</p>
                                    ) : (
                                      <p className="text-xs text-gray-400">לא התחיל</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => setPendingProgress(p => ({ ...p, [cat.CategoryID]: 0 }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                      currentLevel === 0
                                        ? 'bg-gray-700 text-white border-gray-700'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                                    }`}
                                  >
                                    לא התחיל
                                  </button>

                                  {catLevels.map(level => {
                                    const isActive = currentLevel === level.LevelNumber
                                    return (
                                      <button
                                        key={level.LevelID}
                                        onClick={() => setPendingProgress(p => ({ ...p, [cat.CategoryID]: level.LevelNumber }))}
                                        title={level.Name}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                          isActive
                                            ? `${colors.bg} ${colors.text} ${colors.border}`
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                                        }`}
                                      >
                                        L{level.LevelNumber}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
