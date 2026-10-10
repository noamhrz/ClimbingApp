'use client'

import { isActiveUser } from '@/lib/active-users'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { LuChartColumn, LuCircleCheck, LuLoaderCircle, LuSave } from 'react-icons/lu'

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
  blue:   { bg: 'bg-accent',   text: 'text-on-accent', border: 'border-accent' },
  green:  { bg: 'bg-success',  text: 'text-on-accent', border: 'border-success' },
  purple: { bg: 'bg-info', text: 'text-on-accent', border: 'border-info' },
  red:    { bg: 'bg-danger',    text: 'text-on-accent', border: 'border-danger' },
  orange: { bg: 'bg-warning', text: 'text-on-accent', border: 'border-warning' },
  yellow: { bg: 'bg-warning', text: 'text-on-accent', border: 'border-warning' },
  pink:   { bg: 'bg-info',   text: 'text-on-accent', border: 'border-info' },
  gray:   { bg: 'bg-line-strong',   text: 'text-fg', border: 'border-line-strong' },
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
  const { loading: authLoading, currentUser } = useAuth()
  const signedInEmail = currentUser?.Email
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
    // permissions follow the signed-in coach, not the trainee being viewed
    if (authLoading) return
    if (!signedInEmail) { router.push('/dashboard'); return }

    supabase.from('Users').select('Role').eq('Email', signedInEmail).single().then(({ data }) => {
      if (!data || !['admin', 'coach'].includes(data.Role)) {
        router.push('/dashboard')
      } else {
        setAuthorized(true)
      }
    })
  }, [authLoading, currentUser, signedInEmail, router])

  // ── Fetch trainees ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authorized) return
    supabase
      .from('Users')
      .select('Email, Name, Status, IsActive')
      .order('Name', { ascending: true })
      .then(({ data }) => setTrainees((data ?? []).filter(isActiveUser).map(({ Email, Name }) => ({ Email, Name }))))
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
    <div dir="rtl" className="min-h-screen bg-surface pb-20">
      {/* Header */}
      <div className="bg-surface border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-fg"><LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />עדכון התקדמות Roadmap</h1>
          <p className="text-sm text-muted mt-0.5">עדכן את רמות ההתקדמות של המתאמנים</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* Left panel — Trainees list */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="bg-surface rounded-xl border overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b bg-surface">
              <h2 className="font-semibold text-fg-2 mb-2">מתאמנים</h2>
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 border border-line rounded-lg text-sm focus:ring-2 focus:ring-accent"
              />
            </div>

            {filteredTrainees.length === 0 ? (
              <p className="text-center text-faint text-sm py-8">אין מתאמנים</p>
            ) : (
              <ul className="divide-y overflow-y-auto max-h-[calc(100vh-220px)]">
                {filteredTrainees.map(t => (
                  <li key={t.Email}>
                    <button
                      onClick={() => setSelectedTrainee(t)}
                      className={`w-full text-right px-4 py-3 hover:bg-surface transition-colors ${
 selectedTrainee?.Email === t.Email ? 'bg-accent/15 border-r-4 border-accent' : ''
 }`}
                    >
                      <p className={`font-medium text-sm truncate ${selectedTrainee?.Email === t.Email ? 'text-accent' : 'text-fg'}`}>
                        {t.Name}
                      </p>
                      <p className="text-xs text-muted truncate">{t.Email}</p>
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
            <div className="bg-surface rounded-xl border flex items-center justify-center h-64">
              <div className="text-center text-faint">
                <p className="text-4xl mb-2">👈</p>
                <p className="text-sm">בחר מתאמן כדי לעדכן את ההתקדמות שלו</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Trainee header */}
              <div className="bg-surface rounded-xl border px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-fg">{selectedTrainee.Name}</h2>
                  <p className="text-sm text-muted">{selectedTrainee.Email}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasPendingChanges}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
 saveSuccess
 ? 'bg-success text-on-accent'
 : hasPendingChanges
 ? 'bg-accent text-on-accent hover:bg-accent-hover'
 : 'bg-surface text-faint cursor-not-allowed'
 } disabled:opacity-60`}
                >
                  {saving ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />שומר...</> : saveSuccess ? <><LuCircleCheck aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />נשמר!</> : <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שמור שינויים</>}
                </button>
              </div>

              {/* Categories grid */}
              {loadingData ? (
                <div className="bg-surface rounded-xl border flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
                </div>
              ) : categories.length === 0 ? (
                <div className="bg-surface rounded-xl border flex items-center justify-center h-48">
                  <p className="text-faint text-sm">אין קטגוריות — צור קטגוריות ב-Roadmap Builder</p>
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
                        <h3 className="text-sm font-bold text-muted mb-3 px-1 border-b border-line pb-2">
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
                              <div key={cat.CategoryID} className="bg-surface rounded-xl border px-5 py-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-2xl">{cat.Icon}</span>
                                  <div>
                                    <p className="font-semibold text-fg">{cat.Name}</p>
                                    {currentLevel > 0 && currentLevelName ? (
                                      <p className="text-xs text-muted">רמה נוכחית: {currentLevelName}</p>
                                    ) : (
                                      <p className="text-xs text-faint">לא התחיל</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => setPendingProgress(p => ({ ...p, [cat.CategoryID]: 0 }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
 currentLevel === 0
 ? 'bg-raised text-fg border-line-strong'
 : 'bg-surface text-fg-3 border-line hover:border-line-strong/90'
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
 : 'bg-surface text-fg-3 border-line hover:border-line-strong'
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
