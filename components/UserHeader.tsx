'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getRoleConfig } from '@/lib/permissions'

export default function UserHeader() {
  const { activeUser, currentUser, isImpersonating, switchToSelf, logout } = useAuth()
  const router = useRouter()

  if (!activeUser) return null

  const activeConfig = getRoleConfig(activeUser.Role)
  const currentConfig = currentUser ? getRoleConfig(currentUser.Role) : null

  // Get role image
  const getRoleImage = (role: string) => {
    if (role === 'admin') return '/admin.png'
    if (role === 'coach') return '/coach.png'
    return '/climber.png'
  }

  // ✅ FIXED: Redirect to / (home/login page)
  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top Row - User Info */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            {/* Role Image - Large and prominent */}
            <div className="w-16 h-16 bg-white rounded-full p-2 shadow-lg flex items-center justify-center">
              <img 
                src={getRoleImage(activeUser.Role)}
                alt={activeUser.Role}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs text-blue-200">משתמש פעיל:</p>
              {/* Profile link */}
              <Link 
                href="/profile"
                className="font-bold text-lg hover:text-blue-100 transition-colors inline-flex items-center gap-1 group"
              >
                <span>{activeUser.Name}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm">👤</span>
              </Link>
              <p className="text-xs text-blue-200">
                {activeUser.Email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* If impersonating - show "Back to Self" */}
            {isImpersonating && (
              <button
                onClick={switchToSelf}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2"
                title="חזור לעצמי"
              >
                <span>👤</span>
                <span className="hidden sm:inline">חזור ל-{currentUser?.Name}</span>
                <span className="sm:hidden">חזור</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2"
              title="התנתק"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">התנתק</span>
            </button>
          </div>
        </div>

        {/* Bottom Row - Navigation */}
        <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link
            href="/dashboard"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/calendar"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
          >
            📅 לוח אימונים
          </Link>
          <Link
            href="/workouts"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
          >
            🏋️ אימונים
          </Link>
          <Link
            href="/climbing-log"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
          >
            📖 לוג בוק
          </Link>
          
          {/* Coach/Admin only links */}
          {(currentUser?.Role === 'coach' || currentUser?.Role === 'admin') && (
            <>
              <Link
                href="/exercises"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
              >
                💪 תרגילים
              </Link>
              <Link
                href="/workouts-editor"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
              >
                🏋️ ניהול אימונים
              </Link>
              <Link
                href="/admin/assign-workouts"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
              >
                📋 הקצאת אימונים
              </Link>
            </>
          )}

          {/* Admin only links */}
          {currentUser?.Role === 'admin' && (
            <>
              <Link
                href="/admin/users"
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border-2 border-purple-400 hover:border-purple-300 shadow-lg"
              >
                👥 ניהול משתמשים
              </Link>
            </>
          )}
        </nav>

        {/* Impersonation Banner */}
        {isImpersonating && currentUser && (
          <div className="mt-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>🔍</span>
                <span>
                  אתה ({currentConfig?.icon} {currentUser.Name}) צופה כ-{' '}
                  <strong>{activeConfig.icon} {activeUser.Name}</strong>
                </span>
              </div>
              <button
                onClick={switchToSelf}
                className="text-yellow-200 hover:text-white underline font-medium"
              >
                חזור לעצמי
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}