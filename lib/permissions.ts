// lib/permissions.ts - FINAL VERSION
/**
 * Permission & Feature System
 * - Roles defined in code (type-safe, fast)
 * - Features for UI components (Footer, Sidebar, etc.)
 * - Coach can perform actions on their trainees
 */

// ============================================
// TYPES
// ============================================

export type Role = 'admin' | 'coach' | 'user'

export type Permission =
  // Calendar
  | 'view_own_calendar'
  | 'view_others_calendar'
  | 'edit_own_calendar'
  | 'edit_others_calendar'
  | 'delete_calendar_event'
  
  // Workout Execution
  | 'execute_workout'
  | 'view_workout_logs'
  | 'edit_workout_logs'
  | 'delete_workout_log'
  
  // Workout Management (Templates)
  | 'create_workout'
  | 'edit_workout'
  | 'delete_workout'
  | 'assign_workout'
  | 'view_all_workouts'
  
  // Exercise Management
  | 'create_exercise'
  | 'edit_exercise'
  | 'delete_exercise'
  | 'view_all_exercises'
  
  // Deloading
  | 'apply_deloading'
  | 'remove_deloading'
  
  // User Management
  | 'view_users'
  | 'create_user'
  | 'edit_user'
  | 'delete_user'
  | 'assign_coach'
  | 'view_user_details'
  
  // Statistics
  | 'view_own_stats'
  | 'view_others_stats'
  | 'view_global_stats'
  
  // Climbing Log
  | 'view_climbing_log'
  | 'edit_climbing_log'
  | 'view_others_climbing_log'

// Features for UI components
export type Feature =
  | 'footer_user_switcher'    // Footer עם החלפת משתמשים
  | 'sidebar'                 // Sidebar (עתידי)
  | 'admin_panel'             // פאנל ניהול
  | 'workout_management'      // ניהול אימונים
  | 'exercise_management'     // ניהול תרגילים
  | 'user_management'         // ניהול משתמשים
  | 'statistics_dashboard'    // דשבורד סטטיסטיקות מתקדם
  | 'bulk_operations'         // פעולות מרובות

// ============================================
// ROLE DEFINITIONS
// ============================================

export const ROLE_CONFIG = {
  admin: {
    label: 'מנהל',
    icon: '👑',
    color: 'bg-danger/15 text-danger border-danger/30',
    priority: 100
  },
  coach: {
    label: 'מאמן',
    icon: '👨‍🏫',
    color: 'bg-accent/15 text-accent border-accent/30',
    priority: 50
  },
  user: {
    label: 'מתאמן',
    icon: '🧗',
    color: 'bg-success/15 text-success border-success/30',
    priority: 10
  }
} as const

// ============================================
// DEFAULT PERMISSIONS PER ROLE
// ============================================

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // USER (מתאמן) - רק על עצמו
  user: [
    // Calendar - own only
    'view_own_calendar',
    'edit_own_calendar',
    
    // Workout execution
    'execute_workout',
    'view_workout_logs',
    'edit_workout_logs',
    
    // Stats
    'view_own_stats',
    
    // Climbing log
    'view_climbing_log',
    'edit_climbing_log',
  ],

  // COACH (מאמן) - על עצמו + המתאמנים שלו
  coach: [
    // Inherit user permissions
    'view_own_calendar',
    'edit_own_calendar',
    'execute_workout',
    'view_workout_logs',
    'edit_workout_logs',
    'view_own_stats',
    'view_climbing_log',
    'edit_climbing_log',
    
    // Additional for trainees
    'view_others_calendar',
    'edit_others_calendar',
    'delete_calendar_event',
    'assign_workout',
    'apply_deloading',
    'remove_deloading',
    'view_others_stats',
    'view_others_climbing_log',
    'view_user_details',
  ],

  // ADMIN (מנהל) - הכל!
  admin: [
    // All calendar
    'view_own_calendar',
    'view_others_calendar',
    'edit_own_calendar',
    'edit_others_calendar',
    'delete_calendar_event',
    
    // All workouts
    'execute_workout',
    'view_workout_logs',
    'edit_workout_logs',
    'delete_workout_log',
    'create_workout',
    'edit_workout',
    'delete_workout',
    'assign_workout',
    'view_all_workouts',
    
    // All exercises
    'create_exercise',
    'edit_exercise',
    'delete_exercise',
    'view_all_exercises',
    
    // Deloading
    'apply_deloading',
    'remove_deloading',
    
    // User management
    'view_users',
    'create_user',
    'edit_user',
    'delete_user',
    'assign_coach',
    'view_user_details',
    
    // Stats
    'view_own_stats',
    'view_others_stats',
    'view_global_stats',
    
    // Climbing log
    'view_climbing_log',
    'edit_climbing_log',
    'view_others_climbing_log',
  ],
}

// ============================================
// FEATURES PER ROLE
// ============================================

export const ROLE_FEATURES: Record<Role, Feature[]> = {
  user: [
    // No special features
  ],
  
  coach: [
    'footer_user_switcher',
    'sidebar',
    'statistics_dashboard',
  ],
  
  admin: [
    'footer_user_switcher',
    'sidebar',
    'admin_panel',
    'workout_management',
    'exercise_management',
    'user_management',
    'statistics_dashboard',
    'bulk_operations',
  ],
}

// ============================================
// PERMISSION LABELS
// ============================================

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_own_calendar: 'צפייה בקלנדר אישי',
  view_others_calendar: 'צפייה בקלנדר של אחרים',
  edit_own_calendar: 'עריכת קלנדר אישי',
  edit_others_calendar: 'עריכת קלנדר של אחרים',
  delete_calendar_event: 'מחיקת אירוע בקלנדר',
  
  execute_workout: 'ביצוע אימון',
  view_workout_logs: 'צפייה בלוגים',
  edit_workout_logs: 'עריכת לוגים',
  delete_workout_log: 'מחיקת לוג',
  
  create_workout: 'יצירת תבנית אימון',
  edit_workout: 'עריכת תבנית אימון',
  delete_workout: 'מחיקת תבנית אימון',
  assign_workout: 'הקצאת אימון',
  view_all_workouts: 'צפייה בכל האימונים',
  
  create_exercise: 'יצירת תרגיל',
  edit_exercise: 'עריכת תרגיל',
  delete_exercise: 'מחיקת תרגיל',
  view_all_exercises: 'צפייה בכל התרגילים',
  
  apply_deloading: 'החלת דילודינג',
  remove_deloading: 'הסרת דילודינג',
  
  view_users: 'צפייה במשתמשים',
  create_user: 'יצירת משתמש',
  edit_user: 'עריכת משתמש',
  delete_user: 'מחיקת משתמש',
  assign_coach: 'הקצאת מאמן',
  view_user_details: 'צפייה בפרטי משתמש',
  
  view_own_stats: 'צפייה בסטטיסטיקות אישיות',
  view_others_stats: 'צפייה בסטטיסטיקות של אחרים',
  view_global_stats: 'צפייה בסטטיסטיקות גלובליות',
  
  view_climbing_log: 'צפייה בלוג בוק טיפוס',
  edit_climbing_log: 'עריכת לוג בוק טיפוס',
  view_others_climbing_log: 'צפייה בלוג בוק של אחרים',
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Check if role has permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  // Admin has everything
  if (role === 'admin') return true
  
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * Check if role has feature
 */
export function hasFeature(role: Role, feature: Feature): boolean {
  return ROLE_FEATURES[role].includes(feature)
}

/**
 * Get all permissions for role
 */
export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role]
}

/**
 * Get all features for role
 */
export function getFeatures(role: Role): Feature[] {
  return ROLE_FEATURES[role]
}

/**
 * Get role config (label, icon, color)
 */
export function getRoleConfig(role: Role) {
  return ROLE_CONFIG[role]
}

// ============================================
// USAGE HELPERS
// ============================================

/**
 * Check if user can access another user's data
 * Note: This needs DB check for coach-trainee relationship
 */
export function canAccessUser(
  currentRole: Role,
  currentEmail: string,
  targetEmail: string
): 'yes' | 'no' | 'check_db' {
  // Can always access self
  if (currentEmail === targetEmail) return 'yes'
  
  // Admin can access anyone
  if (currentRole === 'admin') return 'yes'
  
  // Coach needs DB check for trainees
  if (currentRole === 'coach') return 'check_db'
  
  // User cannot access others
  return 'no'
}

/**
 * Should show Footer component?
 */
export function shouldShowFooter(role: Role): boolean {
  return hasFeature(role, 'footer_user_switcher')
}

/**
 * Can this role impersonate other users?
 */
export function canImpersonate(role: Role): boolean {
  return hasFeature(role, 'footer_user_switcher')
}

/**
 * Should show Sidebar?
 */
export function shouldShowSidebar(role: Role): boolean {
  return hasFeature(role, 'sidebar')
}

/**
 * Get available navigation items based on role
 */
export function getNavItems(role: Role) {
  const base = [
    { href: '/calendar', label: '📅 קלנדר', permission: 'view_own_calendar' as Permission },
    { href: '/workouts', label: '🏋️ אימונים', permission: 'view_workout_logs' as Permission },
    { href: '/dashboard', label: '📊 דשבורד', permission: 'view_own_stats' as Permission },
    { href: '/climbing-log', label: '📖 לוג בוק', permission: 'view_climbing_log' as Permission },
  ]
  
  const coach = [
    { href: '/my-trainees', label: '👥 המתאמנים שלי', permission: 'view_user_details' as Permission },
  ]
  
  const admin = [
    { href: '/admin/exercises', label: '💪 תרגילים', permission: 'view_all_exercises' as Permission },
    { href: '/admin/workouts', label: '🏋️ אימונים', permission: 'view_all_workouts' as Permission },
    { href: '/admin/users', label: '👥 משתמשים', permission: 'view_users' as Permission },
  ]
  
  let items = base
  
  if (role === 'coach') {
    items = [...items, ...coach]
  }
  
  if (role === 'admin') {
    items = [...items, ...coach, ...admin]
  }
  
  return items.filter(item => hasPermission(role, item.permission))
}

// ============================================
// TYPE GUARDS
// ============================================

export function isRole(value: string): value is Role {
  return ['admin', 'coach', 'user'].includes(value)
}

export function isPermission(value: string): value is Permission {
  return Object.keys(PERMISSION_LABELS).includes(value)
}