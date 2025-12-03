// components/climbing/AddClimbingLogModal.tsx - WITH ADD NEW LOCATION
'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabaseClient'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (logData: any) => Promise<void>
  boulderGrades: any[]
  leadGrades: any[]
  boardTypes: any[]
  locations: any[]
  onLocationAdded?: () => Promise<void>  // NEW: Callback to refresh locations
}

export default function AddClimbingLogModal({
  isOpen,
  onClose,
  onAdd,
  boulderGrades,
  leadGrades,
  boardTypes,
  locations,
  onLocationAdded,
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

  // NEW: Add location modal state
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)
  
  // NEW: Local locations state (to allow immediate updates)
  const [localLocations, setLocalLocations] = useState(locations)
  const [locationSearch, setLocationSearch] = useState('') // Search filter for locations

  // Sync local locations with prop
  useEffect(() => {
    setLocalLocations(locations)
  }, [locations])

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return localLocations
    
    const searchLower = locationSearch.toLowerCase()
    return localLocations.filter(loc => 
      loc.LocationName.toLowerCase().includes(searchLower)
    )
  }, [localLocations, locationSearch])

    if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const localDateTime = new Date(`${date}T${time}:00`)

      const logData = {
        ClimbType: climbType,
        GradeID: gradeId,
        RouteName: routeName || null,
        Attempts: attempts,
        Successful: successful,
        LogDateTime: localDateTime.toISOString(),
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

  // NEW: Add new location
  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      alert('⚠️ יש להזין שם מיקום')
      return
    }

    setSavingLocation(true)
    try {
      const { data, error } = await supabase
        .from('ClimbingLocations')
        .insert({
          LocationName: newLocationName.trim(),
          LocationType: 'Indoor',
          City: '',
          Country: 'Israel'
        })
        .select()
        .single()

      if (error) throw error

      // ✅ Update local locations immediately
      setLocalLocations([...localLocations, data])

      // Refresh locations list in parent
      if (onLocationAdded) {
        await onLocationAdded()
      }

      // Auto-select new location
      setLocationId(data.LocationID)

      // Close modal and reset
      setShowAddLocationModal(false)
      setNewLocationName('')

      alert('✅ מיקום נוסף בהצלחה!')
    } catch (error) {
      console.error('Error adding location:', error)
      alert('❌ שגיאה בהוספת מיקום')
    } finally {
      setSavingLocation(false)
    }
  }

  const grades = climbType === 'Lead' ? leadGrades : boulderGrades
  const gradeKey = climbType === 'Lead' ? 'LeadGradeID' : 'BoulderGradeID'
  const gradeLabel = climbType === 'Lead' ? 'FrenchGrade' : 'VGrade'

  return (
    <>
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

            {/* Location - WITH SEARCH */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מיקום (אופציונלי)
              </label>
              <div className="space-y-2">
                {/* Search input */}
                <input
                  type="text"
                  placeholder="🔍 חפש מיקום..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                
                {/* Filtered select */}
                <select
                  value={locationId || ''}
                  onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">בחר מיקום</option>
                  {filteredLocations.map((loc) => (
                    <option key={loc.LocationID} value={loc.LocationID}>
                      {loc.LocationName}
                    </option>
                  ))}
                </select>
                
                {/* Show count if filtering */}
                {locationSearch && (
                  <p className="text-sm text-gray-600">
                    נמצאו {filteredLocations.length} מתוך {localLocations.length} מיקומים
                  </p>
                )}
                
                {/* Add New Location Button */}
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(true)}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
                >
                  ➕ הוסף מיקום חדש
                </button>
              </div>
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

      {/* Add New Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                📍 הוספת מיקום חדש
              </h3>
              <button
                onClick={() => setShowAddLocationModal(false)}
                disabled={savingLocation}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 הוסף מיקום חדש לרשימה. המיקום יהיה זמין לכולם.
              </p>
            </div>

            {/* Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם המיקום *
              </label>
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="למשל: קיר ספיידרמן"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={savingLocation}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddLocation()
                  }
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAddLocation}
                disabled={savingLocation || !newLocationName.trim()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                {savingLocation ? '⏳ שומר...' : '✅ הוסף מיקום'}
              </button>
              <button
                onClick={() => setShowAddLocationModal(false)}
                disabled={savingLocation}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}