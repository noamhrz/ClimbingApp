'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface AdminPasswordResetProps {
  userEmail: string
  userName: string
  onClose: () => void
  onSuccess: () => void
}

export default function AdminPasswordReset({ 
  userEmail, 
  userName, 
  onClose, 
  onSuccess 
}: AdminPasswordResetProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const generateRandomPassword = () => {
    const length = 8
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setNewPassword(password)
    setConfirmPassword(password)
    setShowPassword(true)
  }

  const handleReset = async () => {
    setError('')

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('אנא מלא את כל השדות')
      return
    }

    if (newPassword.length < 6) {
      setError('הסיסמה חייבת להיות לפחות 6 תווים')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    setLoading(true)

    try {
      // Use the simple_password_reset function
      const { data, error } = await supabase.rpc('simple_password_reset', {
        user_email: userEmail,
        new_password: newPassword
      })

      if (error) throw error

      if (data === 'User not found') {
        throw new Error('משתמש לא נמצא במערכת')
      }

      alert(`✅ הסיסמה של ${userName} עודכנה בהצלחה!\n\nסיסמה חדשה: ${newPassword}\n\n📋 העתק את הסיסמה ושלח למשתמש`)
      onSuccess()
      onClose()

    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'שגיאה בעדכון הסיסמה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🔐 איפוס סיסמה</h2>
            <p className="text-sm text-gray-600 mt-1">
              עבור: <strong>{userName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Generate Random Password */}
          <button
            onClick={generateRandomPassword}
            className="w-full py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium border border-purple-300"
            disabled={loading}
          >
            🎲 צור סיסמה אוטומטית
          </button>

          <div className="relative">
            <p className="text-center text-sm text-gray-500 my-2">או</p>
          </div>

          {/* Manual Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה חדשה
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              אישור סיסמה
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="הזן שוב את הסיסמה"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Password Strength */}
          {newPassword && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">בדיקת תקינות:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span>{newPassword.length >= 6 ? '✅' : '⭕'}</span>
                  <span className="text-xs text-gray-600">לפחות 6 תווים</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{newPassword === confirmPassword && confirmPassword ? '✅' : '⭕'}</span>
                  <span className="text-xs text-gray-600">הסיסמאות תואמות</span>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ חשוב:</strong> העתק את הסיסמה ושלח אותה למשתמש בצורה מאובטחת.
              הוא יוכל לשנות אותה בעצמו אחר כך דרך הפרופיל שלו.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleReset}
              disabled={loading || !newPassword || !confirmPassword}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? '⏳ מעדכן...' : '💾 עדכן סיסמה'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}