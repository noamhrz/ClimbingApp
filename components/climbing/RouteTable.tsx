// components/climbing/RouteTable.tsx

import { ClimbingRoute } from '@/types/climbing'
import { useState } from 'react'
import { LuMountain, LuTrash2, LuTriangleAlert } from 'react-icons/lu'

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
      <div className="px-4 py-12 text-center text-muted">
        <div className="text-4xl mb-2"><LuMountain aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
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
          <thead className="bg-surface border-b-2">
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
                className={`border-b hover:bg-surface/90 transition-all duration-300 ${
 index % 2 === 0 ? 'bg-surface' : 'bg-surface'
 } ${
 deletingId === route.id ? 'opacity-0 scale-95 bg-danger/15' : 'opacity-100 scale-100'
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
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-accent focus:border-accent text-sm"
                  />
                </td>
                
                <td className="px-3 py-3">
                  <input
                    type="number"
                    value={route.attempts}
                    onChange={(e) => onUpdate(route.id, { attempts: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="99"
                    onFocus={(e) => e.target.select()}
                    className="w-16 px-2 py-2 border rounded text-center focus:ring-2 focus:ring-accent focus:border-accent text-sm"
                  />
                </td>
                
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={route.successful}
                    onChange={(e) => onUpdate(route.id, { successful: e.target.checked })}
                    className="w-5 h-5 rounded border-line text-accent focus:ring-accent"
                  />
                </td>
                
                <td className="px-3 py-3">
                  <input
                    type="text"
                    value={route.notes}
                    onChange={(e) => onUpdate(route.id, { notes: e.target.value })}
                    placeholder="הערות"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-accent focus:border-accent text-sm"
                  />
                </td>
                
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => handleDeleteClick(route.id, route.routeName, route.gradeDisplay)}
                    disabled={deletingId === route.id}
                    className="text-danger hover:text-danger/90 hover:bg-danger/15 p-2 rounded transition disabled:opacity-50"
                    title="מחק מסלול"
                  >
                    <LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
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
            className={`bg-surface border rounded-lg p-4 transition-all duration-300 ${
 deletingId === route.id ? 'opacity-0 scale-95 bg-danger/15' : 'opacity-100 scale-100'
 }`}
          >
            {/* Header with grade and delete */}
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-lg font-bold text-accent">
                {route.gradeDisplay}
              </div>
              <button
                onClick={() => handleDeleteClick(route.id, route.routeName, route.gradeDisplay)}
                disabled={deletingId === route.id}
                className="text-danger hover:text-danger/90 p-2 disabled:opacity-50"
                title="מחק מסלול"
              >
                <LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
              </button>
            </div>

            {/* Route Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-fg-2 mb-1">
                שם המסלול
              </label>
              <input
                type="text"
                value={route.routeName}
                onChange={(e) => onUpdate(route.id, { routeName: e.target.value })}
                placeholder="שם (אופציונלי)"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-accent focus:border-accent text-sm"
              />
            </div>

            {/* Attempts and Success */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  ניסיונות
                </label>
                <input
                  type="number"
                  value={route.attempts}
                  onChange={(e) => onUpdate(route.id, { attempts: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="99"
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border rounded text-center focus:ring-2 focus:ring-accent focus:border-accent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  הצליח?
                </label>
                <label className="flex items-center justify-center h-10 border rounded bg-surface">
                  <input
                    type="checkbox"
                    checked={route.successful}
                    onChange={(e) => onUpdate(route.id, { successful: e.target.checked })}
                    className="w-5 h-5 rounded border-line text-accent focus:ring-accent"
                  />
                  <span className="mr-2 text-sm">
                    {route.successful ? 'כן ✓' : 'לא'}
                  </span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-fg-2 mb-1">
                הערות
              </label>
              <textarea
                value={route.notes}
                onChange={(e) => onUpdate(route.id, { notes: e.target.value })}
                placeholder="הערות (אופציונלי)"
                rows={2}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-accent focus:border-accent text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-raised border border-line-strong rounded-lg max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl"><LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
              <h3 className="text-xl font-bold text-fg">מחיקת מסלול</h3>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-fg-2 mb-2">בטוח שברצונך למחוק את המסלול:</p>
              <div className="bg-danger/15 border border-danger rounded-lg p-3">
                <div className="font-mono font-bold text-danger text-lg">
                  {confirmDelete.gradeDisplay}
                </div>
                {confirmDelete.routeName && (
                  <div className="text-danger mt-1">
                    {confirmDelete.routeName}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted mt-2">
                <LuTriangleAlert aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />פעולה זו לא ניתנת לביטול
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-raised hover:bg-raised/90 text-fg rounded-lg font-medium transition"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-danger hover:bg-danger/90 text-on-accent rounded-lg font-medium transition"
              >
                <LuTrash2 aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}