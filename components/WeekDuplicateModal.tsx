// components/WeekDuplicateModal.tsx
// WEEK DUPLICATION - Simple & Direct

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import moment from 'moment-timezone'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  email: string
}

export default function WeekDuplicateModal({ isOpen, onClose, onSuccess, email }: Props) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [numWeeks, setNumWeeks] = useState(1)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  // Calculate preview dates
  const getPreviewDates = () => {
    if (!startDate || !endDate) return []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const weekLength = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    const previews = []
    for (let i = 1; i <= numWeeks; i++) {
      const newStart = new Date(start)
      newStart.setDate(start.getDate() + (weekLength * i))
      
      const newEnd = new Date(end)
      newEnd.setDate(end.getDate() + (weekLength * i))
      
      previews.push({
        week: i,
        start: newStart.toLocaleDateString('he-IL'),
        end: newEnd.toLocaleDateString('he-IL')
      })
    }
    
    return previews
  }

  const handleDuplicate = async () => {
    if (!startDate || !endDate || numWeeks < 1) {
      alert('⚠️ יש למלא את כל השדות')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Add 1 day to end to include the end date in the query
    const endPlusOne = new Date(end)
    endPlusOne.setDate(end.getDate() + 1)
    
    if (end < start) {
      alert('⚠️ תאריך הסיום חייב להיות אחרי תאריך ההתחלה')
      return
    }

    setLoading(true)

    try {
      // 1. Fetch all events in the original week
      const { data: originalEvents, error: fetchError } = await supabase
        .from('Calendar')
        .select('*')
        .eq('Email', email)
        .gte('StartTime', startDate)
        .lt('StartTime', endPlusOne.toISOString().split('T')[0])

      if (fetchError) throw fetchError

      if (!originalEvents || originalEvents.length === 0) {
        alert('⚠️ לא נמצאו אירועים בשבוע המקורי')
        setLoading(false)
        return
      }

      console.log(`📥 Found ${originalEvents.length} events in original week`)

      // 2. Calculate week length
      const weekLength = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      console.log(`📏 Week length: ${weekLength} days`)

      // 3. Create duplicates for each week
      const allNewEvents = []

      for (let weekNum = 1; weekNum <= numWeeks; weekNum++) {
        console.log(`\n🔄 Creating week ${weekNum}...`)
        
        for (const event of originalEvents) {
          const originalStartTime = moment(event.StartTime)
          const originalEndTime = moment(event.EndTime)
          
          // Add (weekLength * weekNum) days to the original dates
          const newStartTime = originalStartTime.clone().add(weekLength * weekNum, 'days')
          const newEndTime = originalEndTime.clone().add(weekLength * weekNum, 'days')

          const newEvent = {
            Email: event.Email,
            WorkoutID: event.WorkoutID,
            StartTime: newStartTime.format('YYYY-MM-DD HH:mm:ss'),
            EndTime: newEndTime.format('YYYY-MM-DD HH:mm:ss'),
            TimeOfDay: event.TimeOfDay || null,
            Deloading: event.Deloading || false,
            DeloadingPercentage: event.DeloadingPercentage || null,
            Completed: false,  // New events start as not completed
            CoachNotes: event.CoachNotes || null,
            ClimberNotes: null,  // Clear climber notes for duplicates
            RPE: null,  // Clear RPE for duplicates
            Color: event.Color || '#3b82f6',
            CreatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
          }

          allNewEvents.push(newEvent)
          
          console.log(`  ✅ Event: ${originalStartTime.format('DD/MM')} → ${newStartTime.format('DD/MM')}`)
        }
      }

      console.log(`\n📊 Total events to insert: ${allNewEvents.length}`)

      // 4. Insert all new events
      const { error: insertError } = await supabase
        .from('Calendar')
        .insert(allNewEvents)

      if (insertError) throw insertError

      console.log('✅ All events inserted successfully!')

      alert(`✅ ${allNewEvents.length} אירועים שוכפלו בהצלחה!\n\n${originalEvents.length} אירועים × ${numWeeks} שבועות`)
      
      onSuccess()
      onClose()

    } catch (error: any) {
      console.error('❌ Error duplicating week:', error)
      alert(`❌ שגיאה בשכפול שבוע: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const previews = getPreviewDates()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              📋 שכפול שבוע
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              💡 בחר שבוע קיים ושכפל אותו למספר שבועות קדימה.
              כל האימונים בשבוע המקורי יועתקו עם אותם פרטים.
            </p>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תאריך התחלה *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תאריך סיום *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Number of Weeks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מספר שבועות לשכפול *
            </label>
            <input
              type="number"
              value={numWeeks}
              onChange={(e) => setNumWeeks(parseInt(e.target.value) || 1)}
              min="1"
              max="12"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              מקסימום 12 שבועות
            </p>
          </div>

          {/* Preview */}
          {previews.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                תצוגה מקדימה:
              </h3>
              <div className="space-y-2">
                <div className="text-sm bg-green-50 text-green-800 px-3 py-2 rounded border border-green-200">
                  <strong>שבוע מקורי:</strong> {new Date(startDate).toLocaleDateString('he-IL')} - {new Date(endDate).toLocaleDateString('he-IL')}
                </div>
                {previews.map((preview) => (
                  <div key={preview.week} className="text-sm text-gray-700 px-3 py-2 bg-white rounded border">
                    <strong>שבוע {preview.week}:</strong> {preview.start} - {preview.end}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleDuplicate}
              disabled={loading || !startDate || !endDate}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
            >
              {loading ? '⏳ משכפל...' : '📋 שכפל שבוע'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}