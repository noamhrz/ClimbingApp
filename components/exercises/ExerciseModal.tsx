// components/exercises/ExerciseModal.tsx
// VERSION WITH DYNAMIC CATEGORIES + FREE TEXT INPUT

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Exercise, ExerciseFormData } from '@/types/exercises'

interface Props {
  exercise: Exercise | null
  onSave: (data: ExerciseFormData) => void
  onClose: () => void
}

export default function ExerciseModal({ exercise, onSave, onClose }: Props) {
  const [categories, setCategories] = useState<string[]>([])
  const [formData, setFormData] = useState<ExerciseFormData>({
    Name: '',
    Description: '',
    Category: '',
    VideoURL: '',
    ImageURL: '',
    IsSingleHand: false,
  })

  const isEditing = !!exercise

  // Load categories from DB
  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (exercise) {
      setFormData({
        Name: exercise.Name,
        Description: exercise.Description || '',
        Category: exercise.Category,
        VideoURL: exercise.VideoURL || '',
        ImageURL: exercise.ImageURL || '',
        IsSingleHand: exercise.IsSingleHand,
      })
    }
  }, [exercise])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('Exercises')
        .select('Category')
        .eq('Status', 'Active')

      if (error) throw error

      // Get unique categories and sort
      const uniqueCategories = [...new Set(data?.map(ex => ex.Category) || [])]
        .filter(Boolean)
        .sort()

      setCategories(uniqueCategories)
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
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

    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? '✏️ עריכת תרגיל' : '➕ תרגיל חדש'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם התרגיל <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.Name}
              onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
              placeholder="לדוגמה: עליות מתח"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={3}
            />
          </div>

          {/* Category - Free text with suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              קטגוריה <span className="text-red-500">*</span>
            </label>
            
            <input
              type="text"
              list="category-suggestions"
              value={formData.Category}
              onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
              placeholder="בחר או הקלד קטגוריה..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            
            <datalist id="category-suggestions">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            {/* Quick select buttons */}
            {categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.slice(0, 8).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, Category: cat })}
                    className={`text-xs px-3 py-1 rounded-full transition ${
                      formData.Category === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תיאור
            </label>
            <textarea
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              placeholder="מטרה, ביצוע, דגשים..."
              rows={5}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              קישור לוידאו
            </label>
            <input
              type="url"
              value={formData.VideoURL}
              onChange={(e) => setFormData({ ...formData, VideoURL: e.target.value })}
              placeholder="https://www.youtube.com/..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              קישור לתמונה
            </label>
            <input
              type="url"
              value={formData.ImageURL}
              onChange={(e) => setFormData({ ...formData, ImageURL: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Single Hand */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.IsSingleHand}
                onChange={(e) => setFormData({ ...formData, IsSingleHand: e.target.checked })}
                className="w-5 h-5 text-orange-600 rounded"
              />
              <span className="text-sm font-medium">🖐️ תרגיל יד אחת</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {isEditing ? '💾 שמור' : '➕ צור'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}