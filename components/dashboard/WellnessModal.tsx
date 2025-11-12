'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'

interface WellnessModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
  onSave?: () => void
}

export default function WellnessModal({ isOpen, onClose, currentUser, onSave }: WellnessModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [sleepHours, setSleepHours] = useState<number>(7)
  const [energy, setEnergy] = useState<number>(5)
  const [soreness, setSoreness] = useState<number>(0)
  const [painArea, setPainArea] = useState('')
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExistingEntry, setIsExistingEntry] = useState(false)

  // Load existing data when date changes
  useEffect(() => {
    if (isOpen && currentUser?.Email) {
      loadExistingData()
    }
  }, [selectedDate, isOpen, currentUser?.Email])

  const loadExistingData = async () => {
    try {
      const { data } = await supabase
        .from('WellnessLog')
        .select('*')
        .eq('Email', currentUser?.Email)
        .eq('Date', selectedDate)
        .maybeSingle()

      if (data) {
        // Load existing values
        setSleepHours(data.SleepHours || 7)
        setEnergy(data.VitalityLevel || 5)
        setSoreness(data.PainLevel || 0)
        setPainArea(data.PainArea || '')
        setComments(data.Comments || '')
        setIsExistingEntry(true)
      } else {
        // Reset to defaults for new entry
        setSleepHours(7)
        setEnergy(5)
        setSoreness(0)
        setPainArea('')
        setComments('')
        setIsExistingEntry(false)
      }
    } catch (error) {
      console.error('Error loading wellness data:', error)
    }
  }

  // Generate sleep hours options: 1, 1.5, 2, 2.5, ..., 10
  const sleepOptions = []
  for (let i = 1; i <= 10; i += 0.5) {
    sleepOptions.push(i)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if entry exists for this date
      const { data: existing } = await supabase
        .from('WellnessLog')
        .select('WellnessID')
        .eq('Email', currentUser?.Email)
        .eq('Date', selectedDate)
        .maybeSingle()

      if (existing) {
        // UPDATE existing entry
        const { error } = await supabase
          .from('WellnessLog')
          .update({
            SleepHours: sleepHours,
            VitalityLevel: energy,
            PainLevel: soreness,
            PainArea: painArea || null,
            Comments: comments || null,
            UpdatedAt: new Date().toISOString()
          })
          .eq('WellnessID', existing.WellnessID)

        if (error) throw error
        alert('✅ Wellness עודכן בהצלחה!')
      } else {
        // INSERT new entry
        const { error } = await supabase
          .from('WellnessLog')
          .insert({
            Email: currentUser?.Email,
            Date: selectedDate,
            SleepHours: sleepHours,
            VitalityLevel: energy,
            PainLevel: soreness,
            PainArea: painArea || null,
            Comments: comments || null
          })

        if (error) throw error
        alert('✅ Wellness נשמר בהצלחה!')
      }
      
      // Reset form
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
      setSleepHours(7)
      setEnergy(5)
      setSoreness(0)
      setPainArea('')
      setComments('')
      
      if (onSave) onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving wellness:', error)
      alert(`❌ שגיאה: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              💚 Wellness Log
            </h2>
            {isExistingEntry && (
              <p className="text-sm text-orange-600 mt-1">
                ✏️ עריכת רשומה קיימת
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              📅 תאריך
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
              dir="rtl"
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              ניתן למלא רטרואקטיבית, אבל לא בעתיד
            </p>
          </div>

          {/* Sleep Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              🛏️ שעות שינה: <span className="text-blue-600 font-bold">{sleepHours}</span>
            </label>
            <select
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
              dir="rtl"
            >
              {sleepOptions.map(hours => (
                <option key={hours} value={hours}>
                  {hours} שעות
                </option>
              ))}
            </select>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>1 שעה</span>
              <span>10 שעות</span>
            </div>
          </div>

          {/* Energy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              ⚡ רמת אנרגיה: <span className="text-green-600 font-bold">{energy}/10</span>
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              dir="ltr"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${energy * 10}%, #e5e7eb ${energy * 10}%, #e5e7eb 100%)`
              }}
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500" dir="ltr">
              <span>0 - מותש</span>
              <span>5 - בסדר</span>
              <span>10 - מלא אנרגיה</span>
            </div>
          </div>

          {/* Soreness/Pain Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              🤕 רמת כאב/עייפות: <span className="text-red-600 font-bold">{soreness}/10</span>
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={soreness}
              onChange={(e) => setSoreness(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              dir="ltr"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${soreness * 10}%, #e5e7eb ${soreness * 10}%, #e5e7eb 100%)`
              }}
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500" dir="ltr">
              <span>0 - ללא כאב</span>
              <span>5 - כאב בינוני</span>
              <span>10 - כאב חזק</span>
            </div>
          </div>

          {/* Pain Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              📍 איזור כאב (אופציונלי)
            </label>
            <input
              type="text"
              value={painArea}
              onChange={(e) => setPainArea(e.target.value)}
              placeholder="למשל: כתף ימין, גב תחתון, אצבע"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
              dir="rtl"
            />
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              📝 הערות (אופציונלי)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="איך הרגשת היום? משהו מיוחד?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-right"
              rows={3}
              dir="rtl"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? '⏳ שומר...' : isExistingEntry ? '💾 עדכן' : '✅ שמור'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800 text-right">
            💡 <strong>טיפ:</strong> מילוי יומי של הWellness עוזר לעקוב אחר ההתקדמות ולמנוע פציעות!
          </p>
        </div>
      </div>
    </div>
  )
}