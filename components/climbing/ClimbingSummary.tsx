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
  
  if (summary.total === 0) return null
  
  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-base">📊 סיכום</h3>
        
        <div className="flex gap-3 text-sm">
          {summary.boulder > 0 && (
            <span className="bg-white px-2 py-1 rounded shadow-sm">
              🪨 <span className="font-bold">{summary.boulder}</span>
            </span>
          )}
          {summary.board > 0 && (
            <span className="bg-white px-2 py-1 rounded shadow-sm">
              🏋️ <span className="font-bold">{summary.board}</span>
            </span>
          )}
          {summary.lead > 0 && (
            <span className="bg-white px-2 py-1 rounded shadow-sm">
              🧗 <span className="font-bold">{summary.lead}</span>
            </span>
          )}
          <span className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-2 py-1 rounded shadow-sm font-bold">
            סה״כ {summary.total}
          </span>
        </div>
      </div>
    </div>
  )
}