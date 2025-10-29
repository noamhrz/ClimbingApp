'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { canImpersonate, getRoleConfig, Role } from '@/lib/permissions'

// User type matching AuthContext
interface User {
  Email: string
  Name: string
  Role: Role
}

export default function Footer() {
  const { currentUser, activeUser, switchToUser, switchToSelf, isImpersonating } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // Only show footer if user can impersonate
  if (!currentUser || !canImpersonate(currentUser.Role)) {
    return null
  }

  const currentConfig = getRoleConfig(currentUser.Role)
  const activeConfig = activeUser ? getRoleConfig(activeUser.Role) : null

  const handleUserSwitch = async (email: string) => {
    await switchToUser(email)
    setShowUserMenu(false)
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden under fixed footer */}
      <div className="h-20"></div>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg z-50 border-t-2 border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Current User Role + Quick Links */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentConfig.icon}</span>
                <div className="text-sm">
                  <p className="font-semibold">{currentConfig.label}</p>
                  <p className="text-xs text-gray-400">מחובר</p>
                </div>
              </div>

              {/* Quick Link: Assign Workouts */}
              <Link
                href="/admin/assign-workouts"
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <span>🏋️</span>
                <span className="hidden md:inline">הקצאת אימונים</span>
                <span className="md:hidden">אימונים</span>
              </Link>
            </div>

            {/* Center: Impersonation Status */}
            {isImpersonating && activeUser && (
              <div className="hidden md:flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500/30">
                <span className="text-sm">🔍 צופה כ:</span>
                <span className="font-semibold">{activeConfig?.icon} {activeUser.Name}</span>
                <button
                  onClick={switchToSelf}
                  className="ml-2 text-xs bg-yellow-500 hover:bg-yellow-600 px-2 py-1 rounded transition-colors"
                >
                  חזור לעצמי
                </button>
              </div>
            )}

            {/* Right: User Menu Toggle */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-all shadow-md flex items-center gap-2"
            >
              <span>👥</span>
              <span className="hidden sm:inline">החלף מתאמן</span>
              <span className="sm:hidden">החלף</span>
              <span className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          </div>

          {/* Mobile Impersonation Status */}
          {isImpersonating && activeUser && (
            <div className="md:hidden mt-2 bg-yellow-500/20 px-3 py-2 rounded-lg border border-yellow-500/30 text-xs">
              <span>🔍 צופה כ: <strong>{activeConfig?.icon} {activeUser.Name}</strong></span>
              <button
                onClick={switchToSelf}
                className="ml-2 bg-yellow-500 hover:bg-yellow-600 px-2 py-1 rounded"
              >
                חזור
              </button>
            </div>
          )}
        </div>

        {/* User Selection Menu */}
        {showUserMenu && (
          <UserSelectionMenu
            currentUserEmail={currentUser.Email}
            activeUserEmail={activeUser?.Email}
            onSelectUser={handleUserSwitch}
            onClose={() => setShowUserMenu(false)}
          />
        )}
      </footer>
    </>
  )
}

// User Selection Menu Component
function UserSelectionMenu({
  currentUserEmail,
  activeUserEmail,
  onSelectUser,
  onClose,
}: {
  currentUserEmail: string
  activeUserEmail?: string
  onSelectUser: (email: string) => void
  onClose: () => void
}) {
  const { trainees, loading } = useAuth()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed bottom-20 left-0 right-0 bg-white text-gray-900 shadow-2xl z-50 max-h-[60vh] overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-bold text-lg">בחר מתאמן</h3>
            <button
              onClick={onClose}
              className="text-2xl hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">טוען מתאמנים...</p>
            </div>
          )}

          {/* User List */}
          {!loading && trainees && trainees.length > 0 && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {trainees.map((user: User) => {
                const config = getRoleConfig(user.Role)
                const isActive = user.Email === activeUserEmail
                const isSelf = user.Email === currentUserEmail

                return (
                  <button
                    key={user.Email}
                    onClick={() => onSelectUser(user.Email)}
                    className={`p-4 rounded-lg border-2 transition-all text-right ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {user.Name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.Email}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${config.color}`}>
                            {config.label}
                          </span>
                          {isSelf && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              אני
                            </span>
                          )}
                          {isActive && !isSelf && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              פעיל
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && (!trainees || trainees.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              <p>לא נמצאו מתאמנים</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}