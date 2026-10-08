// components/climbing/ClimbingSummary.tsx

import { ClimbingRoute } from '@/types/climbing'
import { LuChartColumn } from 'react-icons/lu'

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
    <div className="mb-4 p-3 rounded-lg border bg-surface border border-line">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-base"><LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />סיכום</h3>
        
        <div className="flex gap-3 text-sm">
          {summary.boulder > 0 && (
            <span className="bg-surface px-2 py-1 rounded ">
              🪨 <span className="font-bold">{summary.boulder}</span>
            </span>
          )}
          {summary.board > 0 && (
            <span className="bg-surface px-2 py-1 rounded ">
              🏋️ <span className="font-bold">{summary.board}</span>
            </span>
          )}
          {summary.lead > 0 && (
            <span className="bg-surface px-2 py-1 rounded ">
              🧗 <span className="font-bold">{summary.lead}</span>
            </span>
          )}
          <span className="text-fg px-2 py-1 rounded font-bold bg-surface border border-line">
            סה״כ {summary.total}
          </span>
        </div>
      </div>
    </div>
  )
}