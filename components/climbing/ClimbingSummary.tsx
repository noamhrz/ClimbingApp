// components/climbing/ClimbingSummary.tsx

import { ClimbingRoute } from '@/types/climbing'

interface ClimbingSummaryProps {
  routes: ClimbingRoute[]
}

export function ClimbingSummary({ routes }: ClimbingSummaryProps) {
  const summary = {
    boulder: routes.filter(r => r.climbType === 'Boulder').length,
    board: routes.filter(r => r.climbType === 'Board').length,
    lead: routes.filter(r => r.climbType === 'Lead').length,
    total: routes.length
  }
  
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
      <h3 className="font-bold mb-3 text-lg">📊 סיכום</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded shadow-sm">
          <div className="text-2xl mb-1">🪨</div>
          <div className="text-sm text-gray-600">Boulder</div>
          <div className="text-xl font-bold">{summary.boulder}</div>
        </div>
        
        <div className="bg-white p-3 rounded shadow-sm">
          <div className="text-2xl mb-1">🏋️</div>
          <div className="text-sm text-gray-600">Board</div>
          <div className="text-xl font-bold">{summary.board}</div>
        </div>
        
        <div className="bg-white p-3 rounded shadow-sm">
          <div className="text-2xl mb-1">🧗</div>
          <div className="text-sm text-gray-600">Lead</div>
          <div className="text-xl font-bold">{summary.lead}</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-green-500 text-white p-3 rounded shadow-sm">
          <div className="text-sm">סה״כ</div>
          <div className="text-2xl font-bold">{summary.total}</div>
        </div>
      </div>
    </div>
  )
}
