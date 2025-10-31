// components/climbing/RouteTable.tsx

import { ClimbingRoute } from '@/types/climbing'
import { useState } from 'react'

interface RouteTableProps {
  routes: ClimbingRoute[]
  onUpdate: (id: string, updates: Partial<ClimbingRoute>) => void
  onDelete: (id: string) => void
}

export function RouteTable({ routes, onUpdate, onDelete }: RouteTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    routeName: string
    gradeDisplay: string
  } | null>(null)

  const handleDeleteClick = (id: string, routeName: string, gradeDisplay: string) => {
    setConfirmDelete({ id, routeName, gradeDisplay })
  }

  const handleConfirmDelete = () => {
    if (!confirmDelete) return
    
    // Show deleting animation
    setDeletingId(confirmDelete.id)
    
    // Delete after animation
    setTimeout(() => {
      onDelete(confirmDelete.id)
      setDeletingId(null)
      setConfirmDelete(null)
    }, 300)
  }

  const handleCancelDelete = () => {
    setConfirmDelete(null)
  }

  if (routes.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-gray-500">
        <div className="text-4xl mb-2">🧗</div>
        <p>אין מסלולים עדיין</p>
        <p className="text-sm mt-1">השתמש בהוספה מהירה למעלה</p>
      </div>
    )
  }
  
  return (
    <>
      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2">
            <tr>
              <th className="px-3 py-3 text-right text-sm font-semibold">דירוג</th>
              <th className="px-3 py-3 text-right text-sm font-semibold">שם מסלול</th>
              <th className="px-3 py-3 text-center text-sm font-semibold">ניסיונות</th>
              <th className="px-3 py-3 text-center text-sm font-semibold">הצליח</th>
              <th className="px-3 py-3 text-right text-sm font-semibold">הערות</th>
              <th className="px-3 py-3 text-center text-sm font-semibold">מחק</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route, index) => (
              <tr 
                key={route.id} 
                className={`border-b hover:bg-gray-50 transition-all duration-300 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } ${
                  deletingId === route.id ? 'opacity-0 scale-95 bg-red-50' : 'opacity-100 scale-100'
                }`}
              >
                <td className="px-3 py-3">
                  <div className="font-mono text-sm font-semibold">
                    {route.gradeDisplay}
                  </div>
                </td>
                
                <td className="px-3 py-3">
                  <input
                    type="text"
                    value={route.routeName}
                    onChange={(e) => onUpdate(route.id, { routeName: e.target.value })}
                    placeholder="שם (אופציונלי)"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </td>
                
                <td className="px-3 py-3">
                  <input
                    type="number"
                    value={route.attempts}
                    onChange={(e) => onUpdate(route.id, { attempts: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="99"
                    className="w-16 px-2 py-2 border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </td>
                
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={route.successful}
                    onChange={(e) => onUpdate(route.id, { successful: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                
                <td className="px-3 py-3">
                  <input
                    type="text"
                    value={route.notes}
                    onChange={(e) => onUpdate(route.id, { notes: e.target.value })}
                    placeholder="הערות"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </td>
                
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => handleDeleteClick(route.id, route.routeName, route.gradeDisplay)}
                    disabled={deletingId === route.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition disabled:opacity-50"
                    title="מחק מסלול"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - shown only on mobile */}
      <div className="md:hidden space-y-3">
        {routes.map((route, index) => (
          <div 
            key={route.id} 
            className={`bg-white border rounded-lg p-4 shadow-sm transition-all duration-300 ${
              deletingId === route.id ? 'opacity-0 scale-95 bg-red-50' : 'opacity-100 scale-100'
            }`}
          >
            {/* Header with grade and delete */}
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-lg font-bold text-blue-600">
                {route.gradeDisplay}
              </div>
              <button
                onClick={() => handleDeleteClick(route.id, route.routeName, route.gradeDisplay)}
                disabled={deletingId === route.id}
                className="text-red-500 hover:text-red-700 p-2 disabled:opacity-50"
                title="מחק מסלול"
              >
                🗑️
              </button>
            </div>

            {/* Route Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם המסלול
              </label>
              <input
                type="text"
                value={route.routeName}
                onChange={(e) => onUpdate(route.id, { routeName: e.target.value })}
                placeholder="שם (אופציונלי)"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Attempts and Success */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ניסיונות
                </label>
                <input
                  type="number"
                  value={route.attempts}
                  onChange={(e) => onUpdate(route.id, { attempts: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="99"
                  className="w-full px-3 py-2 border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הצליח?
                </label>
                <label className="flex items-center justify-center h-10 border rounded bg-gray-50">
                  <input
                    type="checkbox"
                    checked={route.successful}
                    onChange={(e) => onUpdate(route.id, { successful: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="mr-2 text-sm">
                    {route.successful ? 'כן ✓' : 'לא'}
                  </span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הערות
              </label>
              <textarea
                value={route.notes}
                onChange={(e) => onUpdate(route.id, { notes: e.target.value })}
                placeholder="הערות (אופציונלי)"
                rows={2}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🗑️</div>
              <h3 className="text-xl font-bold text-gray-900">מחיקת מסלול</h3>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-700 mb-2">בטוח שברצונך למחוק את המסלול:</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="font-mono font-bold text-red-700 text-lg">
                  {confirmDelete.gradeDisplay}
                </div>
                {confirmDelete.routeName && (
                  <div className="text-red-600 mt-1">
                    {confirmDelete.routeName}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                ⚠️ פעולה זו לא ניתנת לביטול
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                🗑️ מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}