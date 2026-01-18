// components/goals/GradeGoalsForm.tsx
'use client'

import { useState } from 'react'
import type { BoulderGoalsData, LeadGoalsData } from '@/lib/goals-api'

interface Props {
  type: 'boulder' | 'board' | 'lead'
  initialData: any | null
  onSave: (data: any) => Promise<{ success: boolean; error?: string }>
}

// V Grades for Boulder/Board
const V_GRADES = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5',
  'V6', 'V7', 'V8', 'V9', 'V10', 'V11',
  'V12', 'V13', 'V14', 'V15', 'V16', 'V17'
]

// French Grades for Lead (starting from 5c)
const LEAD_GRADES = [
  '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b', '9b+'
]

// Generate options 0-50
const NUMBER_OPTIONS = Array.from({ length: 51 }, (_, i) => i)

export default function GradeGoalsForm({ type, initialData, onSave }: Props) {
  const grades = type === 'lead' ? LEAD_GRADES : V_GRADES
  
  // Initialize data
  const [data, setData] = useState<any>(() => {
    const initial: any = {}
    grades.forEach(grade => {
      initial[grade] = initialData?.[grade as keyof typeof initialData] || 0
    })
    return initial
  })
  
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChange = (grade: string, value: number) => {
    setData({ ...data, [grade]: value })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    const result = await onSave(data)
    
    if (result.success) {
      const typeText = type === 'boulder' ? 'בולדר' : type === 'board' ? 'בורד' : 'ליד'
      setMessage({ type: 'success', text: `✅ יעדי ${typeText} נשמרו בהצלחה!` })
    } else {
      setMessage({ type: 'error', text: `❌ שגיאה: ${result.error}` })
    }
    
    setSaving(false)
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Grid of grade selects - 6 per row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {grades.map((grade) => (
          <div key={grade}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {grade}
            </label>
            <select
              value={data[grade]}
              onChange={(e) => handleChange(grade, parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {NUMBER_OPTIONS.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '💾 שומר...' : '💾 שמור'}
        </button>
        
        {message && (
          <div className={`px-4 py-2 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}