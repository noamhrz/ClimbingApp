// context/AuthContext.tsx - WITH REAL SUPABASE AUTH
// CLEANED: Debug logs hidden by default
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Session } from '@supabase/supabase-js'
import { 
  Role, 
  Permission,
  Feature,
  hasPermission as checkPermission,
  hasFeature as checkFeature,
  canAccessUser as checkCanAccessUser,
  getRoleConfig
} from '@/lib/permissions'

// Debug mode - set to true to see debug logs
const DEBUG = false

// Helper functions for logging
const debugLog = (...args: any[]) => {
  if (DEBUG) console.log(...args)
}

interface User {
  Email: string
  Name: string
  Role: Role
}

interface AuthContextType {
  // Users
  currentUser: User | null
  activeUser: User | null
  isImpersonating: boolean
  session: Session | null
  
  // Available users
  availableUsers: User[]
  trainees: User[]
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  switchToUser: (emailOrUser: string | User) => void
  switchToSelf: () => void
  refreshAvailableUsers: () => Promise<void>
  
  // Permissions
  hasPermission: (permission: Permission) => boolean
  hasFeature: (feature: Feature) => boolean
  canAccessUser: (email: string) => boolean
  
  // Loading
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeUser, setActiveUser] = useState<User | null>(null)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [traineeEmails, setTraineeEmails] = useState<Set<string>>(new Set())
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Listen to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      debugLog('🔐 Initial session:', session?.user?.email)
      setSession(session)
      if (session?.user?.email) {
        loadUser(session.user.email)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      debugLog('🔐 Auth state changed:', _event, session?.user?.email)
      setSession(session)
      
      if (session?.user?.email) {
        loadUser(session.user.email)
      } else {
        // Logged out
        setCurrentUser(null)
        setActiveUser(null)
        setAvailableUsers([])
        setTraineeEmails(new Set())
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Load user data from Users table
   * ✅ FIXED: Better error checking
   */
  const loadUser = async (email: string) => {
    try {
      setLoading(true)
      debugLog('🔍 Loading user from Users table:', email)
      
      // Load current user from Users table
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('Email, Name, Role')
        .eq('Email', email)
        .maybeSingle()
      
      // ✅ FIXED: Check for real errors (not empty object)
      if (userError && Object.keys(userError).length > 0) {
        console.error('❌ Database error loading user:', userError)
        debugLog('❌ Error details:', userError)
        await logout()
        return
      }
      
      // ✅ FIXED: Separate check for missing user
      if (!userData) {
        console.error('❌ User not found in Users table:', email)
        debugLog('⚠️ User authenticated but not in Users table')
        alert('שגיאה: המשתמש לא נמצא במערכת. אנא פנה למנהל.')
        await logout()
        return
      }
      
      debugLog('✅ User loaded successfully:', userData)
      setCurrentUser(userData)
      
      // Load available users based on role
      await loadAvailableUsers(userData)
      
      // Check if there's a stored active user
      const storedActiveEmail = localStorage.getItem('activeUserEmail')
      if (storedActiveEmail && storedActiveEmail !== email) {
        const { data: activeUserData } = await supabase
          .from('Users')
          .select('Email, Name, Role')
          .eq('Email', storedActiveEmail)
          .single()
        
        if (activeUserData) {
          setActiveUser(activeUserData)
        } else {
          setActiveUser(userData)
          localStorage.removeItem('activeUserEmail')
        }
      } else {
        setActiveUser(userData)
        localStorage.removeItem('activeUserEmail')
      }
      
    } catch (error) {
      console.error('❌ Unexpected error in loadUser:', error)
      await logout()
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load available users based on role
   */
  const loadAvailableUsers = async (user: User) => {
    try {
      if (user.Role === 'admin') {
        // Admin sees ALL users
        const { data, error } = await supabase
          .from('Users')
          .select('Email, Name, Role')
          .order('Name')
        
        if (!error && data) {
          setAvailableUsers(data)
        }
      } else if (user.Role === 'coach') {
        // Coach sees their trainees + themselves
        const { data: traineesData, error: traineesError } = await supabase
          .from('CoachTraineesActiveView')
          .select('TraineeEmail, TraineeName, TraineeRole')
          .eq('CoachEmail', user.Email)
        
        if (!traineesError && traineesData) {
          const trainees = traineesData.map(t => ({
            Email: t.TraineeEmail,
            Name: t.TraineeName,
            Role: (t.TraineeRole || 'user') as Role
          }))
          
          setTraineeEmails(new Set(trainees.map(t => t.Email)))
          setAvailableUsers([user, ...trainees])
        } else {
          setAvailableUsers([user])
          setTraineeEmails(new Set())
        }
      } else {
        // Regular user - no switching
        setAvailableUsers([])
        setTraineeEmails(new Set())
      }
    } catch (error) {
      console.error('❌ Error loading available users:', error)
      setAvailableUsers([])
    }
  }

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    try {
      debugLog('🔐 Attempting login:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Login error:', error.message)
        return { success: false, error: error.message }
      }

      if (!data.session) {
        console.error('❌ No session after login')
        return { success: false, error: 'No session created' }
      }

      debugLog('✅ Login successful:', data.session.user.email)
      
      // Session is set automatically by onAuthStateChange
      // loadUser will be called automatically
      
      return { success: true }
    } catch (error: any) {
      console.error('❌ Unexpected login error:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }
  }

  /**
   * Logout
   */
  const logout = async () => {
    try {
      debugLog('🔐 Logging out...')
      await supabase.auth.signOut()
      localStorage.removeItem('activeUserEmail')
      
      // State is cleared automatically by onAuthStateChange
      debugLog('✅ Logged out')
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
  }

  /**
   * Switch to viewing another user
   */
  const switchToUser = (emailOrUser: string | User) => {
    if (typeof emailOrUser === 'string') {
      const user = availableUsers.find(u => u.Email === emailOrUser)
      if (!user) {
        console.error('❌ User not found:', emailOrUser)
        return
      }
      setActiveUser(user)
      localStorage.setItem('activeUserEmail', user.Email)
      debugLog('🔄 Switched to user:', user.Email)
    } else {
      setActiveUser(emailOrUser)
      localStorage.setItem('activeUserEmail', emailOrUser.Email)
      debugLog('🔄 Switched to user:', emailOrUser.Email)
    }
  }

  /**
   * Switch back to self
   */
  const switchToSelf = () => {
    if (currentUser) {
      setActiveUser(currentUser)
      localStorage.removeItem('activeUserEmail')
      debugLog('🔄 Switched back to self:', currentUser.Email)
    }
  }

  /**
   * Refresh available users
   */
  const refreshAvailableUsers = async () => {
    if (currentUser) {
      await loadAvailableUsers(currentUser)
    }
  }

  /**
   * Check permission
   */
  const hasPermissionCheck = (permission: Permission): boolean => {
    if (!currentUser) return false
    return checkPermission(currentUser.Role, permission)
  }

  /**
   * Check feature
   */
  const hasFeatureCheck = (feature: Feature): boolean => {
    if (!currentUser) return false
    return checkFeature(currentUser.Role, feature)
  }

  /**
   * Check if can access user
   */
  const canAccessUser = (email: string): boolean => {
    if (!currentUser) return false
    
    const result = checkCanAccessUser(currentUser.Role, currentUser.Email, email)
    
    if (result === 'yes') return true
    if (result === 'no') return false
    
    if (result === 'check_db') {
      return traineeEmails.has(email)
    }
    
    return false
  }

  const isImpersonating = currentUser?.Email !== activeUser?.Email

  const value: AuthContextType = {
    currentUser,
    activeUser,
    isImpersonating,
    session,
    availableUsers,
    trainees: availableUsers,
    login,
    logout,
    switchToUser,
    switchToSelf,
    refreshAvailableUsers,
    hasPermission: hasPermissionCheck,
    hasFeature: hasFeatureCheck,
    canAccessUser,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================
// HOOKS
// ============================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useActiveUserEmail() {
  const { activeUser } = useAuth()
  return activeUser?.Email || ''
}

export function usePermission(permission: Permission) {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

export function useFeature(feature: Feature) {
  const { hasFeature } = useAuth()
  return hasFeature(feature)
}

export function useRole() {
  const { currentUser } = useAuth()
  return currentUser?.Role
}

export function useRoleConfig() {
  const role = useRole()
  if (!role) return null
  return getRoleConfig(role)
}