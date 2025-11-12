'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function UserProfilePage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const handleDirectPasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: '⚠️ אנא מלא את כל השדות' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '⚠️ הסיסמה חייבת להיות לפחות 6 תווים' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '⚠️ הסיסמאות אינן תואמות' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Try to update password using current session
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: '✅ הסיסמה עודכנה בהצלחה!'
      })

      // Reset form
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)

      // Refresh session
      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ שגיאה: ${error.message}`
      })
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl text-gray-600">אנא התחבר</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            התחבר
          </button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-blue-600">👤 הפרופיל שלי</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {currentUser.Name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{currentUser.Name}</h2>
              <p className="text-gray-500">{currentUser.Email}</p>
            </div>
          </div>

          {/* Info Rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📧</span>
                <div>
                  <p className="text-sm text-gray-500">אימייל</p>
                  <p className="font-medium text-gray-800">{currentUser.Email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="text-sm text-gray-500">שם מלא</p>
                  <p className="font-medium text-gray-800">{currentUser.Name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎭</span>
                <div>
                  <p className="text-sm text-gray-500">תפקיד</p>
                  <p className="font-medium text-gray-800">
                    {currentUser.Role === 'admin' ? '👑 מנהל' : 
                     currentUser.Role === 'coach' ? '🏋️ מאמן' : 
                     '🧗 מטפס'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔐</span>
            <h3 className="text-xl font-bold text-gray-800">שינוי סיסמה</h3>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {!showPasswordForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-800">סיסמה</p>
                  <p className="text-sm text-gray-500">••••••••</p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 שנה סיסמה
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>💡 טיפ:</strong> לחיצה על "שנה סיסמה" תאפשר לך להזין סיסמה חדשה ישירות
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סיסמה חדשה
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  אישור סיסמה
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="הזן שוב את הסיסמה"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">חוזק סיסמה:</p>
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

              <div className="flex gap-2">
                <button
                  onClick={handleDirectPasswordReset}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '⏳ שומר...' : '💾 שמור סיסמה'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setNewPassword('')
                    setConfirmPassword('')
                    setMessage(null)
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="mt-6">
          <button
            onClick={() => {
              supabase.auth.signOut()
              router.push('/')
            }}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            🚪 התנתק
          </button>
        </div>
      </div>
    </div>
  )
}