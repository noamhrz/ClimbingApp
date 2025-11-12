'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'אנא הזן כתובת אימייל' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      setEmailSent(true)
      setMessage({
        type: 'success',
        text: '✅ נשלח לינק לאיפוס סיסמה למייל שלך!'
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'שגיאה בשליחת המייל'
      })
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              נשלח מייל!
            </h1>
            <p className="text-gray-600 mb-6">
              שלחנו לינק לאיפוס סיסמה לכתובת:
            </p>
            <p className="font-semibold text-blue-600 mb-6">{email}</p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-right">
              <p className="text-sm text-blue-800">
                <strong>💡 שים לב:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 mr-4">
                <li>• בדוק את תיבת הדואר הנכנס</li>
                <li>• בדוק גם בספאם/זבל</li>
                <li>• הלינק תקף ל-60 דקות</li>
              </ul>
            </div>

            <Link
              href="/login"
              className="block w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              חזרה להתחברות
            </Link>

            <button
              onClick={() => {
                setEmailSent(false)
                setEmail('')
                setMessage(null)
              }}
              className="mt-3 text-sm text-gray-600 hover:text-gray-800"
            >
              לא קיבלת? שלח שוב
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            שכחת סיסמה?
          </h1>
          <p className="text-gray-600">
            אין בעיה! נשלח לך לינק לאיפוס סיסמה
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              כתובת אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? '⏳ שולח...' : '📧 שלח לינק לאיפוס'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← חזרה להתחברות
          </Link>
        </div>

        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-600 text-right">
            <strong>💡 איך זה עובד?</strong>
          </p>
          <ol className="text-xs text-gray-600 mt-2 space-y-1 mr-4">
            <li>1. הזן את כתובת המייל שלך</li>
            <li>2. קבל לינק מיוחד למייל</li>
            <li>3. לחץ על הלינק</li>
            <li>4. הזן סיסמה חדשה</li>
            <li>5. זהו! תוכל להתחבר 🎉</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
