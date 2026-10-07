// components/exercises/ExerciseModal.tsx
// FINAL VERSION - WITH localStorage PERSISTENCE

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Exercise, ExerciseFormData } from '@/types/exercises'
import { RoadmapCategory } from '@/types/dynamic-exercise'

interface Props {
  exercise: Exercise | null
  onSave: (data: ExerciseFormData) => void
  onClose: () => void
  isDuplicate?: boolean
}

export default function ExerciseModal({ exercise, onSave, onClose, isDuplicate = false }: Props) {
  const [categories, setCategories] = useState<string[]>([])
  const [roadmapCategories, setRoadmapCategories] = useState<RoadmapCategory[]>([])
  const STORAGE_KEY = 'exercise-modal-draft'
  
  // ✨ Load from localStorage if creating new exercise
  const [formData, setFormData] = useState<ExerciseFormData>(() => {
    // Don't load draft if editing existing exercise
    if (exercise && !isDuplicate) {
      return {
        Name: '',
        Description: '',
        Category: '',
        VideoURL: '',
        ImageURL: '',
        IsSingleHand: false,
        isDuration: false,
        is_dynamic: false,
        RoadmapCategoryID: null,
      }
    }

    // Load draft for new exercises
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // Ignore parse errors
        }
      }
    }
    return {
      Name: '',
      Description: '',
      Category: '',
      VideoURL: '',
      ImageURL: '',
      IsSingleHand: false,
      isDuration: false,
      is_dynamic: false,
      RoadmapCategoryID: null,
    }
  })

  const isEditing = !!exercise && !isDuplicate

  // ✨ Save to localStorage on every change (only for new exercises)
  useEffect(() => {
    // Only save draft for new exercises (not editing)
    if (!exercise && (formData.Name || formData.Description || formData.Category)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    }
  }, [formData, exercise])

  // ✨ Clear both localStorage and sessionStorage
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem('exercise-modal-open')
  }

  // Load categories from DB
  useEffect(() => {
    loadCategories()
    loadRoadmapCategories()
  }, [])

  // Load exercise data when editing or duplicating
  useEffect(() => {
    if (exercise) {
      clearDraft()  // Clear any saved draft when editing
      setFormData({
        Name: isDuplicate ? `${exercise.Name} (עותק)` : exercise.Name,
        Description: exercise.Description || '',
        Category: exercise.Category,
        VideoURL: exercise.VideoURL || '',
        ImageURL: exercise.ImageURL || '',
        IsSingleHand: exercise.IsSingleHand,
        isDuration: exercise.isDuration || false,
        is_dynamic: exercise.is_dynamic || false,
        RoadmapCategoryID: exercise.RoadmapCategoryID ?? null,
      })
    }
  }, [exercise, isDuplicate])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('Exercises')
        .select('Category')
        .eq('Status', 'Active')

      if (error) throw error

      const uniqueCategories = [...new Set(data?.map(ex => ex.Category) || [])]
        .filter(Boolean)
        .sort()

      setCategories(uniqueCategories)
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  const loadRoadmapCategories = async () => {
    try {
      const { data } = await supabase
        .from('RoadmapCategories')
        .select('*')
        .eq('IsActive', true)
        .order('Order')
      setRoadmapCategories(data || [])
    } catch (err) {
      console.error('Error loading roadmap categories:', err)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.Name.trim()) {
      alert('⚠️ שם התרגיל הוא שדה חובה')
      return
    }

    if (formData.Name.trim().length < 3) {
      alert('⚠️ שם התרגיל חייב להכיל לפחות 3 תווים')
      return
    }

    if (!formData.Category.trim()) {
      alert('⚠️ קטגוריה היא שדה חובה')
      return
    }

    if (formData.is_dynamic && !formData.RoadmapCategoryID) {
      alert('⚠️ יש לבחור קטגוריית רודמאפ לתרגיל דינמי')
      return
    }

    clearDraft()
    onSave(formData)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const hasContent = formData.Name || formData.Description || formData.Category
      if (hasContent && !exercise) {
        const confirm = window.confirm('יש לך טיוטה לא שמורה. לסגור בלי לשמור?')
        if (!confirm) return
      }
      clearDraft()
      onClose()
    }
  }

  const handleClose = () => {
    const hasContent = formData.Name || formData.Description || formData.Category
    if (hasContent && !exercise) {
      const confirm = window.confirm('יש לך טיוטה לא שמורה. לסגור בלי לשמור?')
      if (!confirm) return
    }
    clearDraft()
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-fg">
              {isEditing ? '✏️ עריכת תרגיל' : 
               isDuplicate ? '📋 שכפול תרגיל' : 
               '➕ תרגיל חדש'}
            </h2>
            <button
              onClick={handleClose}
              className="text-faint hover:text-fg-3 text-2xl leading-none"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">
              שם התרגיל <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.Name}
              onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
              placeholder="לדוגמה: עליות מתח"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              required
              minLength={3}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">
              קטגוריה <span className="text-danger">*</span>
            </label>
            
            <input
              type="text"
              list="category-suggestions"
              value={formData.Category}
              onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
              placeholder="בחר או הקלד קטגוריה..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              required
            />
            
            <datalist id="category-suggestions">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            {categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.slice(0, 8).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, Category: cat })}
                    className={`text-xs px-3 py-1 rounded-full transition ${
                      formData.Category === cat
                        ? 'bg-accent text-white'
                        : 'bg-surface text-fg-2 hover:bg-raised'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">
              תיאור
            </label>
            <textarea
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              placeholder="מטרה, ביצוע, דגשים..."
              rows={5}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">
              קישור לוידאו
            </label>
            <input
              type="url"
              value={formData.VideoURL}
              onChange={(e) => setFormData({ ...formData, VideoURL: e.target.value })}
              placeholder="https://www.youtube.com/..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">
              קישור לתמונה
            </label>
            <input
              type="url"
              value={formData.ImageURL}
              onChange={(e) => setFormData({ ...formData, ImageURL: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* isDuration Checkbox */}
          <div className="bg-accent/15 border border-accent rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDuration}
                onChange={(e) => setFormData({ ...formData, isDuration: e.target.checked })}
                className="w-5 h-5 text-accent rounded focus:ring-2 focus:ring-accent"
              />
              <div>
                <span className="text-sm font-medium text-fg">
                  ⏱️ תרגיל מבוסס זמן
                </span>
                <p className="text-xs text-fg-3 mt-0.5">
                  סמן אם התרגיל נמדד בשניות (למשל: פלאנק, הנג, מתיחה) במקום חזרות
                </p>
              </div>
            </label>
          </div>

          {/* is_dynamic Checkbox */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_dynamic}
                onChange={(e) => setFormData({ ...formData, is_dynamic: e.target.checked, RoadmapCategoryID: e.target.checked ? formData.RoadmapCategoryID : null })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <div>
                <span className="text-sm font-medium text-fg">
                  🧩 תרגיל דינמי (לפי רמות)
                </span>
                <p className="text-xs text-fg-3 mt-0.5">
                  לאחר יצירה תועבר לעורך הדינמי להגדרת תרגילים לפי רמות רודמאפ
                </p>
              </div>
            </label>

            {formData.is_dynamic && (
              <div className="mt-3 border-t border-purple-200 pt-3">
                <label className="block text-sm font-medium text-fg-2 mb-1.5">
                  קטגוריית רודמאפ <span className="text-danger">*</span>
                </label>
                <select
                  value={formData.RoadmapCategoryID ?? ''}
                  onChange={(e) => setFormData({ ...formData, RoadmapCategoryID: e.target.value ? Number(e.target.value) : null })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 bg-surface"
                >
                  <option value="">-- בחר קטגוריה --</option>
                  {roadmapCategories.map((cat) => (
                    <option key={cat.CategoryID} value={cat.CategoryID}>
                      {cat.Icon ? `${cat.Icon} ` : ''}{cat.Name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Single Hand Checkbox */}
          <div className="bg-warning/15 border border-warning rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.IsSingleHand}
                onChange={(e) => setFormData({ ...formData, IsSingleHand: e.target.checked })}
                className="w-5 h-5 text-warning rounded focus:ring-2 focus:ring-orange-500"
              />
              <div>
                <span className="text-sm font-medium text-fg">
                  🖐️ תרגיל יד אחת
                </span>
                <p className="text-xs text-fg-3 mt-0.5">
                  סמן אם התרגיל מיועד לביצוע ביד אחת בלבד (לדוגמה: One-Arm Hang)
                </p>
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition font-medium shadow-sm"
            >
              {isEditing ? '💾 שמור שינויים' : '➕ צור תרגיל'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 bg-surface text-fg-2 rounded-lg hover:bg-raised transition font-medium"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}