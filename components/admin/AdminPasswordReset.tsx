'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LuCircle, LuCircleCheck, LuEye, LuEyeOff, LuLoaderCircle, LuLock, LuSave, LuTriangleAlert } from 'react-icons/lu'

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
      <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-fg"><LuLock aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />איפוס סיסמה</h2>
            <p className="text-sm text-fg-3 mt-1">
              עבור: <strong>{userName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-faint hover:text-fg-3 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/15 text-danger rounded-lg border border-danger text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Generate Random Password */}
          <button
            onClick={generateRandomPassword}
            className="w-full py-2 bg-info/10 text-info rounded-lg hover:bg-info/20 transition-colors font-medium border border-info/30"
            disabled={loading}
          >
            🎲 צור סיסמה אוטומטית
          </button>

          <div className="relative">
            <p className="text-center text-sm text-muted my-2">או</p>
          </div>

          {/* Manual Password */}
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">
              סיסמה חדשה
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-accent pr-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg-2"
              >
                {showPassword ? <LuEyeOff aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /> : <LuEye aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2">
              אישור סיסמה
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="הזן שוב את הסיסמה"
              className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              disabled={loading}
            />
          </div>

          {/* Password Strength */}
          {newPassword && (
            <div className="bg-surface rounded-lg p-3">
              <p className="text-xs font-medium text-fg-2 mb-2">בדיקת תקינות:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span>{newPassword.length >= 6 ? <LuCircleCheck aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /> : <LuCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />}</span>
                  <span className="text-xs text-fg-3">לפחות 6 תווים</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{newPassword === confirmPassword && confirmPassword ? <LuCircleCheck aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /> : <LuCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />}</span>
                  <span className="text-xs text-fg-3">הסיסמאות תואמות</span>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-warning/15 rounded-lg p-3 border border-warning">
            <p className="text-xs text-warning">
              <strong><LuTriangleAlert aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />חשוב:</strong> העתק את הסיסמה ושלח אותה למשתמש בצורה מאובטחת.
              הוא יוכל לשנות אותה בעצמו אחר כך דרך הפרופיל שלו.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleReset}
              disabled={loading || !newPassword || !confirmPassword}
              className="flex-1 py-3 bg-accent text-on-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? <><LuLoaderCircle aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] animate-spin me-1.5" />מעדכן...</> : <><LuSave aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />עדכן סיסמה</>}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-raised text-fg-2 rounded-lg hover:bg-raised/90 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}