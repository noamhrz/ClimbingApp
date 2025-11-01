// app/exercises/ExercisesClient.tsx
// VERSION WITH DYNAMIC CATEGORIES

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, useActiveUserEmail } from '@/context/AuthContext'
import { Exercise, ExerciseFormData } from '@/types/exercises'
import ExerciseCard from '@/components/exercises/ExerciseCard'
import ExerciseModal from '@/components/exercises/ExerciseModal'

export default function ExercisesClient() {
  const router = useRouter()
  const { activeUser, loading: authLoading } = useAuth()
  const activeEmail = useActiveUserEmail()
  
  const [userRole, setUserRole] = useState<'admin' | 'coach' | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [categories, setCategories] = useState<string[]>([]) // ✨ NEW: Dynamic categories
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('Active')
  const [showModal, setShowModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  // Check auth and role
  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && !activeUser) {
        router.push('/dashboard')
        return
      }

      if (!activeEmail) return

      // Get user role
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
  }, [authLoading, activeUser, activeEmail, router])

  // Load exercises and categories when role is set
  useEffect(() => {
    if (userRole) {
      loadExercises()
      loadCategories() // ✨ NEW
    }
  }, [userRole])

  const isAdmin = userRole === 'admin'

  // ✨ NEW: Load unique categories from DB
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('Exercises')
        .select('Category')
        .eq('Status', 'Active')

      if (error) throw error

      // Get unique categories and sort
      const uniqueCategories = [...new Set(data?.map(ex => ex.Category) || [])]
        .filter(Boolean) // Remove null/undefined
        .sort()

      setCategories(uniqueCategories)
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  const loadExercises = async () => {
    if (!activeEmail || !userRole) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('Exercises')
        .select('*')
        .order('Name')

      // Filter by status
      if (filterStatus !== 'all') {
        query = query.eq('Status', filterStatus)
      }

      // Coach sees only their own exercises + system exercises
      if (!isAdmin) {
        query = query.or(`CreatedBy.eq.${activeEmail},CreatedBy.eq.admin@example.com`)
      }

      const { data, error } = await query

      if (error) throw error
      setExercises(data || [])
    } catch (err) {
      console.error('Error loading exercises:', err)
      alert('שגיאה בטעינת תרגילים')
    } finally {
      setLoading(false)
    }
  }

  // Filter exercises by search and category
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ex.Description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || ex.Category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Handle create new exercise
  const handleCreate = async (formData: ExerciseFormData) => {
    if (!activeEmail) return
    
    try {
      const { error } = await supabase
        .from('Exercises')
        .insert({
          ...formData,
          Status: 'Active',
          CreatedBy: activeEmail,
          CreatedAt: new Date().toISOString(),
        })

      if (error) throw error

      await loadExercises()
      await loadCategories() // ✨ Refresh categories
      setShowModal(false)
      alert('✅ התרגיל נוצר בהצלחה!')
    } catch (err) {
      console.error('Error creating exercise:', err)
      alert('❌ שגיאה ביצירת תרגיל')
    }
  }

  // Handle update existing exercise
  const handleUpdate = async (id: number, formData: ExerciseFormData) => {
    try {
      const { error } = await supabase
        .from('Exercises')
        .update({
          ...formData,
        })
        .eq('ExerciseID', id)

      if (error) throw error

      await loadExercises()
      await loadCategories() // ✨ Refresh categories
      setShowModal(false)
      setEditingExercise(null)
      alert('✅ התרגיל עודכן בהצלחה!')
    } catch (err) {
      console.error('Error updating exercise:', err)
      alert('❌ שגיאה בעדכון תרגיל')
    }
  }

  // Handle soft delete (set Status to Inactive)
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`האם למחוק את התרגיל "${name}"?`)) return

    try {
      const { error } = await supabase
        .from('Exercises')
        .update({ 
          Status: 'Inactive',
        })
        .eq('ExerciseID', id)

      if (error) throw error
      await loadExercises()
      alert('✅ התרגיל נמחק בהצלחה')
    } catch (err) {
      console.error('Error deleting exercise:', err)
      alert('❌ שגיאה במחיקת תרגיל')
    }
  }

  // Check if user can edit this exercise
  const canEdit = (exercise: Exercise) => {
    return isAdmin || exercise.CreatedBy === activeEmail
  }

  // Loading states
  if (authLoading || !userRole) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">בודק הרשאות...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">טוען תרגילים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🏋️ ניהול תרגילים
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'ניהול כל התרגילים במערכת' : 'ניהול התרגילים שלך'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExercise(null)
            setShowModal(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
        >
          <span className="text-xl">➕</span>
          <span>תרגיל חדש</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 חיפוש
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש לפי שם או תיאור..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category filter - ✨ DYNAMIC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📂 קטגוריה
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">הכל ({exercises.length})</option>
              {categories.map((cat) => {
                const count = exercises.filter(ex => ex.Category === cat).length
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                )
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {categories.length} קטגוריות זמינות
            </p>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 סטטוס
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                loadExercises()
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Active">פעילים</option>
              <option value="Inactive">לא פעילים</option>
              <option value="all">הכל</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4 text-sm text-gray-600">
          <span>סה"כ: {filteredExercises.length} תרגילים</span>
          <span>•</span>
          <span>פעילים: {filteredExercises.filter(e => e.Status === 'Active').length}</span>
          {isAdmin && (
            <>
              <span>•</span>
              <span>לא פעילים: {filteredExercises.filter(e => e.Status === 'Inactive').length}</span>
            </>
          )}
        </div>
      </div>

      {/* Exercise Grid */}
      {filteredExercises.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg mb-2">😕 לא נמצאו תרגילים</p>
          <p className="text-gray-500 text-sm">נסה לשנות את החיפוש או הסינון</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.ExerciseID}
              exercise={exercise}
              canEdit={canEdit(exercise)}
              onEdit={() => {
                setEditingExercise(exercise)
                setShowModal(true)
              }}
              onDelete={() => handleDelete(exercise.ExerciseID, exercise.Name)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ExerciseModal
          exercise={editingExercise}
          onSave={(formData) => {
            if (editingExercise) {
              handleUpdate(editingExercise.ExerciseID, formData)
            } else {
              handleCreate(formData)
            }
          }}
          onClose={() => {
            setShowModal(false)
            setEditingExercise(null)
          }}
        />
      )}
    </div>
  )
}