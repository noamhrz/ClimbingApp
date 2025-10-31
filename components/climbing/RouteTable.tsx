// components/climbing/RouteTable.tsx

import { ClimbingRoute } from '@/types/climbing'

interface RouteTableProps {
  routes: ClimbingRoute[]
  onUpdate: (id: string, updates: Partial<ClimbingRoute>) => void
  onDelete: (id: string) => void
}

export function RouteTable({ routes, onUpdate, onDelete }: RouteTableProps) {
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
    <div className="overflow-x-auto">
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
              className={`border-b hover:bg-gray-50 transition ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
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
                  onClick={() => onDelete(route.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
                  title="מחק מסלול"
                >
                  ❌
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
