'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import AdminPasswordReset from '@/components/admin/AdminPasswordReset'

interface User {
  UserID: number
  Email: string
  Name: string
  Role: 'admin' | 'coach' | 'user'
  IsActive?: boolean
  CreatedAt?: string
}

export default function UserManagementPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
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
    if (currentUser?.Role !== 'admin') {
      router.push('/dashboard')
      return
    }
    fetchUsers()
  }, [currentUser])

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

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name
          }
        }
      })

      if (authError) throw authError

      // The trigger will automatically add to Users table
      // Wait a bit and refresh
      setTimeout(() => {
        fetchUsers()
        setShowAddUser(false)
        setNewUser({ email: '', name: '', password: '', role: 'user' })
        alert(`✅ המשתמש ${newUser.name} נוסף בהצלחה!`)
      }, 1000)

    } catch (error: any) {
      console.error('Error adding user:', error)
      alert(`❌ שגיאה: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    const newStatus = !user.IsActive

    try {
      const { error } = await supabase
        .from('Users')
        .update({ IsActive: newStatus })
        .eq('UserID', user.UserID)

      if (error) throw error

      alert(`✅ המשתמש ${user.Name} ${newStatus ? 'הופעל' : 'הושבת'}`)
      fetchUsers()
    } catch (error) {
      console.error('Error toggling user status:', error)
      alert('שגיאה בעדכון סטטוס')
    }
  }

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
      console.log('🗑️ Starting deletion for:', user.Email)

      // Use API route to bypass RLS
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: user.Email,
          adminEmail: currentUser?.Email
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      console.log('✅ User deleted successfully')
      alert(`✅ המשתמש ${user.Name} נמחק בהצלחה`)
      fetchUsers()
    } catch (error: any) {
      console.error('❌ Error deleting user:', error)
      alert(`❌ שגיאה במחיקת משתמש: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    if (!validateEmail(editingUser.Email)) {
      alert('⚠️ כתובת המייל לא תקינה')
      return
    }

    try {
      const { error } = await supabase
        .from('Users')
        .update({
          Name: editingUser.Name,
          Role: editingUser.Role,
          Email: editingUser.Email
        })
        .eq('UserID', editingUser.UserID)

      if (error) throw error

      alert(`✅ המשתמש ${editingUser.Name} עודכן בהצלחה`)
      setEditingUser(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert(`❌ שגיאה: ${error.message}`)
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.Email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.Role === roleFilter
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.IsActive !== false) ||
      (statusFilter === 'inactive' && user.IsActive === false)

    return matchesSearch && matchesRole && matchesStatus
  })

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

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען משתמשים...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-purple-600">👥 ניהול משתמשים</h1>
            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
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
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">כל התפקידים</option>
              <option value="admin">👑 מנהל</option>
              <option value="coach">🏋️ מאמן</option>
              <option value="user">🧗 מטפס</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="active">✅ פעיל</option>
              <option value="inactive">❌ לא פעיל</option>
            </select>
          </div>

          <div className="mt-3 flex gap-4 text-sm text-gray-600">
            <span>סה"כ: {users.length} משתמשים</span>
            <span>מוצג: {filteredUsers.length}</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">סטטוס</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">משתמש</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">תפקיד</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map(user => (
                  <tr key={user.UserID} className={`hover:bg-gray-50 ${user.IsActive === false ? 'opacity-50 bg-gray-100' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.IsActive !== false
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        title={user.IsActive !== false ? 'השבת משתמש' : 'הפעל משתמש'}
                      >
                        {user.IsActive !== false ? '✅ פעיל' : '❌ לא פעיל'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{user.Name}</p>
                        <p className="text-sm text-gray-500">{user.Email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getRoleIcon(user.Role)} {getRoleName(user.Role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                          title="ערוך"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setResetPasswordUser(user)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          title="איפוס סיסמה"
                        >
                          🔐
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.Email === currentUser?.Email}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          title="מחק"
                        >
                          🗑️
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
              <p className="text-gray-500">לא נמצאו משתמשים</p>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">➕ הוסף משתמש חדש</h2>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אימייל *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="שם המשתמש"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סיסמה *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="לפחות 6 תווים"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תפקיד</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {loading ? '⏳ מוסיף...' : '✅ הוסף משתמש'}
                </button>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">✏️ עריכת משתמש</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אימייל</label>
                <input
                  type="email"
                  value={editingUser.Email}
                  onChange={(e) => setEditingUser({...editingUser, Email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא</label>
                <input
                  type="text"
                  value={editingUser.Name}
                  onChange={(e) => setEditingUser({...editingUser, Name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תפקיד</label>
                <select
                  value={editingUser.Role}
                  onChange={(e) => setEditingUser({...editingUser, Role: e.target.value as any})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">🧗 מטפס</option>
                  <option value="coach">🏋️ מאמן</option>
                  <option value="admin">👑 מנהל</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  💾 שמור שינויים
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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