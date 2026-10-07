'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import AdminPasswordReset from '@/components/admin/AdminPasswordReset'

interface User {
  UserID: number
  Email: string
  Name: string
  Role: 'admin' | 'coach' | 'user'
  IsActive?: boolean
  Status?: string
  CreatedAt?: string
}

// ========================================
// HELPER: Get Auth Headers
// ========================================
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`
  }
}

export default function UserManagementPage() {
  const { currentUser, loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  const router = useRouter()
  const [userRole, setUserRole] = useState<'admin' | 'coach' | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)

  // New user form
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user' as 'admin' | 'coach' | 'user'
  })

  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && !activeEmail) {
        router.push('/dashboard')
        return
      }
      if (!activeEmail) return

      const { data: user } = await supabase
        .from('Users')
        .select('Role')
        .eq('Email', activeEmail)
        .single()

      if (!user || (user.Role !== 'admin' && user.Role !== 'coach')) {
        router.push('/dashboard')
        return
      }

      setUserRole(user.Role)
    }
    checkAuth()
  }, [authLoading, activeEmail, router])

  useEffect(() => {
    if (userRole) fetchUsers()
  }, [userRole])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .order('UserID', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      alert('שגיאה בטעינת משתמשים')
    } finally {
      setLoading(false)
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // ========================================
  // ADD USER - WITH AUTO-CONFIRMATION
  // ========================================
  const handleAddUser = async () => {
    // Validation
    if (!newUser.email || !newUser.name || !newUser.password) {
      alert('⚠️ אנא מלא את כל השדות')
      return
    }

    if (!validateEmail(newUser.email)) {
      alert('⚠️ כתובת המייל לא תקינה')
      return
    }

    if (newUser.password.length < 6) {
      alert('⚠️ הסיסמה חייבת להיות לפחות 6 תווים')
      return
    }

    try {
      setLoading(true)

      // Get auth headers with token
      const headers = await getAuthHeaders()

      // Call API Route with auth
      const response = await fetch('/api/admin/create-confirmed-user', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          email: newUser.email.toLowerCase(),
          password: newUser.password,
          name: newUser.name,
          role: newUser.role
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      // Success!
      alert(`✅ משתמש ${result.user.email} נוסף בהצלחה!\n` +
            `התפקיד: ${result.user.role}\n` +
            `האימייל מאושר אוטומטית - המשתמש יכול להתחבר מיד!`)

      // Reset form
      setNewUser({ email: '', name: '', password: '', role: 'user' })
      setShowAddUser(false)

      // Reload users
      fetchUsers()

    } catch (error: any) {
      console.error('Error adding user:', error)
      alert(`❌ שגיאה בהוספת משתמש: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ========================================
  // UPDATE USER - WITH API ROUTE
  // ========================================
  const handleUpdateUser = async () => {
    if (!editingUser) return

    if (!validateEmail(editingUser.Email)) {
      alert('⚠️ כתובת המייל לא תקינה')
      return
    }

    if (!editingUser.Name || !editingUser.Role) {
      alert('⚠️ יש למלא את כל השדות')
      return
    }

    try {
      setLoading(true)

      // Get auth headers with token
      const headers = await getAuthHeaders()

      // Call API Route with auth
      const response = await fetch('/api/admin/update-user', {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          email: editingUser.Email,
          name: editingUser.Name,
          role: editingUser.Role
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user')
      }

      // Success!
      alert(`✅ המשתמש ${editingUser.Name} עודכן בהצלחה!`)
      setEditingUser(null)
      fetchUsers()

    } catch (error: any) {
      console.error('Error updating user:', error)
      alert(`❌ שגיאה בעדכון משתמש: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ========================================
  // TOGGLE ACTIVE/INACTIVE
  // ========================================
  const handleToggleActive = async (user: User) => {
    const newStatus = user.Status === 'Active' ? 'Inactive' : 'Active'

    try {
      const { error } = await supabase
        .from('Users')
        .update({ Status: newStatus })
        .eq('UserID', user.UserID)

      if (error) throw error

      setUsers(prev => prev.map(u =>
        u.UserID === user.UserID ? { ...u, Status: newStatus } : u
      ))
    } catch (error) {
      console.error('Error toggling user status:', error)
      alert('שגיאה בעדכון סטטוס')
    }
  }

  // ========================================
  // DELETE USER
  // ========================================
  const handleDeleteUser = async (user: User) => {
    if (user.Email === currentUser?.Email) {
      alert('❌ לא ניתן למחוק את עצמך!')
      return
    }

    const confirmed = confirm(
      `⚠️ האם אתה בטוח שברצונך למחוק את ${user.Name}?\n\nזה ימחק:\n- את המשתמש מהמערכת\n- את כל האימונים שלו\n- את כל הלוגים שלו\n\nפעולה זו בלתי הפיכה!`
    )

    if (!confirmed) return

    try {
      setLoading(true)

      // Use API route to bypass RLS
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: user.Email })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      alert(`✅ המשתמש ${user.Name} נמחק בהצלחה`)
      fetchUsers()
    } catch (error: any) {
      console.error('❌ Error deleting user:', error)
      alert(`❌ שגיאה במחיקת משתמש: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ========================================
  // FILTER USERS
  // ========================================
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.Email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.Role === roleFilter
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.Status === 'Active') ||
      (statusFilter === 'inactive' && user.Status !== 'Active')

    return matchesSearch && matchesRole && matchesStatus
  })

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      admin: '👑',
      coach: '🏋️',
      user: '🧗'
    }
    return icons[role] || '👤'
  }

  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      admin: 'מנהל',
      coach: 'מאמן',
      user: 'מטפס'
    }
    return names[role] || role
  }

  // ========================================
  // LOADING STATE
  // ========================================
  if (!userRole) return null

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-fg-3">טוען משתמשים...</p>
        </div>
      </div>
    )
  }

  // ========================================
  // RENDER
  // ========================================
  return (
    <div dir="rtl" className="min-h-screen bg-surface pb-20">
      {/* Header */}
      <div className="bg-surface border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-info">👥 ניהול משתמשים</h1>
            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 bg-success text-on-accent rounded-lg hover:bg-success/90 transition-colors font-medium"
            >
              ➕ הוסף משתמש
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="🔍 חיפוש לפי שם או מייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info"
            />
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info"
            >
              <option value="all">כל התפקידים</option>
              <option value="admin">👑 מנהל</option>
              <option value="coach">🏋️ מאמן</option>
              <option value="user">🧗 מטפס</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="active">✅ פעיל</option>
              <option value="inactive">❌ לא פעיל</option>
            </select>
          </div>

          <div className="mt-3 flex gap-4 text-sm text-fg-3">
            <span>סה"כ: {users.length} משתמשים</span>
            <span>מוצג: {filteredUsers.length}</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-surface rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-fg-2">משתמש</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-fg-2">תפקיד</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-fg-2">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map(user => (
                  <tr
                    key={user.UserID}
                    className={`transition-colors ${
 user.Status === 'Inactive'
 ? 'bg-surface hover:bg-surface/90'
 : 'bg-surface hover:bg-surface/90'
 }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
 user.Status === 'Active' ? 'bg-success' : 'bg-raised'
 }`} />
                        <div>
                          <p className={`font-medium ${user.Status === 'Inactive' ? 'text-faint' : 'text-fg'}`}>
                            {user.Name}
                          </p>
                          <p className={`text-sm ${user.Status === 'Inactive' ? 'text-faint' : 'text-muted'}`}>
                            {user.Email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
 user.Status === 'Inactive' ? 'bg-surface text-faint' : 'bg-accent/15 text-accent'
 }`}>
                        {getRoleIcon(user.Role)} {getRoleName(user.Role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="px-3 py-1 bg-accent text-on-accent rounded hover:bg-accent/90 text-sm"
                          title="ערוך"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setResetPasswordUser(user)}
                          className="px-3 py-1 bg-warning text-on-accent rounded hover:bg-warning/90 text-sm"
                          title="איפוס סיסמה"
                        >
                          🔐
                        </button>
                        {user.Role !== 'admin' && user.Email !== currentUser?.Email && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="px-3 py-1 bg-danger text-on-accent rounded hover:bg-danger/90 text-sm"
                            title="מחק"
                          >
                            🗑️
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
 user.Status === 'Active'
 ? 'bg-danger/15 text-danger hover:bg-danger/15'
 : 'bg-success/15 text-success hover:bg-success/15'
 }`}
                        >
                          {user.Status === 'Active' ? 'השבת' : 'הפעל'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted">לא נמצאו משתמשים</p>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-fg">➕ הוסף משתמש חדש</h2>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-faint hover:text-fg-3 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-2 mb-2">אימייל *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-2">שם מלא *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="שם המשתמש"
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-2">סיסמה *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="לפחות 6 תווים"
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-2">תפקיד</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
                >
                  <option value="user">🧗 מטפס</option>
                  <option value="coach">🏋️ מאמן</option>
                  <option value="admin">👑 מנהל</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleAddUser}
                  disabled={loading}
                  className="flex-1 py-3 bg-success text-on-accent rounded-lg hover:bg-success/90 disabled:opacity-50 font-medium"
                >
                  {loading ? '⏳ מוסיף...' : '✅ הוסף משתמש'}
                </button>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-6 py-3 bg-raised text-fg-2 rounded-lg hover:bg-raised/90"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-fg">✏️ עריכת משתמש</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-faint hover:text-fg-3 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-2 mb-2">אימייל</label>
                <input
                  type="email"
                  value={editingUser.Email}
                  disabled
                  className="w-full px-4 py-2 border border-line rounded-lg bg-surface text-fg-3"
                />
                <p className="text-xs text-muted mt-1">לא ניתן לשנות אימייל</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-2">שם מלא</label>
                <input
                  type="text"
                  value={editingUser.Name}
                  onChange={(e) => setEditingUser({...editingUser, Name: e.target.value})}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-2">תפקיד</label>
                <select
                  value={editingUser.Role}
                  onChange={(e) => setEditingUser({...editingUser, Role: e.target.value as any})}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-accent"
                >
                  <option value="user">🧗 מטפס</option>
                  <option value="coach">🏋️ מאמן</option>
                  <option value="admin">👑 מנהל</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdateUser}
                  disabled={loading}
                  className="flex-1 py-3 bg-accent text-on-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 font-medium"
                >
                  {loading ? '⏳ שומר...' : '💾 שמור שינויים'}
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-6 py-3 bg-raised text-fg-2 rounded-lg hover:bg-raised/90"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPasswordUser && (
        <AdminPasswordReset
          userEmail={resetPasswordUser.Email}
          userName={resetPasswordUser.Name}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => fetchUsers()}
        />
      )}
    </div>
  )
}