// components/climbing/AddClimbingLogModal.tsx - WITH TIMEZONE FIX
'use client'

import { useState } from 'react'
import { format } from 'date-fns'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (logData: any) => Promise<void>
  boulderGrades: any[]
  leadGrades: any[]
  boardTypes: any[]
  locations: any[]
}

export default function AddClimbingLogModal({
  isOpen,
  onClose,
  onAdd,
  boulderGrades,
  leadGrades,
  boardTypes,
  locations,
}: Props) {
  const [climbType, setClimbType] = useState<'Boulder' | 'Board' | 'Lead'>('Boulder')
  const [gradeId, setGradeId] = useState<number | null>(null)
  const [routeName, setRouteName] = useState('')
  const [attempts, setAttempts] = useState(1)
  const [successful, setSuccessful] = useState(false)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(new Date(), 'HH:mm'))
  const [locationId, setLocationId] = useState<number | null>(null)
  const [boardTypeId, setBoardTypeId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // ⚠️ CRITICAL: Create datetime in LOCAL timezone, then convert to ISO
      // This ensures the time is saved correctly in the database
      
      // Combine date and time
      const localDateTime = new Date(`${date}T${time}:00`)
      
      console.log('📅 Climbing Log DateTime:')
      console.log('Date input:', date)
      console.log('Time input:', time)
      console.log('Combined local:', localDateTime)
      console.log('ISO (to DB):', localDateTime.toISOString())

      const logData = {
        ClimbType: climbType,
        GradeID: gradeId,
        RouteName: routeName || null,
        Attempts: attempts,
        Successful: successful,
        LogDateTime: localDateTime.toISOString(), // ✅ Browser converts to UTC
        LocationID: locationId,
        BoardTypeID: climbType === 'Board' ? boardTypeId : null,
        Notes: notes || null,
      }

      await onAdd(logData)
      
      // Reset form
      setClimbType('Boulder')
      setGradeId(null)
      setRouteName('')
      setAttempts(1)
      setSuccessful(false)
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setTime(format(new Date(), 'HH:mm'))
      setLocationId(null)
      setBoardTypeId(null)
      setNotes('')
      
      onClose()
    } catch (error) {
      console.error('Error adding climb:', error)
      alert('שגיאה בשמירת מסלול')
    } finally {
      setSaving(false)
    }
  }

  const grades = climbType === 'Lead' ? leadGrades : boulderGrades
  const gradeKey = climbType === 'Lead' ? 'LeadGradeID' : 'BoulderGradeID'
  const gradeLabel = climbType === 'Lead' ? 'FrenchGrade' : 'VGrade'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">🧗 הוסף מסלול</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Climb Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              סוג טיפוס
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Boulder', 'Board', 'Lead'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setClimbType(type)}
                  className={`py-2 px-4 rounded-lg font-medium ${
                    climbType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'Boulder' ? '🪨 בולדר' : type === 'Board' ? '🟨 בורד' : '🧗 הובלה'}
                </button>
              ))}
            </div>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              דרגה
            </label>
            <select
              value={gradeId || ''}
              onChange={(e) => setGradeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">בחר דרגה</option>
              {grades.map((grade) => (
                <option key={grade[gradeKey]} value={grade[gradeKey]}>
                  {grade[gradeLabel]}
                </option>
              ))}
            </select>
          </div>

          {/* Route Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם מסלול (אופציונלי)
            </label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="למשל: The Nose"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תאריך
              </label>
              <input
                type="date"
                value={date}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שעה
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Attempts & Success */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                נסיונות
              </label>
              <input
                type="number"
                min="1"
                value={attempts}
                onChange={(e) => setAttempts(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                הצלחה?
              </label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSuccessful(true)}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    successful
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✅ כן
                </button>
                <button
                  type="button"
                  onClick={() => setSuccessful(false)}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    !successful
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ❌ לא
                </button>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מיקום (אופציונלי)
            </label>
            <select
              value={locationId || ''}
              onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר מיקום</option>
              {locations.map((loc) => (
                <option key={loc.LocationID} value={loc.LocationID}>
                  {loc.LocationName}
                </option>
              ))}
            </select>
          </div>

          {/* Board Type (only for Board) */}
          {climbType === 'Board' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סוג בורד
              </label>
              <select
                value={boardTypeId || ''}
                onChange={(e) => setBoardTypeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">בחר בורד</option>
                {boardTypes.map((board) => (
                  <option key={board.BoardTypeID} value={board.BoardTypeID}>
                    {board.BoardName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              הערות (אופציונלי)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="הערות על המסלול..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '💾 שומר...' : '💾 שמור מסלול'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}