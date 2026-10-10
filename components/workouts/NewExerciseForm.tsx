'use client'

import { useState } from 'react'
import { Exercise } from '@/types/workouts'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'

// Quick "new exercise" form: creates the exercise and adds it to the workout in one step
export default function NewExerciseForm({ initialName, categories, onCreated, onCancel }: {
  initialName: string
  categories: string[]
  onCreated: (exercise: Exercise) => void
  onCancel: () => void
}) {
  const { currentUser } = useAuth()
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState(categories[0] ?? '')
  const [newCategory, setNewCategory] = useState('')
  const [isDuration, setIsDuration] = useState(false)
  const [single, setSingle] = useState(false)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const finalCategory = category === '__new' ? newCategory.trim() : category

  const save = async () => {
    if (!name.trim() || !finalCategory) { setError('צריך שם וקטגוריה'); return }
    setSaving(true); setError('')
    const { data, error: e } = await supabase
      .from('Exercises')
      .insert({
        Name: name.trim(), Category: finalCategory, Description: description.trim(),
        isDuration, IsSingleHand: single, is_dynamic: false,
        Status: 'Active', CreatedBy: currentUser?.Email ?? null, CreatedAt: new Date().toISOString(),
      })
      .select()
      .single()
    setSaving(false)
    if (e || !data) { setError(e?.message ?? 'שגיאה ביצירת התרגיל'); return }
    onCreated(data as Exercise)
  }

  const seg = (on: boolean) => `h-9 rounded-md text-sm font-bold ${on ? 'bg-accent text-on-accent' : 'text-fg-2'}`
  return (
    <div className="mt-3 rounded-lg border border-accent/60 bg-accent/5 p-3 flex flex-col gap-2.5">
      <p className="font-bold text-sm">תרגיל חדש</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="שם התרגיל" aria-label="שם התרגיל" autoFocus className="w-full border rounded-lg px-3 py-2 text-sm" />
      <select value={category} onChange={e => setCategory(e.target.value)} aria-label="קטגוריה" className="w-full border rounded-lg px-3 py-2 text-sm">
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__new">+ קטגוריה חדשה…</option>
      </select>
      {category === '__new' && (
        <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="שם הקטגוריה" aria-label="שם הקטגוריה" className="w-full border rounded-lg px-3 py-2 text-sm" />
      )}
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1" role="group" aria-label="סוג">
        <button type="button" aria-pressed={!isDuration} onClick={() => setIsDuration(false)} className={seg(!isDuration)}>חזרות</button>
        <button type="button" aria-pressed={isDuration} onClick={() => setIsDuration(true)} className={seg(isDuration)}>זמן</button>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={single} onChange={e => setSingle(e.target.checked)} />יד אחת (ימין ושמאל בנפרד)
      </label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="תיאור (לא חובה)" aria-label="תיאור" className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
      {error && <p className="text-danger text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="h-10 px-3 rounded-lg border border-line-strong text-sm font-bold text-fg-2">ביטול</button>
        <button type="button" onClick={save} disabled={saving} className="flex-1 h-10 rounded-lg bg-accent text-on-accent text-sm font-bold disabled:opacity-50">
          {saving ? 'יוצר…' : 'צור והוסף לאימון'}
        </button>
      </div>
    </div>
  )
}
