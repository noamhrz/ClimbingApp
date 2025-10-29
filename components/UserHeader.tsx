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

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top Row - User Info */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeConfig.icon}</span>
            <div>
              <p className="text-xs text-blue-200">משתמש פעיל:</p>
              <p className="font-bold text-lg">
                {activeUser.Name}
              </p>
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

            {/* Logout - always visible */}
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
            📊 דשבורד
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
                href="/my-trainees"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
              >
                👥 המתאמנים שלי
              </Link>
            </>
          )}

          {/* Admin only links */}
          {currentUser?.Role === 'admin' && (
            <>
              <Link
                href="/admin/exercises"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
              >
                💪 תרגילים
              </Link>
              <Link
                href="/admin/workouts"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
              >
                🏋️ ניהול אימונים
              </Link>
              <Link
                href="/admin/users"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium border border-white/20 hover:border-white/40"
              >
                👥 משתמשים
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
                className="text-xs underline hover:text-yellow-200"
              >
                חזור לעצמי
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </header>
  )
}