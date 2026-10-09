'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { LuCircleCheck, LuLoaderCircle, LuMap, LuPencil, LuPlus, LuSave, LuTrash2 } from 'react-icons/lu'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoadmapCategory {
  CategoryID: number
  Name: string
  Icon: string
  Color: string
  Order: number
  Group: string
}

interface Prerequisite {
  categoryId: number
  categoryName: string
  minLevel: number
}

interface RoadmapLevel {
  id?: number
  LevelID?: number
  CategoryID: number
  LevelNumber: number
  Name: string
  Description: string
  Prerequisites: Prerequisite[]
}

// ─── Emoji Picker ────────────────────────────────────────────────────────────

const COMMON_EMOJIS = [
  '🧗','🏔️','💪','🎯','⚡','🔥','🌟','🏆','🥇','🎖️',
  '🦅','🦁','🐉','⛰️','🪨','🌊','🧠','❤️','💎','🛡️',
  '⚔️','🎪','🎨','🎭','🚀','✨','🌈','🔮','🎲','🃏'
]

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 text-2xl border border-line rounded-lg flex items-center justify-center hover:bg-surface"
      >
        {value || '?'}
      </button>
      {open && (
        <div className="absolute top-14 right-0 z-50 bg-surface border border-line rounded-xl shadow-xl p-3 grid grid-cols-5 gap-1 w-52">
          {COMMON_EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => { onChange(e); setOpen(false) }}
              className="text-2xl hover:bg-surface rounded p-1"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCatId = (cat: RoadmapCategory) => cat.CategoryID
const getLevelId = (level: RoadmapLevel) => level.LevelID ?? level.id

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`
  }
}

const COLOR_OPTIONS = [
  { label: 'כחול', value: 'blue' },
  { label: 'ירוק', value: 'green' },
  { label: 'סגול', value: 'purple' },
  { label: 'אדום', value: 'red' },
  { label: 'כתום', value: 'orange' },
  { label: 'צהוב', value: 'yellow' },
  { label: 'ורוד', value: 'pink' },
  { label: 'אפור', value: 'gray' },
]

const COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-accent/10 border-accent/30 text-accent',
  green: 'bg-success/10 border-success/30 text-success',
  purple: 'bg-info/10 border-info/30 text-info',
  red: 'bg-danger/10 border-danger/30 text-danger',
  orange: 'bg-warning/10 border-warning/30 text-warning',
  yellow: 'bg-warning/10 border-warning/30 text-warning',
  pink: 'bg-info/10 border-info/30 text-info',
  gray: 'bg-surface border-line text-fg',
}

// ─── Level Edit Modal ─────────────────────────────────────────────────────────

interface LevelModalProps {
  level: Partial<RoadmapLevel> | null
  categories: RoadmapCategory[]
  onClose: () => void
  onSave: (level: Partial<RoadmapLevel>) => Promise<void>
  saving: boolean
}

function LevelModal({ level, categories, onClose, onSave, saving }: LevelModalProps) {
  const [form, setForm] = useState<Partial<RoadmapLevel>>(level ?? {})
  const [addingPrereq, setAddingPrereq] = useState(false)
  const [prereqCatId, setPrereqCatId] = useState<number | ''>('')
  const [prereqMinLevel, setPrereqMinLevel] = useState(1)

  const prereqs: Prerequisite[] = form.Prerequisites ?? []

  const addPrereq = () => {
    if (!prereqCatId) return
    const cat = categories.find(c => getCatId(c) === Number(prereqCatId))
    if (!cat) return
    const catId = getCatId(cat)
    if (catId === undefined) return
    if (prereqs.some(p => p.categoryId === catId)) return
    setForm(f => ({
      ...f,
      Prerequisites: [...prereqs, { categoryId: catId, categoryName: cat.Name, minLevel: prereqMinLevel }]
    }))
    setPrereqCatId('')
    setPrereqMinLevel(1)
    setAddingPrereq(false)
  }

  const removePrereq = (catId: number) => {
    setForm(f => ({ ...f, Prerequisites: prereqs.filter(p => p.categoryId !== catId) }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-raised border border-line-strong rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-fg">
            {form.id ? <><LuPencil aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />עריכת רמה</> : <><LuPlus aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />רמה חדשה</>}
          </h2>
          <button onClick={onClose} className="text-faint hover:text-fg-3 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-1">שם הרמה *</label>
            <input
              type="text"
              value={form.Name ?? ''}
              onChange={e => setForm(f => ({ ...f, Name: e.target.value }))}
              className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
              placeholder="שם הרמה"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-1">תיאור</label>
            <textarea
              value={form.Description ?? ''}
              onChange={e => setForm(f => ({ ...f, Description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent resize-none"
              placeholder="תיאור הרמה..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-fg-2">תנאים מקדימים</label>
              {!addingPrereq && (
                <button
                  type="button"
                  onClick={() => setAddingPrereq(true)}
                  className="text-sm text-accent hover:text-accent/90 font-medium"
                >
                  + הוסף תנאי
                </button>
              )}
            </div>

            {prereqs.length === 0 && !addingPrereq && (
              <p className="text-sm text-faint italic">אין תנאים מקדימים</p>
            )}

            <div className="space-y-2">
              {prereqs.map(p => (
                <div key={p.categoryId} className="flex items-center justify-between bg-surface border border-line rounded-lg px-3 py-2">
                  <span className="text-sm text-fg-2">
                    {categories.find(c => c.CategoryID === p.categoryId)?.Icon} {p.categoryName} — רמה מינימלית {p.minLevel}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePrereq(p.categoryId)}
                    className="text-danger hover:text-danger/90 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {addingPrereq && (
              <div className="mt-2 p-3 bg-accent/15 border border-accent rounded-lg space-y-2">
                <select
                  value={prereqCatId}
                  onChange={e => setPrereqCatId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-accent"
                >
                  <option value="">בחר קטגוריה</option>
                  {categories.map(c => (
                    <option key={c.CategoryID} value={c.CategoryID}>{c.Icon} {c.Name}</option>
                  ))}
                </select>
                <div className="flex gap-2 items-center">
                  <label className="text-sm text-fg-3 whitespace-nowrap">רמה מינימלית:</label>
                  <input
                    type="number"
                    min={1}
                    value={prereqMinLevel}
                    onChange={e => setPrereqMinLevel(Number(e.target.value))}
                    className="w-20 px-2 py-1 border border-line rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={addPrereq}
                    className="px-3 py-1 bg-accent text-on-accent rounded text-sm hover:bg-accent-hover"
                  >
                    הוסף
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingPrereq(false)}
                    className="px-3 py-1 bg-raised text-fg-2 rounded text-sm hover:bg-raised/90"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => onSave(form)}
              disabled={saving || !form.Name}
              className="flex-1 py-2.5 bg-accent text-on-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 font-medium"
            >
              {saving ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />שומר...</> : <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שמור</>}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-raised text-fg-2 rounded-lg hover:bg-raised/90"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Category Modal ───────────────────────────────────────────────────────────

const GROUP_OPTIONS = ['כח ספציפי', 'כח כללי', 'מוביליות', 'כללי']

interface CategoryModalProps {
  onClose: () => void
  onSave: (cat: { Name: string; Icon: string; Color: string; Group: string }) => Promise<void>
  saving: boolean
}

function CategoryModal({ onClose, onSave, saving }: CategoryModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🧗')
  const [color, setColor] = useState('blue')
  const [group, setGroup] = useState('כללי')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-fg"><LuPlus aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />קטגוריה חדשה</h2>
          <button onClick={onClose} className="text-faint hover:text-fg-3 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-1">שם הקטגוריה *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
              placeholder="שם הקטגוריה"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">אייקון</label>
            <EmojiPicker value={icon} onChange={setIcon} />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">צבע</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
 COLOR_CLASSES[opt.value]
 } ${color === opt.value ? 'ring-2 ring-offset-1 ring-accent' : 'opacity-60 hover:opacity-100'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">קבוצה</label>
            <select
              value={group}
              onChange={e => setGroup(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent text-sm"
            >
              {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => onSave({ Name: name, Icon: icon, Color: color, Group: group })}
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 bg-success text-on-accent rounded-lg hover:bg-success/90 disabled:opacity-50 font-medium"
            >
              {saving ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />שומר...</> : <><LuCircleCheck aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />צור קטגוריה</>}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-raised text-fg-2 rounded-lg hover:bg-raised/90"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Category Modal ──────────────────────────────────────────────────────

interface EditCategoryModalProps {
  cat: RoadmapCategory
  onClose: () => void
  onSave: (cat: RoadmapCategory) => Promise<void>
  saving: boolean
}

function EditCategoryModal({ cat, onClose, onSave, saving }: EditCategoryModalProps) {
  const [form, setForm] = useState({ ...cat })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-fg"><LuPencil aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />עריכת קטגוריה</h2>
          <button onClick={onClose} className="text-faint hover:text-fg-3 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-1">שם הקטגוריה *</label>
            <input
              type="text"
              value={form.Name}
              onChange={e => setForm(f => ({ ...f, Name: e.target.value }))}
              className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">אייקון</label>
            <EmojiPicker value={form.Icon} onChange={v => setForm(f => ({ ...f, Icon: v }))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">צבע</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, Color: opt.value }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
 COLOR_CLASSES[opt.value]
 } ${form.Color === opt.value ? 'ring-2 ring-offset-1 ring-accent' : 'opacity-60 hover:opacity-100'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">קבוצה</label>
            <select
              value={form.Group || 'כללי'}
              onChange={e => setForm(f => ({ ...f, Group: e.target.value }))}
              className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent text-sm"
            >
              {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => onSave(form)}
              disabled={saving || !form.Name.trim()}
              className="flex-1 py-2.5 bg-accent text-on-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 font-medium"
            >
              {saving ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />שומר...</> : <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שמור</>}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-raised text-fg-2 rounded-lg hover:bg-raised/90"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Draggable Level Row ──────────────────────────────────────────────────────

const LEVEL_DRAG_TYPE = 'ROADMAP_LEVEL'

interface DragItem { index: number }

interface DraggableLevelRowProps {
  level: RoadmapLevel
  index: number
  categories: RoadmapCategory[]
  onEdit: (level: RoadmapLevel) => void
  onDelete: (level: RoadmapLevel) => void
  onMove: (from: number, to: number) => void
}

function DraggableLevelRow({ level, index, categories, onEdit, onDelete, onMove }: DraggableLevelRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onMoveRef = useRef(onMove)
  useEffect(() => { onMoveRef.current = onMove }, [onMove])

  const [{ isDragging }, drag, preview] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: LEVEL_DRAG_TYPE,
    item: { index },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  })

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: LEVEL_DRAG_TYPE,
    hover(item) {
      if (item.index === index) return
      onMoveRef.current(item.index, index)
      item.index = index
    },
    collect: monitor => ({ isOver: monitor.isOver() }),
  })

  preview(drop(ref))

  return (
    <div
      ref={ref}
      className={`px-5 py-4 flex items-start gap-4 transition-colors ${
 isDragging ? 'opacity-30' : isOver ? 'bg-accent/15' : 'hover:bg-surface'
 }`}
    >
      <div
        ref={drag as unknown as React.RefCallback<HTMLDivElement>}
        className="self-center cursor-grab active:cursor-grabbing text-faint hover:text-muted shrink-0 select-none text-xl leading-none"
        title="גרור לשינוי סדר"
      >
        ⠿
      </div>
      <div className="w-9 h-9 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center shrink-0">
        {level.LevelNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-fg">{level.Name}</p>
        {level.Description && (
          <p className="text-sm text-muted mt-0.5 line-clamp-2">{level.Description}</p>
        )}
        {level.Prerequisites?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {level.Prerequisites.map(p => (
              <span key={p.categoryId} className="text-xs bg-warning/15 border border-warning text-warning rounded px-2 py-0.5">
                {categories.find(c => getCatId(c) === p.categoryId)?.Icon} {p.categoryName} ≥{p.minLevel}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onEdit(level)}
          className="px-2.5 py-1.5 bg-accent text-on-accent rounded-lg hover:bg-accent/90 text-sm"
          title="ערוך"
        >
          <LuPencil aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
        </button>
        <button
          onClick={() => onDelete(level)}
          className="px-2.5 py-1.5 bg-danger text-on-accent rounded-lg hover:bg-danger/90 text-sm"
          title="מחק"
        >
          <LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoadmapBuilderPage() {
  const { loading: authLoading, currentUser } = useAuth()
  const signedInEmail = currentUser?.Email
  const router = useRouter()

  const [authorized, setAuthorized] = useState(false)
  const [categories, setCategories] = useState<RoadmapCategory[]>([])
  const [levels, setLevels] = useState<RoadmapLevel[]>([])
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingLevels, setLoadingLevels] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editingLevel, setEditingLevel] = useState<Partial<RoadmapLevel> | null>(null)
  const [editingCat, setEditingCat] = useState<RoadmapCategory | null>(null)
  const [showNewCatModal, setShowNewCatModal] = useState(false)
  const [showNewLevelRow, setShowNewLevelRow] = useState(false)
  const [newLevelName, setNewLevelName] = useState('')

  // ── Auth check ──────────────────────────────────────────────────────────────
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

  // ── Fetch categories ────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/roadmap/categories', { headers })
      const data = await res.json()
      setCategories(data ?? [])
    } finally {
      setLoadingCats(false)
    }
  }, [])

  // ── Fetch levels for selected category ─────────────────────────────────────
  const fetchLevels = useCallback(async (catId: number) => {
    setLoadingLevels(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/roadmap/levels?categoryId=${catId}`, { headers })
      const data: RoadmapLevel[] = await res.json()
      setLevels(data ?? [])
      setSavedLevelIds((data ?? []).map(l => getLevelId(l) as number))
    } finally {
      setLoadingLevels(false)
    }
  }, [])

  useEffect(() => { if (authorized) fetchCategories() }, [authorized, fetchCategories])
  useEffect(() => { if (selectedCatId !== null) fetchLevels(selectedCatId) }, [selectedCatId, fetchLevels])

  // ── Save level ──────────────────────────────────────────────────────────────
  const handleSaveLevel = async (form: Partial<RoadmapLevel>) => {
    if (!selectedCatId) return
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const levelId = getLevelId(form as RoadmapLevel)
      const isNew = !levelId
      const nextNumber = isNew
        ? (levels.length > 0 ? Math.max(...levels.map(l => l.LevelNumber)) + 1 : 1)
        : form.LevelNumber

      const payload = { ...form, CategoryID: selectedCatId, LevelNumber: nextNumber }
      const url = isNew ? '/api/admin/roadmap/levels' : `/api/admin/roadmap/levels/${levelId}`
      const method = isNew ? 'POST' : 'PUT'


      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      const resBody = await res.json()

      if (!res.ok) throw new Error(resBody.error ?? JSON.stringify(resBody))

      setEditingLevel(null)
      await fetchLevels(selectedCatId)
    } catch (err: any) {
      alert(`שגיאה בשמירה: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Quick add level ─────────────────────────────────────────────────────────
  const handleQuickAddLevel = async () => {
    if (!newLevelName.trim() || !selectedCatId) return
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const nextNumber = levels.length > 0 ? Math.max(...levels.map(l => l.LevelNumber)) + 1 : 1
      const res = await fetch('/api/admin/roadmap/levels', {
        method: 'POST',
        headers,
        body: JSON.stringify({ CategoryID: selectedCatId, LevelNumber: nextNumber, Name: newLevelName, Description: '' })
      })
      const resBody = await res.json()

      if (!res.ok) throw new Error(resBody.error ?? JSON.stringify(resBody))
      setNewLevelName('')
      setShowNewLevelRow(false)
      await fetchLevels(selectedCatId)
    } catch (err: any) {
      alert(`שגיאה בהוספה: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete level ────────────────────────────────────────────────────────────
  const handleDeleteLevel = async (level: RoadmapLevel) => {
    if (!confirm(`למחוק את הרמה "${level.Name}"?`)) return
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/roadmap/levels/${getLevelId(level)}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error((await res.json()).error)
      await fetchLevels(selectedCatId!)
    } catch (err: any) {
      alert(`שגיאה במחיקה: ${err.message}`)
    }
  }

  // ── Delete category ─────────────────────────────────────────────────────────
  const handleDeleteCategory = async (cat: RoadmapCategory) => {
    if (!confirm(`למחוק את הקטגוריה "${cat.Name}" וכל הרמות שלה?`)) return
    try {
      const headers = await getAuthHeaders()
      const catId = getCatId(cat)
      const res = await fetch(`/api/admin/roadmap/categories/${catId}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error((await res.json()).error)
      if (selectedCatId === catId) { setSelectedCatId(null); setLevels([]) }
      await fetchCategories()
    } catch (err: any) {
      alert(`שגיאה במחיקה: ${err.message}`)
    }
  }

  // ── Update category ─────────────────────────────────────────────────────────
  const handleUpdateCategory = async (cat: RoadmapCategory) => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/roadmap/categories/${getCatId(cat)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(cat),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setEditingCat(null)
      await fetchCategories()
    } catch (err: any) {
      alert(`שגיאה בעדכון: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Save new category ───────────────────────────────────────────────────────
  const handleSaveCategory = async (cat: { Name: string; Icon: string; Color: string; Group: string }) => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/roadmap/categories', {
        method: 'POST',
        headers,
        body: JSON.stringify(cat)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowNewCatModal(false)
      await fetchCategories()
    } catch (err: any) {
      alert(`שגיאה ביצירת קטגוריה: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Drag-and-drop reorder ───────────────────────────────────────────────────
  const [savedLevelIds, setSavedLevelIds] = useState<number[]>([])

  const moveLevel = useCallback((from: number, to: number) => {
    setLevels(prev => {
      const next = [...prev]
      const [removed] = next.splice(from, 1)
      next.splice(to, 0, removed)
      return next
    })
  }, [])

  const orderChanged = levels.length > 0 &&
    levels.map(l => getLevelId(l)).join() !== savedLevelIds.join()

  const handleSaveOrder = async () => {
    const renumbered = levels.map((l, i) => ({ ...l, LevelNumber: i + 1 }))
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/roadmap/levels', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ updates: renumbered.map(l => ({ id: getLevelId(l), levelNumber: l.LevelNumber })) }),
      })
      const resBody = await res.json()
      if (!res.ok) throw new Error(resBody.error ?? JSON.stringify(resBody))
      setLevels(renumbered)
      setSavedLevelIds(renumbered.map(l => getLevelId(l) as number))
    } catch (err: any) {
      alert(`שגיאה בשמירת סדר: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const selectedCat = categories.find(c => getCatId(c) === selectedCatId)

  if (!authorized) return null

  if (loadingCats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-fg-3">טוען...</p>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
    <div dir="rtl" className="min-h-screen bg-surface pb-20">
      {/* Header */}
      <div className="bg-surface border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-fg"><LuMap aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />בניית Roadmap</h1>
          <p className="text-sm text-muted mt-0.5">ניהול קטגוריות ורמות מסלול ההתקדמות</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* Left panel — Categories */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="bg-surface rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-surface">
              <h2 className="font-semibold text-fg-2">קטגוריות</h2>
            </div>

            {categories.length === 0 ? (
              <p className="text-center text-faint text-sm py-8">אין קטגוריות עדיין</p>
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
                <div className="divide-y">
                  {groupKeys.map(groupName => (
                    <div key={groupName}>
                      <p className="px-4 py-1.5 text-xs font-semibold text-faint bg-surface border-b">
                        {groupName}
                      </p>
                      {grouped[groupName].map((cat, idx) => {
                        const catId = getCatId(cat)
                        const colorClass = COLOR_CLASSES[cat.Color] ?? COLOR_CLASSES.gray
                        const isSelected = selectedCatId === catId
                        const levelCount = isSelected ? levels.length : '...'
                        return (
                          <div key={catId ?? idx} className="group border-b last:border-b-0">
                            <div
                              className={`w-full text-right px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface transition-colors ${
 isSelected ? 'bg-accent/15 border-r-4 border-accent' : ''
 }`}
                              onClick={() => setSelectedCatId(catId ?? null)}
                            >
                              <span className={`text-xl rounded-lg p-1.5 border ${colorClass}`}>{cat.Icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${isSelected ? 'text-accent' : 'text-fg'}`}>
                                  {cat.Name}
                                </p>
                                {isSelected && (
                                  <p className="text-xs text-muted">{levelCount} רמות</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setEditingCat(cat) }}
                                className="text-faint hover:text-accent transition-colors text-lg leading-none opacity-0 group-hover:opacity-100"
                                title="ערוך קטגוריה"
                              >
                                <LuPencil aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
                              </button>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleDeleteCategory(cat) }}
                                className="text-faint hover:text-danger transition-colors text-lg leading-none opacity-0 group-hover:opacity-100"
                                title="מחק קטגוריה"
                              >
                                <LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          <button
            onClick={() => setShowNewCatModal(true)}
            className="w-full py-2.5 border-2 border-dashed border-line rounded-xl text-muted hover:border-accent hover:text-accent transition-colors text-sm font-medium"
          >
            + קטגוריה חדשה
          </button>
        </div>

        {/* Right panel — Levels */}
        <div className="flex-1">
          {!selectedCatId ? (
            <div className="bg-surface rounded-xl border flex items-center justify-center h-64">
              <div className="text-center text-faint">
                <p className="text-4xl mb-2">👈</p>
                <p className="text-sm">בחר קטגוריה כדי לראות את הרמות שלה</p>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border overflow-hidden">
              <div className="px-5 py-4 border-b bg-surface flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedCat?.Icon}</span>
                  <div>
                    <h2 className="font-semibold text-fg">{selectedCat?.Name}</h2>
                    <p className="text-xs text-muted">{levels.length} רמות</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {orderChanged && (
                    <button
                      onClick={handleSaveOrder}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-success text-on-accent rounded-lg hover:bg-success/90 disabled:opacity-50 font-medium"
                    >
                      {saving ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />שומר...</> : <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שמור סדר</>}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCategory(selectedCat!)}
                    className="px-3 py-1.5 text-sm text-danger border border-danger rounded-lg hover:bg-danger/15"
                  >
                    <LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />מחק קטגוריה
                  </button>
                </div>
              </div>

              {loadingLevels ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
                </div>
              ) : (
                <div className="divide-y">
                  {levels.length === 0 && !showNewLevelRow && (
                    <p className="text-center text-faint text-sm py-10">אין רמות עדיין — הוסף רמה ראשונה</p>
                  )}

                  {levels.map((level, idx) => (
                    <DraggableLevelRow
                      key={getLevelId(level) ?? idx}
                      level={level}
                      index={idx}
                      categories={categories}
                      onEdit={setEditingLevel}
                      onDelete={handleDeleteLevel}
                      onMove={moveLevel}
                    />
                  ))}

                  {/* Quick add row */}
                  {showNewLevelRow ? (
                    <div className="px-5 py-4 flex items-center gap-3 bg-accent/15">
                      <div className="w-9 h-9 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center shrink-0">
                        {levels.length + 1}
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={newLevelName}
                        onChange={e => setNewLevelName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleQuickAddLevel(); if (e.key === 'Escape') setShowNewLevelRow(false) }}
                        placeholder="שם הרמה..."
                        className="flex-1 px-3 py-1.5 border border-accent rounded-lg text-sm focus:ring-2 focus:ring-accent"
                      />
                      <button
                        onClick={handleQuickAddLevel}
                        disabled={saving || !newLevelName.trim()}
                        className="px-3 py-1.5 bg-success text-on-accent rounded-lg text-sm hover:bg-success/90 disabled:opacity-50"
                      >
                        הוסף
                      </button>
                      <button
                        onClick={() => { setEditingLevel({ CategoryID: selectedCatId! }); setShowNewLevelRow(false) }}
                        className="px-3 py-1.5 bg-accent text-on-accent rounded-lg text-sm hover:bg-accent-hover"
                        title="פתח עורך מלא"
                      >
                        <LuPencil aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />עורך מלא
                      </button>
                      <button
                        onClick={() => setShowNewLevelRow(false)}
                        className="text-faint hover:text-fg-3 text-xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="px-5 py-3">
                      <button
                        onClick={() => setShowNewLevelRow(true)}
                        className="w-full py-2 border-2 border-dashed border-line rounded-lg text-faint hover:border-accent hover:text-accent transition-colors text-sm"
                      >
                        + הוסף רמה
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Level Edit Modal */}
      {editingLevel !== null && (
        <LevelModal
          level={editingLevel}
          categories={categories}
          onClose={() => setEditingLevel(null)}
          onSave={handleSaveLevel}
          saving={saving}
        />
      )}

      {/* New Category Modal */}
      {showNewCatModal && (
        <CategoryModal
          onClose={() => setShowNewCatModal(false)}
          onSave={handleSaveCategory}
          saving={saving}
        />
      )}

      {/* Edit Category Modal */}
      {editingCat && (
        <EditCategoryModal
          cat={editingCat}
          onClose={() => setEditingCat(null)}
          onSave={handleUpdateCategory}
          saving={saving}
        />
      )}
    </div>
    </DndProvider>
  )
}
