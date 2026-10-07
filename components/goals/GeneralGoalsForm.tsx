// components/goals/GeneralGoalsForm.tsx
'use client'

import { useState } from 'react'
import type { GeneralGoalsData } from '@/lib/goals-api'

interface Props {
  initialData: GeneralGoalsData | null
  onSave: (data: GeneralGoalsData) => Promise<{ success: boolean; error?: string }>
}

export default function GeneralGoalsForm({ initialData, onSave }: Props) {
  const [data, setData] = useState<GeneralGoalsData>({
    OverarchingGoal: initialData?.OverarchingGoal || '',
    Goal1: initialData?.Goal1 || '',
    Goal2: initialData?.Goal2 || '',
    Goal3: initialData?.Goal3 || '',
    Goal4: initialData?.Goal4 || '',
    Goal5: initialData?.Goal5 || '',
  })
  
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    const result = await onSave(data)
    
    if (result.success) {
      setMessage({ type: 'success', text: '✅ מטרות כלליות נשמרו בהצלחה!' })
    } else {
      setMessage({ type: 'error', text: `❌ שגיאה: ${result.error}` })
    }
    
    setSaving(false)
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Overarching Goal */}
      <div>
        <label className="block text-sm font-semibold text-fg-2 mb-2">
          🎯 מטרת על
        </label>
        <input
          type="text"
          value={data.OverarchingGoal}
          onChange={(e) => setData({ ...data, OverarchingGoal: e.target.value })}
          className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
          placeholder="לדוגמה: להשתפר בסיבולת ובטכניקה"
        />
      </div>

      {/* 5 Goals */}
      {[1, 2, 3, 4, 5].map((num) => (
        <div key={num}>
          <label className="block text-sm font-semibold text-fg-2 mb-2">
            📌 יעד {num}
          </label>
          <input
            type="text"
            value={data[`Goal${num}` as keyof GeneralGoalsData] as string}
            onChange={(e) => setData({ ...data, [`Goal${num}`]: e.target.value })}
            className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder={`יעד ${num}`}
          />
        </div>
      ))}

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-accent text-on-accent font-semibold rounded-lg hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '💾 שומר...' : '💾 שמור'}
        </button>
        
        {message && (
          <div className={`px-4 py-2 rounded-lg ${
 message.type === 'success' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
 }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}