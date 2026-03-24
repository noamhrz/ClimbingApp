'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  MonthlySession, CoachTodo, AthleteTodo, AthleteHighlight, MonthlyAchievement,
  getSession, createSession, updateSessionNotes,
  getCoachTodos, addCoachTodo, updateCoachTodo, toggleCoachTodo, deleteCoachTodo,
  getAthleteTodos, addAthleteTodo, updateAthleteTodo, toggleAthleteTodo, deleteAthleteTodo,
  getHighlights, addHighlight, updateHighlight, deleteHighlight,
  getAchievements, addAchievement, updateAchievement, deleteAchievement,
  getUsersForSessions,
} from '@/lib/monthly-sessions-api'

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

// ─── Small reusable components ────────────────────────────────────────────────

function InlineEditInput({
  value, onChange, onSave, onCancel,
}: { value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 flex-1">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        className="flex-1 border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
      <button onClick={onSave} className="text-blue-600 text-sm font-medium hover:text-blue-800 whitespace-nowrap">שמור</button>
      <button onClick={onCancel} className="text-gray-400 text-sm hover:text-gray-600 whitespace-nowrap">ביטול</button>
    </div>
  )
}

function AddRow({
  value, onChange, onAdd, placeholder,
}: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <div className="flex gap-2 mt-3">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onAdd() }}
        placeholder={placeholder}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={onAdd}
        disabled={!value.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        הוסף
      </button>
    </div>
  )
}

// ─── Main content (needs Suspense for useSearchParams) ────────────────────────

function MonthlySessionsContent() {
  const { currentUser, activeUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const now = new Date()

  const canEdit = currentUser?.Role === 'coach' || currentUser?.Role === 'admin'

  // ── Users list ────────────────────────────────────────────────
  const [users, setUsers] = useState<{ Email: string; Name: string }[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)

  // ── Filters — read from URL ───────────────────────────────────
  const urlEmail = searchParams.get('email') ?? ''
  const urlMonth = Number(searchParams.get('month')) || 0
  const urlYear = Number(searchParams.get('year')) || 0

  // Effective values (fall back to current date when params absent)
  const selectedEmail = urlEmail
  const selectedMonth = urlMonth || (now.getMonth() + 1)
  const selectedYear = urlYear || now.getFullYear()

  function updateUrl(overrides: { email?: string; month?: number; year?: number }) {
    const params = new URLSearchParams(searchParams.toString())
    if (overrides.email !== undefined) params.set('email', overrides.email)
    if (overrides.month !== undefined) params.set('month', String(overrides.month))
    if (overrides.year !== undefined) params.set('year', String(overrides.year))
    router.replace(`${pathname}?${params.toString()}`)
  }

  // ── Load users & initialise URL defaults ──────────────────────
  useEffect(() => {
    if (!currentUser) return
    getUsersForSessions(currentUser.Email, currentUser.Role as 'admin' | 'coach' | 'user').then(list => {
      setUsers(list)
      setUsersLoaded(true)

      const defaultEmail = activeUser?.Email || currentUser.Email
      const emailInUrl = searchParams.get('email')
      const validEmail =
        list.find(u => u.Email === emailInUrl)?.Email ||
        list.find(u => u.Email === defaultEmail)?.Email ||
        list[0]?.Email ||
        ''

      const overrides: { email?: string; month?: number; year?: number } = {}
      if (!emailInUrl || emailInUrl !== validEmail) overrides.email = validEmail
      if (!searchParams.get('month')) overrides.month = now.getMonth() + 1
      if (!searchParams.get('year')) overrides.year = now.getFullYear()

      if (Object.keys(overrides).length > 0) {
        const params = new URLSearchParams(searchParams.toString())
        if (overrides.email !== undefined) params.set('email', overrides.email)
        if (overrides.month !== undefined) params.set('month', String(overrides.month))
        if (overrides.year !== undefined) params.set('year', String(overrides.year))
        router.replace(`${pathname}?${params.toString()}`)
      }
    })
  }, [currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session state ─────────────────────────────────────────────
  const [session, setSession] = useState<MonthlySession | null>(null)
  const [coachTodos, setCoachTodos] = useState<CoachTodo[]>([])
  const [athleteTodos, setAthleteTodos] = useState<AthleteTodo[]>([])
  const [highlights, setHighlights] = useState<AthleteHighlight[]>([])
  const [achievements, setAchievements] = useState<MonthlyAchievement[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)

  // ── Notes ─────────────────────────────────────────────────────
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  // ── Add inputs ────────────────────────────────────────────────
  const [newCoachTodo, setNewCoachTodo] = useState('')
  const [newAthleteTodo, setNewAthleteTodo] = useState('')
  const [newHighlight, setNewHighlight] = useState('')
  const [newAchievement, setNewAchievement] = useState('')

  // ── Inline edit state ─────────────────────────────────────────
  const [editingCoachTodo, setEditingCoachTodo] = useState<{ id: number; task: string } | null>(null)
  const [editingAthleteTodo, setEditingAthleteTodo] = useState<{ id: number; task: string } | null>(null)
  const [editingHighlight, setEditingHighlight] = useState<{ id: number; content: string } | null>(null)
  const [editingAchievement, setEditingAchievement] = useState<{ id: number; content: string } | null>(null)

  // ── Load session when filters change ─────────────────────────
  const loadSession = useCallback(async () => {
    if (!selectedEmail || !usersLoaded) return
    setSessionLoading(true)
    const s = await getSession(selectedEmail, selectedYear, selectedMonth)
    setSession(s)
    setNotes(s?.Notes ?? '')
    if (s) {
      const [ct, at, hl, ac] = await Promise.all([
        getCoachTodos(s.SessionID),
        getAthleteTodos(s.SessionID),
        getHighlights(s.SessionID),
        getAchievements(s.SessionID),
      ])
      setCoachTodos(ct)
      setAthleteTodos(at)
      setHighlights(hl)
      setAchievements(ac)
    } else {
      setCoachTodos([])
      setAthleteTodos([])
      setHighlights([])
      setAchievements([])
    }
    setSessionLoading(false)
  }, [selectedEmail, selectedYear, selectedMonth, usersLoaded])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  // ── Create session ────────────────────────────────────────────
  const handleCreateSession = async () => {
    if (!currentUser) return
    const s = await createSession(selectedEmail, currentUser.Email, selectedYear, selectedMonth)
    if (s) {
      setSession(s)
      setNotes('')
      setCoachTodos([])
      setAthleteTodos([])
      setHighlights([])
      setAchievements([])
    }
  }

  // ── Notes save on blur ────────────────────────────────────────
  const handleNotesBlur = async () => {
    if (!session) return
    setNotesSaving(true)
    await updateSessionNotes(session.SessionID, notes)
    setNotesSaving(false)
  }

  // ── Coach todos ───────────────────────────────────────────────
  const handleAddCoachTodo = async () => {
    if (!session || !newCoachTodo.trim()) return
    const todo = await addCoachTodo(session.SessionID, newCoachTodo.trim())
    if (todo) { setCoachTodos(prev => [...prev, todo]); setNewCoachTodo('') }
  }

  const handleToggleCoachTodo = async (todoId: number, completed: boolean) => {
    const ok = await toggleCoachTodo(todoId, completed)
    if (ok) setCoachTodos(prev => prev.map(t =>
      t.TodoID === todoId ? { ...t, Completed: completed, CompletedAt: completed ? new Date().toISOString() : null } : t
    ))
  }

  const handleSaveCoachTodo = async () => {
    if (!editingCoachTodo) return
    const ok = await updateCoachTodo(editingCoachTodo.id, editingCoachTodo.task)
    if (ok) {
      setCoachTodos(prev => prev.map(t => t.TodoID === editingCoachTodo.id ? { ...t, Task: editingCoachTodo.task } : t))
      setEditingCoachTodo(null)
    }
  }

  const handleDeleteCoachTodo = async (todoId: number) => {
    const ok = await deleteCoachTodo(todoId)
    if (ok) setCoachTodos(prev => prev.filter(t => t.TodoID !== todoId))
  }

  // ── Athlete todos ─────────────────────────────────────────────
  const handleAddAthleteTodo = async () => {
    if (!session || !newAthleteTodo.trim()) return
    const todo = await addAthleteTodo(session.SessionID, newAthleteTodo.trim())
    if (todo) { setAthleteTodos(prev => [...prev, todo]); setNewAthleteTodo('') }
  }

  const handleToggleAthleteTodo = async (todoId: number, completed: boolean) => {
    const ok = await toggleAthleteTodo(todoId, completed)
    if (ok) setAthleteTodos(prev => prev.map(t =>
      t.TodoID === todoId ? { ...t, Completed: completed, CompletedAt: completed ? new Date().toISOString() : null } : t
    ))
  }

  const handleSaveAthleteTodo = async () => {
    if (!editingAthleteTodo) return
    const ok = await updateAthleteTodo(editingAthleteTodo.id, editingAthleteTodo.task)
    if (ok) {
      setAthleteTodos(prev => prev.map(t => t.TodoID === editingAthleteTodo.id ? { ...t, Task: editingAthleteTodo.task } : t))
      setEditingAthleteTodo(null)
    }
  }

  const handleDeleteAthleteTodo = async (todoId: number) => {
    const ok = await deleteAthleteTodo(todoId)
    if (ok) setAthleteTodos(prev => prev.filter(t => t.TodoID !== todoId))
  }

  // ── Achievements ──────────────────────────────────────────────
  const handleAddAchievement = async () => {
    if (!session || !newAchievement.trim()) return
    const ac = await addAchievement(session.SessionID, newAchievement.trim())
    if (ac) { setAchievements(prev => [...prev, ac]); setNewAchievement('') }
  }

  const handleSaveAchievement = async () => {
    if (!editingAchievement) return
    const ok = await updateAchievement(editingAchievement.id, editingAchievement.content)
    if (ok) {
      setAchievements(prev => prev.map(a => a.AchievementID === editingAchievement.id ? { ...a, Content: editingAchievement.content } : a))
      setEditingAchievement(null)
    }
  }

  const handleDeleteAchievement = async (acId: number) => {
    const ok = await deleteAchievement(acId)
    if (ok) setAchievements(prev => prev.filter(a => a.AchievementID !== acId))
  }

  // ── Highlights ────────────────────────────────────────────────
  const handleAddHighlight = async () => {
    if (!session || !newHighlight.trim()) return
    const hl = await addHighlight(session.SessionID, newHighlight.trim())
    if (hl) { setHighlights(prev => [...prev, hl]); setNewHighlight('') }
  }

  const handleSaveHighlight = async () => {
    if (!editingHighlight) return
    const ok = await updateHighlight(editingHighlight.id, editingHighlight.content)
    if (ok) {
      setHighlights(prev => prev.map(h => h.HighlightID === editingHighlight.id ? { ...h, Content: editingHighlight.content } : h))
      setEditingHighlight(null)
    }
  }

  const handleDeleteHighlight = async (hlId: number) => {
    const ok = await deleteHighlight(hlId)
    if (ok) setHighlights(prev => prev.filter(h => h.HighlightID !== hlId))
  }

  // ── Helpers ───────────────────────────────────────────────────
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const selectedUserName = users.find(u => u.Email === selectedEmail)?.Name ?? selectedEmail

  if (!usersLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">טוען...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">פגישות חודשיות</h1>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">

          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-gray-500">ספורטאי</label>
            <select
              value={selectedEmail}
              onChange={e => updateUrl({ email: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {users.map(u => (
                <option key={u.Email} value={u.Email}>{u.Name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs font-medium text-gray-500">חודש</label>
            <select
              value={selectedMonth}
              onChange={e => updateUrl({ month: Number(e.target.value) })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[100px]">
            <label className="text-xs font-medium text-gray-500">שנה</label>
            <select
              value={selectedYear}
              onChange={e => updateUrl({ year: Number(e.target.value) })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ── Session content ── */}
      {sessionLoading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-400">טוען פגישה...</p>
        </div>
      ) : !session ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <p className="text-gray-500 text-base mb-1">
            אין פגישה עבור {selectedUserName}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </p>
          {canEdit && (
            <button
              onClick={handleCreateSession}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              + צור פגישה חדשה
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">

          {/* Session header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl px-5 py-4">
            <h2 className="font-bold text-lg">{MONTH_NAMES[session.Month - 1]} {session.Year}</h2>
            <p className="text-blue-200 text-sm mt-0.5">{selectedUserName}</p>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">📝 הערות מאמן</h3>
            {canEdit ? (
              <div className="relative">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="הוסף הערות לפגישה..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {notesSaving && (
                  <span className="absolute bottom-3 left-3 text-xs text-gray-400">שומר...</span>
                )}
              </div>
            ) : (
              <p className="text-gray-700 text-sm whitespace-pre-wrap min-h-[3rem]">
                {notes || <span className="text-gray-400">אין הערות</span>}
              </p>
            )}
          </div>

          {/* Coach Todos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">✅ משימות מאמן</h3>
            <div className="space-y-1">
              {coachTodos.length === 0 && <p className="text-gray-400 text-sm py-1">אין משימות</p>}
              {coachTodos.map(todo => (
                <div key={todo.TodoID} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group">
                  <input
                    type="checkbox"
                    checked={todo.Completed}
                    onChange={e => handleToggleCoachTodo(todo.TodoID, e.target.checked)}
                    disabled={!canEdit}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer disabled:cursor-default flex-shrink-0"
                  />
                  {canEdit && editingCoachTodo?.id === todo.TodoID ? (
                    <InlineEditInput
                      value={editingCoachTodo.task}
                      onChange={v => setEditingCoachTodo({ ...editingCoachTodo, task: v })}
                      onSave={handleSaveCoachTodo}
                      onCancel={() => setEditingCoachTodo(null)}
                    />
                  ) : (
                    <>
                      <span className={`flex-1 text-sm ${todo.Completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {todo.Task}
                      </span>
                      {!canEdit && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          todo.Completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {todo.Completed ? 'הושלם' : 'ממתין'}
                        </span>
                      )}
                      {canEdit && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                          <button onClick={() => setEditingCoachTodo({ id: todo.TodoID, task: todo.Task })} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="ערוך">✏️</button>
                          <button onClick={() => handleDeleteCoachTodo(todo.TodoID)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="מחק">🗑️</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            {canEdit && (
              <AddRow value={newCoachTodo} onChange={setNewCoachTodo} onAdd={handleAddCoachTodo} placeholder="משימת מאמן חדשה..." />
            )}
          </div>

          {/* Athlete Todos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">🎯 משימות ספורטאי</h3>
            <div className="space-y-1">
              {athleteTodos.length === 0 && <p className="text-gray-400 text-sm py-1">אין משימות</p>}
              {athleteTodos.map(todo => (
                <div key={todo.TodoID} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group">
                  <input
                    type="checkbox"
                    checked={todo.Completed}
                    onChange={e => handleToggleAthleteTodo(todo.TodoID, e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer flex-shrink-0"
                  />
                  {canEdit && editingAthleteTodo?.id === todo.TodoID ? (
                    <InlineEditInput
                      value={editingAthleteTodo.task}
                      onChange={v => setEditingAthleteTodo({ ...editingAthleteTodo, task: v })}
                      onSave={handleSaveAthleteTodo}
                      onCancel={() => setEditingAthleteTodo(null)}
                    />
                  ) : (
                    <>
                      <span className={`flex-1 text-sm ${todo.Completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {todo.Task}
                      </span>
                      {canEdit && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                          <button onClick={() => setEditingAthleteTodo({ id: todo.TodoID, task: todo.Task })} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="ערוך">✏️</button>
                          <button onClick={() => handleDeleteAthleteTodo(todo.TodoID)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="מחק">🗑️</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            {canEdit && (
              <AddRow value={newAthleteTodo} onChange={setNewAthleteTodo} onAdd={handleAddAthleteTodo} placeholder="משימת ספורטאי חדשה..." />
            )}
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">⭐ הישגים חודשיים</h3>
            <div className="space-y-1">
              {achievements.length === 0 && <p className="text-gray-400 text-sm py-1">אין הישגים</p>}
              {achievements.map(ac => (
                <div key={ac.AchievementID} className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group">
                  <span className="text-yellow-400 flex-shrink-0 mt-0.5">⭐</span>
                  {canEdit && editingAchievement?.id === ac.AchievementID ? (
                    <InlineEditInput
                      value={editingAchievement.content}
                      onChange={v => setEditingAchievement({ ...editingAchievement, content: v })}
                      onSave={handleSaveAchievement}
                      onCancel={() => setEditingAchievement(null)}
                    />
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{ac.Content}</span>
                      {canEdit && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                          <button onClick={() => setEditingAchievement({ id: ac.AchievementID, content: ac.Content })} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="ערוך">✏️</button>
                          <button onClick={() => handleDeleteAchievement(ac.AchievementID)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="מחק">🗑️</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            {canEdit && (
              <AddRow value={newAchievement} onChange={setNewAchievement} onAdd={handleAddAchievement} placeholder="הוסף הישג חודשי..." />
            )}
          </div>

          {/* Highlights */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">📌 דגשים חודשיים</h3>
            <div className="space-y-1">
              {highlights.length === 0 && <p className="text-gray-400 text-sm py-1">אין דגשים</p>}
              {highlights.map(hl => (
                <div key={hl.HighlightID} className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group">
                  <span className="flex-shrink-0 mt-0.5">📌</span>
                  {canEdit && editingHighlight?.id === hl.HighlightID ? (
                    <InlineEditInput
                      value={editingHighlight.content}
                      onChange={v => setEditingHighlight({ ...editingHighlight, content: v })}
                      onSave={handleSaveHighlight}
                      onCancel={() => setEditingHighlight(null)}
                    />
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{hl.Content}</span>
                      {canEdit && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                          <button onClick={() => setEditingHighlight({ id: hl.HighlightID, content: hl.Content })} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="ערוך">✏️</button>
                          <button onClick={() => handleDeleteHighlight(hl.HighlightID)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="מחק">🗑️</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            {canEdit && (
              <AddRow value={newHighlight} onChange={setNewHighlight} onAdd={handleAddHighlight} placeholder="הוסף דגש חודשי..." />
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ─── Page export — wraps content in Suspense for useSearchParams ──────────────

export default function MonthlySessionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <p className="text-gray-400">טוען...</p>
      </div>
    }>
      <MonthlySessionsContent />
    </Suspense>
  )
}
