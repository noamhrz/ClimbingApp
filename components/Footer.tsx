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
  Status?: string
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
      <footer className="fixed bottom-0 left-0 right-0 text-fg z-50 border-t border-line bg-bg/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            {/* Left: Current User Role + Quick Links */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{currentConfig.icon}</span>
                <div className="text-sm">
                  <p className="font-bold text-fg">{currentConfig.label}</p>
                  <p className="text-xs text-faint">מחובר</p>
                </div>
              </div>


            </div>

            {/* Center: Impersonation Status */}
            {isImpersonating && activeUser && (
              <div className="hidden md:flex items-center gap-2 bg-warning/10 px-4 py-2 rounded-full border border-warning/30 text-fg-2">
                <span className="text-sm">🔍 צופה כ:</span>
                <span className="font-semibold">{activeConfig?.icon} {activeUser.Name}</span>
                <button
                  onClick={switchToSelf}
                  className="ms-2 text-xs font-semibold text-warning hover:text-fg underline px-1"
                >
                  חזור לעצמי
                </button>
              </div>
            )}

            {/* Right: User Menu Toggle */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="min-h-11 bg-accent hover:bg-accent-hover text-on-accent px-5 rounded-full font-bold transition-colors flex items-center gap-2"
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
            <div className="md:hidden mt-2 bg-warning/10 px-3 py-2 rounded-xl border border-warning/30 text-xs text-fg-2 flex items-center justify-between gap-2">
              <span>🔍 צופה כ: <strong>{activeConfig?.icon} {activeUser.Name}</strong></span>
              <button
                onClick={switchToSelf}
                className="text-warning font-semibold underline min-h-9 px-1"
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
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed bottom-20 left-0 right-0 mx-2 bg-raised text-fg rounded-2xl border border-line-strong shadow-2xl shadow-black/60 z-50 max-h-[60vh] overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 text-fg px-4 py-3 flex justify-between items-center bg-raised border-b border-line">
            <h3 className="font-bold text-lg">בחר מתאמן</h3>
            <button
              onClick={onClose}
              className="text-2xl text-muted hover:text-fg hover:bg-line w-11 h-11 rounded-full flex items-center justify-center transition-colors" aria-label="סגור"
            >
              ×
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
              <p className="text-fg-3">טוען מתאמנים...</p>
            </div>
          )}

          {/* User List */}
          {!loading && trainees && trainees.length > 0 && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {trainees.map((user: User) => {
                const config = getRoleConfig(user.Role)
                const isActive = user.Email === activeUserEmail
                const isSelf = user.Email === currentUserEmail
                const isInactive = user.Status === 'Inactive'

                return (
                  <button
                    key={user.Email}
                    onClick={() => onSelectUser(user.Email)}
                    className={`p-4 rounded-xl border transition-colors text-start ${
 isInactive
 ? 'border-line bg-surface opacity-50'
 : isActive
 ? 'border-accent bg-accent/10'
 : 'border-line bg-surface hover:border-accent/60 hover:bg-accent/5'
 }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-fg truncate">
                            {user.Name}
                          </span>
                          {isInactive && (
                            <span className="text-xs bg-raised text-muted px-2 py-0.5 rounded shrink-0">
                              לא פעיל
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {user.Email}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${config.color}`}>
                            {config.label}
                          </span>
                          {isSelf && (
                            <span className="text-xs bg-success/15 text-success px-2 py-1 rounded">
                              אני
                            </span>
                          )}
                          {isActive && !isSelf && (
                            <span className="text-xs bg-accent text-on-accent font-bold px-2 py-1 rounded">
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
            <div className="p-8 text-center text-muted">
              <p>לא נמצאו מתאמנים</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}