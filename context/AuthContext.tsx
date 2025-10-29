// context/AuthContext.tsx - FINAL VERSION (FIXED IMPORT)
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  Role, 
  Permission,
  Feature,
  hasPermission as checkPermission,
  hasFeature as checkFeature,
  canAccessUser as checkCanAccessUser,
  getRoleConfig
} from '@/lib/permissions'  // ✅ תוקן!

interface User {
  Email: string
  Name: string
  Role: Role
}

interface AuthContextType {
  // Users
  currentUser: User | null           // המשתמש המחובר (אמיתי)
  activeUser: User | null            // המשתמש שצופים בו (יכול להיות מתאמן)
  isImpersonating: boolean           // צופים במישהו אחר?
  
  // Available users to switch to
  availableUsers: User[]             // מתאמנים זמינים (למאמן) או כל המשתמשים (לאדמין)
  trainees: User[]                   // Alias for availableUsers (for compatibility)
  
  // Actions
  login: (email: string) => Promise<void>
  logout: () => void
  switchToUser: (emailOrUser: string | User) => void  // ✅ Accept both string and User
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
  const [loading, setLoading] = useState(true)

  // Check for stored session
  useEffect(() => {
    const storedEmail = localStorage.getItem('currentUserEmail')
    const storedActiveEmail = localStorage.getItem('activeUserEmail')
    
    if (storedEmail) {
      loadUser(storedEmail, storedActiveEmail)
    } else {
      setLoading(false)
    }
  }, [])

  /**
   * Load user and their available users
   */
  const loadUser = async (email: string, activeEmail?: string | null) => {
    try {
      setLoading(true)
      
      // Load current user
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('Email, Name, Role')
        .eq('Email', email)
        .single()
      
      if (userError || !userData) {
        console.error('Error loading user:', userError)
        logout()
        return
      }
      
      setCurrentUser(userData)
      
      // Load available users based on role
      await loadAvailableUsers(userData)
      
      // Set active user
      if (activeEmail && activeEmail !== email) {
        // Load the stored active user
        const { data: activeUserData } = await supabase
          .from('Users')
          .select('Email, Name, Role')
          .eq('Email', activeEmail)
          .single()
        
        if (activeUserData) {
          setActiveUser(activeUserData)
        } else {
          setActiveUser(userData)
        }
      } else {
        setActiveUser(userData)
      }
      
    } catch (error) {
      console.error('Error in loadUser:', error)
      logout()
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
          
          // Store trainee emails for quick lookup
          setTraineeEmails(new Set(trainees.map(t => t.Email)))
          
          // Add self + trainees
          setAvailableUsers([user, ...trainees])
        } else {
          // No trainees, just self
          setAvailableUsers([user])
          setTraineeEmails(new Set())
        }
      } else {
        // Regular user - no switching
        setAvailableUsers([])
        setTraineeEmails(new Set())
      }
    } catch (error) {
      console.error('Error loading available users:', error)
      setAvailableUsers([])
    }
  }

  /**
   * Login
   */
  const login = async (email: string) => {
    localStorage.setItem('currentUserEmail', email)
    await loadUser(email)
  }

  /**
   * Logout
   */
  const logout = () => {
    localStorage.removeItem('currentUserEmail')
    localStorage.removeItem('activeUserEmail')
    setCurrentUser(null)
    setActiveUser(null)
    setAvailableUsers([])
    setTraineeEmails(new Set())
  }

  /**
   * Switch to viewing another user
   */
  const switchToUser = (emailOrUser: string | User) => {
    // If it's a string (email), find the user in availableUsers
    if (typeof emailOrUser === 'string') {
      const user = availableUsers.find(u => u.Email === emailOrUser)
      if (!user) {
        console.error('User not found:', emailOrUser)
        return
      }
      setActiveUser(user)
      localStorage.setItem('activeUserEmail', user.Email)
    } else {
      // It's already a User object
      setActiveUser(emailOrUser)
      localStorage.setItem('activeUserEmail', emailOrUser.Email)
    }
  }

  /**
   * Switch back to self
   */
  const switchToSelf = () => {
    if (currentUser) {
      setActiveUser(currentUser)
      localStorage.removeItem('activeUserEmail')
    }
  }

  /**
   * Refresh available users (useful after adding new trainee)
   */
  const refreshAvailableUsers = async () => {
    if (currentUser) {
      await loadAvailableUsers(currentUser)
    }
  }

  /**
   * Check if current user has permission
   */
  const hasPermissionCheck = (permission: Permission): boolean => {
    if (!currentUser) return false
    return checkPermission(currentUser.Role, permission)
  }

  /**
   * Check if current user has feature
   */
  const hasFeatureCheck = (feature: Feature): boolean => {
    if (!currentUser) return false
    return checkFeature(currentUser.Role, feature)
  }

  /**
   * Check if current user can access another user
   */
  const canAccessUser = (email: string): boolean => {
    if (!currentUser) return false
    
    const result = checkCanAccessUser(currentUser.Role, currentUser.Email, email)
    
    if (result === 'yes') return true
    if (result === 'no') return false
    
    // 'check_db' - Coach needs to check if trainee
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
    availableUsers,
    trainees: availableUsers,  // ✅ Alias for compatibility
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

/**
 * Main auth hook
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Get active user email (for queries)
 */
export function useActiveUserEmail() {
  const { activeUser } = useAuth()
  return activeUser?.Email || ''
}

/**
 * Check specific permission
 */
export function usePermission(permission: Permission) {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

/**
 * Check specific feature
 */
export function useFeature(feature: Feature) {
  const { hasFeature } = useAuth()
  return hasFeature(feature)
}

/**
 * Get current role
 */
export function useRole() {
  const { currentUser } = useAuth()
  return currentUser?.Role
}

/**
 * Get role config (label, icon, color)
 */
export function useRoleConfig() {
  const role = useRole()
  if (!role) return null
  return getRoleConfig(role)
}