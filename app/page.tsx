'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const { currentUser, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ✅ NEW: Redirect if already logged in
  useEffect(() => {
    if (!authLoading && currentUser) {
      router.push('/dashboard')
    }
  }, [currentUser, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Fetch user details from Users table
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('*')
        .eq('Email', email)
        .single()

      if (userError) throw userError

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  // ✅ NEW: Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">בודק התחברות...</p>
        </div>
      </div>
    )
  }

  // ✅ If user is logged in, show nothing (will redirect)
  if (currentUser) {
    return null
  }

  // ✅ User is not logged in - show login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <Image
                src="/noam-herz-logo.png"
                alt="Noam Herz Climbing"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Climbing Training
          </h1>
          <p className="text-gray-600">התחבר לחשבון שלך</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              שכחתי סיסמה
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? '⏳ מתחבר...' : '🚀 התחבר'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          אין לך חשבון?{' '}
          <span className="text-gray-800 font-medium">
            פנה למאמן שלך
          </span>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Noam Herz Climbing
          </p>
        </div>
      </div>
    </div>
  )
}