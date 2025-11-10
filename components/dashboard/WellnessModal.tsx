// components/dashboard/WellnessModal.tsx - LTR SLIDERS (MORE INTUITIVE)
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUser: any
  onSave: () => void
  initialDate?: Date
}

export default function WellnessModal({ isOpen, onClose, currentUser, onSave, initialDate }: Props) {
  const [selectedDate, setSelectedDate] = useState(format(initialDate || new Date(), 'yyyy-MM-dd'))
  const [sleepHours, setSleepHours] = useState(7)
  const [vitalityLevel, setVitalityLevel] = useState(5)
  const [painLevel, setPainLevel] = useState(5)
  const [painArea, setPainArea] = useState('')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && currentUser?.Email) {
      loadExistingData()
    }
  }, [isOpen, selectedDate, currentUser])

  const loadExistingData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('WellnessLog')
        .select('*')
        .eq('Email', currentUser.Email)
        .eq('Date', selectedDate)
        .maybeSingle()

      if (data) {
        setSleepHours(data.SleepHours || 7)
        setVitalityLevel(data.VitalityLevel || 5)
        setPainLevel(data.PainLevel || 5)
        setPainArea(data.PainArea || '')
        setComments(data.Comments || '')
      } else {
        setSleepHours(7)
        setVitalityLevel(5)
        setPainLevel(5)
        setPainArea('')
        setComments('')
      }
    } catch (error) {
      console.error('Error loading wellness data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentUser?.Email) return

    setSaving(true)
    try {
      const wellnessData = {
        Email: currentUser.Email,
        Date: selectedDate,
        SleepHours: sleepHours,
        VitalityLevel: vitalityLevel,
        PainLevel: painLevel,
        PainArea: painArea || null,
        Comments: comments || null
      }

      const { error } = await supabase
        .from('WellnessLog')
        .upsert(wellnessData, {
          onConflict: 'Email,Date',
          ignoreDuplicates: false
        })

      if (error) throw error

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving wellness data:', error)
      alert('שגיאה בשמירת הנתונים')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const maxDate = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">💚 יומן Wellness</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold"
            >
              ✕
            </button>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm text-white/90 mb-2">תאריך:</label>
            <input
              type="date"
              value={selectedDate}
              max={maxDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-gray-800 font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">⏳</div>
            <div>טוען נתונים...</div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Sleep Hours */}
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">😴 שעות שינה</span>
                <span className="text-2xl font-bold text-blue-600">{sleepHours}</span>
              </label>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                dir="ltr"
                className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-ltr"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(sleepHours / 12) * 100}%, #dbeafe ${(sleepHours / 12) * 100}%, #dbeafe 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1" dir="ltr">
                <span>0</span>
                <span>12</span>
              </div>
            </div>

            {/* Vitality Level */}
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">⚡ רמת אנרגיה</span>
                <span className="text-2xl font-bold text-green-600">{vitalityLevel}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={vitalityLevel}
                onChange={(e) => setVitalityLevel(parseInt(e.target.value))}
                dir="ltr"
                className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-ltr"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${((vitalityLevel - 1) / 9) * 100}%, #d1fae5 ${((vitalityLevel - 1) / 9) * 100}%, #d1fae5 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1" dir="ltr">
                <span>1 (נמוך)</span>
                <span>10 (גבוה)</span>
              </div>
            </div>

            {/* Pain Level */}
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">💪 רמת כאב</span>
                <span className="text-2xl font-bold text-red-600">{painLevel}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(parseInt(e.target.value))}
                dir="ltr"
                className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-ltr"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((painLevel - 1) / 9) * 100}%, #fecaca ${((painLevel - 1) / 9) * 100}%, #fecaca 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1" dir="ltr">
                <span>1 (נמוך)</span>
                <span>10 (גבוה)</span>
              </div>
            </div>

            {/* Pain Area */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                📍 אזור כאב (אופציונלי)
              </label>
              <input
                type="text"
                value={painArea}
                onChange={(e) => setPainArea(e.target.value)}
                placeholder="לדוגמה: אצבעות, כתף, גב..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                📝 הערות (אופציונלי)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="איך הרגשת היום? משהו מיוחד?"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? '💾 שומר...' : '💾 שמור'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider-ltr::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid currentColor;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider-ltr::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid currentColor;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}