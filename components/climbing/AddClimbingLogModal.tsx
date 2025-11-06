// components/climbing/AddClimbingLogModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { BoulderGrade, LeadGrade, BoardType, ClimbingLocation } from '@/types/climbing'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (logData: {
    ClimbType: 'Boulder' | 'Board' | 'Lead'
    GradeID: number | null
    RouteName: string | null
    Attempts: number
    Successful: boolean
    LogDateTime: string
    LocationID?: number | null
    BoardTypeID?: number | null
    DurationSeconds?: number | null
    Notes?: string | null
  }) => Promise<void>
  boulderGrades: BoulderGrade[]
  leadGrades: LeadGrade[]
  boardTypes: BoardType[]
  locations: ClimbingLocation[]
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
  const [logDateTime, setLogDateTime] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [locationId, setLocationId] = useState<number | null>(null)
  const [boardTypeId, setBoardTypeId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setClimbType('Boulder')
      setGradeId(null)
      setRouteName('')
      setAttempts(1)
      setSuccessful(false)
      const now = new Date()
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
      setLogDateTime(now.toISOString().slice(0, 16))
      setLocationId(null)
      setBoardTypeId(null)
      setNotes('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!gradeId) {
      alert('יש לבחור דירוג')
      return
    }

    setSaving(true)
    try {
      await onAdd({
        ClimbType: climbType,
        GradeID: gradeId,
        RouteName: routeName.trim() || null,
        Attempts: attempts,
        Successful: successful,
        LogDateTime: new Date(logDateTime).toISOString(),
        LocationID: locationId,
        BoardTypeID: climbType === 'Board' ? boardTypeId : null,
        Notes: notes.trim() || null,
      })
      onClose()
    } catch (error) {
      console.error('Error adding log:', error)
      alert('שגיאה בהוספת מסלול')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const relevantGrades = climbType === 'Lead' ? leadGrades : boulderGrades

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">➕ הוסף מסלול</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium mb-1">📅 תאריך ושעה</label>
            <input
              type="datetime-local"
              value={logDateTime}
              onChange={(e) => setLogDateTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Climb Type */}
          <div>
            <label className="block text-sm font-medium mb-1">🧗 סוג טיפוס</label>
            <div className="flex gap-2">
              {(['Boulder', 'Board', 'Lead'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setClimbType(type)
                    setGradeId(null) // Reset grade when changing type
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                    climbType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Board Type (only for Board) */}
          {climbType === 'Board' && (
            <div>
              <label className="block text-sm font-medium mb-1">🪵 סוג בורד</label>
              <select
                value={boardTypeId || ''}
                onChange={(e) => setBoardTypeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">בחר בורד</option>
                {boardTypes.map((board) => (
                  <option key={board.BoardID} value={board.BoardID}>
                    {board.BoardName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium mb-1">📊 דירוג</label>
            <select
              value={gradeId || ''}
              onChange={(e) => setGradeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">בחר דירוג</option>
              {relevantGrades.map((grade) => {
                const id = 'LeadGradeID' in grade ? grade.LeadGradeID : grade.BoulderGradeID
                const label =
                  'FrenchGrade' in grade
                    ? `${grade.FrenchGrade} (${grade.YosemiteGrade})`
                    : `${grade.VGrade} (${grade.FontGrade})`
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Route Name */}
          <div>
            <label className="block text-sm font-medium mb-1">🏔️ שם מסלול (אופציונלי)</label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="לדוגמה: The Wheel of Chaos"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">📍 מיקום (אופציונלי)</label>
            <select
              value={locationId || ''}
              onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">בחר מיקום</option>
              {locations.map((loc) => (
                <option key={loc.LocationID} value={loc.LocationID}>
                  {loc.LocationName} - {loc.City}
                </option>
              ))}
            </select>
          </div>

          {/* Attempts & Success */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">🔄 ניסיונות</label>
              <input
                type="number"
                min="1"
                value={attempts}
                onChange={(e) => setAttempts(Math.max(1, Number(e.target.value)))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">✅ הצלחה?</label>
              <div className="flex gap-2 h-10">
                <button
                  onClick={() => setSuccessful(true)}
                  className={`flex-1 rounded-lg font-medium ${
                    successful
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  כן
                </button>
                <button
                  onClick={() => setSuccessful(false)}
                  className={`flex-1 rounded-lg font-medium ${
                    !successful
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  לא
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">📝 הערות (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות על המסלול, תחושות, נקודות לשיפור..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={saving || !gradeId}
          >
            {saving ? '💾 שומר...' : '💾 הוסף מסלול'}
          </button>
        </div>
      </div>
    </div>
  )
}