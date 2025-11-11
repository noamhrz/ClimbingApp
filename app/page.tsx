'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

// רשימת אימיילים לcopy/paste
const QUICK_EMAILS = [
  'noam.hrz@gmail.com',
  'omer@example.com',
  'dana@example.com',
  'tamarlabin@gmail.com',
  'yael@example.com',
]

export default function LoginPage() {
  const router = useRouter()
  const { login, currentUser, logout, loading: authLoading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && currentUser) {
      router.push('/dashboard')
    }
  }, [authLoading, currentUser, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('נא למלא אימייל וסיסמה')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      console.log('🔐 Login attempt:', email)
      const result = await login(email, password)

      if (result.success) {
        console.log('✅ Login successful')
        router.push('/dashboard')
      } else {
        console.error('❌ Login failed:', result.error)
        setError(result.error || 'שגיאה בהתחברות')
      }
    } catch (err: any) {
      console.error('❌ Unexpected error:', err)
      setError('שגיאה בהתחברות')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.refresh()
  }

  const copyEmail = (emailToCopy: string) => {
    setEmail(emailToCopy)
    setCopiedEmail(emailToCopy)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">טוען...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="flex gap-6 max-w-5xl w-full">
        {/* Login Form */}
        <div className="flex-1 bg-white shadow-2xl rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🧗</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Climbing Training
            </h1>
            <p className="text-gray-600">התחבר כדי להמשיך</p>
            
            {currentUser && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  מחובר כ: <strong>{currentUser.Name}</strong>
                </p>
                <button
                  onClick={handleLogout}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  התנתק
                </button>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <p className="font-semibold">❌ שגיאה</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="your@email.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                סיסמה
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full px-6 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  מתחבר...
                </span>
              ) : (
                '🔐 התחבר'
              )}
            </button>
          </form>
        </div>

        {/* Quick Emails Sidebar */}
        <div className="w-80 bg-white shadow-xl rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📋</span>
            <span>אימיילים מהירים</span>
          </h2>
          
          <p className="text-sm text-gray-600 mb-4">
            לחץ כדי להעתיק לשדה האימייל
          </p>

          <div className="space-y-2">
            {QUICK_EMAILS.map((quickEmail) => (
              <button
                key={quickEmail}
                type="button"
                onClick={() => copyEmail(quickEmail)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  email === quickEmail
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono break-all">
                    {quickEmail}
                  </span>
                  {copiedEmail === quickEmail && (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 leading-relaxed">
              💡 <strong>טיפ:</strong> לחץ על אימייל כדי להעתיק אותו אוטומטית לשדה, ואז הקלד את הסיסמה שלך
            </p>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              🔒 <strong>זכור:</strong> השתמש בסיסמה האמיתית שהגדרת ב-Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}