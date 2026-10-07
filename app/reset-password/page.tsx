'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isValidSession, setIsValidSession] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Check if user came from password reset email
    checkSession()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      setIsValidSession(true)
    } else {
      setMessage({
        type: 'error',
        text: '⚠️ הלינק לא תקף או פג תוקפו. אנא בקש לינק חדש.'
      })
    }
  }

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'הסיסמה חייבת להכיל לפחות 6 תווים'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validation
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'הסיסמאות אינן תואמות' })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: '✅ הסיסמה עודכנה בהצלחה!'
      })

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'שגיאה בעדכון הסיסמה'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isValidSession && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
        <div className="bg-surface rounded-2xl border border-line shadow-2xl shadow-black/40 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-fg mb-4">
            לינק לא תקף
          </h1>
          <p className="text-fg-3 mb-6">
            הלינק לאיפוס סיסמה פג תוקף או לא תקין.
          </p>
          <button
            onClick={() => router.push('/forgot-password')}
            className="w-full py-3 min-h-12 bg-accent text-on-accent rounded-full font-bold hover:bg-accent-hover transition-colors"
          >
            בקש לינק חדש
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="bg-surface rounded-2xl border border-line shadow-2xl shadow-black/40 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-fg mb-2">
            סיסמה חדשה
          </h1>
          <p className="text-fg-3">
            בחר סיסמה חזקה לחשבון שלך
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
 message.type === 'success' 
 ? 'bg-success/15 text-success border border-success' 
 : 'bg-danger/15 text-danger border border-danger'
 }`}>
            {message.text}
            {message.type === 'success' && (
              <p className="text-sm mt-2">מעביר להתחברות...</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2 text-start">
              סיסמה חדשה
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="w-full min-h-12 px-4 py-3 bg-bg text-fg text-base placeholder:text-faint border border-line-strong rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-start pe-12"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg-2"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-2 mb-2 text-start">
              אישור סיסמה
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="הזן שוב את הסיסמה"
              className="w-full min-h-12 px-4 py-3 bg-bg text-fg text-base placeholder:text-faint border border-line-strong rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-start"
              disabled={loading}
              required
            />
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="bg-surface rounded-lg p-3">
              <p className="text-xs font-medium text-fg-2 mb-2">חוזק סיסמה:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={newPassword.length >= 6 ? '✅' : '❌'}>
                    {newPassword.length >= 6 ? '✅' : '⭕'}
                  </span>
                  <span className="text-xs text-fg-3">לפחות 6 תווים</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={/[A-Z]/.test(newPassword) ? '✅' : '⭕'}>
                    {/[A-Z]/.test(newPassword) ? '✅' : '⭕'}
                  </span>
                  <span className="text-xs text-fg-3">אות גדולה (מומלץ)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={/[0-9]/.test(newPassword) ? '✅' : '⭕'}>
                    {/[0-9]/.test(newPassword) ? '✅' : '⭕'}
                  </span>
                  <span className="text-xs text-fg-3">מספר (מומלץ)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={newPassword === confirmPassword && confirmPassword ? '✅' : '⭕'}>
                    {newPassword === confirmPassword && confirmPassword ? '✅' : '⭕'}
                  </span>
                  <span className="text-xs text-fg-3">הסיסמאות תואמות</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-3 min-h-12 bg-accent text-on-accent rounded-full font-bold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ מעדכן...' : '💾 עדכן סיסמה'}
          </button>
        </form>

        <div className="mt-8 bg-accent/15 rounded-lg p-4">
          <p className="text-xs text-accent">
            <strong>💡 טיפים לסיסמה חזקה:</strong>
          </p>
          <ul className="text-xs text-accent mt-2 space-y-1 ms-4">
            <li>• השתמש בשילוב של אותיות גדולות וקטנות</li>
            <li>• הוסף מספרים ותווים מיוחדים</li>
            <li>• אל תשתמש באותה סיסמה באתרים שונים</li>
            <li>• לפחות 8 תווים (מומלץ)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}