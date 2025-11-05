// components/workouts/WorkoutForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { WorkoutFormData } from '@/types/workouts'
import { fetchCategories } from '@/lib/workout-api'

interface Props {
  initialData?: Partial<WorkoutFormData>
  onChange: (data: WorkoutFormData) => void
}

export default function WorkoutForm({ initialData, onChange }: Props) {
  const [categories, setCategories] = useState<string[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [formData, setFormData] = useState<WorkoutFormData>({
    Name: initialData?.Name || '',
    Category: initialData?.Category || '',
    Description: initialData?.Description || '',
    WhenToPractice: initialData?.WhenToPractice || '',
    WorkoutNotes: initialData?.WorkoutNotes || '',
    VideoURL: initialData?.VideoURL || '',
    containClimbing: initialData?.containClimbing || false,
    containExercise: initialData?.containExercise || false,
    EstimatedClimbingTime: initialData?.EstimatedClimbingTime || 0,
  })

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    onChange(formData)
  }, [formData])

  const loadCategories = async () => {
    const cats = await fetchCategories()
    setCategories(cats)
  }

  const handleChange = (field: keyof WorkoutFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      setShowNewCategory(true)
      handleChange('Category', '')
    } else {
      setShowNewCategory(false)
      handleChange('Category', value)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-bold">מידע בסיסי</h2>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1">
          שם האימון <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.Name}
          onChange={(e) => handleChange('Name', e.target.value)}
          placeholder="לדוגמה: Push Day, חימום כללי..."
          className="w-full border rounded-lg px-3 py-2"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium mb-1">קטגוריה</label>
        {!showNewCategory ? (
          <select
            value={formData.Category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">בחר קטגוריה...</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="__new__">+ קטגוריה חדשה</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.Category}
              onChange={(e) => handleChange('Category', e.target.value)}
              placeholder="שם הקטגוריה החדשה..."
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button
              onClick={() => {
                setShowNewCategory(false)
                handleChange('Category', categories[0] || '')
              }}
              className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              ביטול
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">תיאור</label>
        <textarea
          value={formData.Description}
          onChange={(e) => handleChange('Description', e.target.value)}
          placeholder="תאר את מטרת האימון..."
          rows={3}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* When To Practice */}
      <div>
        <label className="block text-sm font-medium mb-1">מתי לתרגל</label>
        <input
          type="text"
          value={formData.WhenToPractice}
          onChange={(e) => handleChange('WhenToPractice', e.target.value)}
          placeholder="לדוגמה: לפני אימון ראשי, אחרי טיפוס..."
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* Workout Notes */}
      <div>
        <label className="block text-sm font-medium mb-1">
          הערות לאימון
          <span className="text-xs text-gray-500 mr-2">
            (לדוגמה: הסבר על Repeaters)
          </span>
        </label>
        <textarea
          value={formData.WorkoutNotes}
          onChange={(e) => handleChange('WorkoutNotes', e.target.value)}
          placeholder="חזרה = 7 שניות תליה + 3 שניות מנוחה..."
          rows={4}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* Video URL */}
      <div>
        <label className="block text-sm font-medium mb-1">וידאו URL</label>
        <input
          type="url"
          value={formData.VideoURL}
          onChange={(e) => handleChange('VideoURL', e.target.value)}
          placeholder="https://..."
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* Content Type */}
      <div className="border rounded-lg p-4">
        <label className="block text-sm font-medium mb-3">האימון כולל:</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.containExercise}
              onChange={(e) => handleChange('containExercise', e.target.checked)}
              className="w-4 h-4"
            />
            <span>💪 תרגילי כוח (Exercises)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.containClimbing}
              onChange={(e) => handleChange('containClimbing', e.target.checked)}
              className="w-4 h-4"
            />
            <span>🏔️ טיפוס (Climbing)</span>
          </label>
        </div>
      </div>

      {/* Estimated Climbing Time */}
      {formData.containClimbing && (
        <div>
          <label className="block text-sm font-medium mb-1">
            זמן טיפוס משוער (דקות)
          </label>
          <input
            type="number"
            value={formData.EstimatedClimbingTime}
            onChange={(e) => handleChange('EstimatedClimbingTime', parseInt(e.target.value) || 0)}
            min="0"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      )}
    </div>
  )
}