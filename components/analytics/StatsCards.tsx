// components/analytics/StatsCards.tsx
// Statistics cards showing Right vs Left hand comparison

'use client'

import { StatsData } from '@/types/analytics'

interface StatsCardsProps {
  rightStats: StatsData | null
  leftStats: StatsData | null
  isSingleHand: boolean
  bothHandsStats?: StatsData | null
}

export default function StatsCards({ 
  rightStats, 
  leftStats, 
  isSingleHand,
  bothHandsStats 
}: StatsCardsProps) {
  
  if (!isSingleHand && bothHandsStats) {
    // Both hands exercise - single card
    return (
      <div className="mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4">📊 סטטיסטיקות כלליות</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Weight Stats */}
            {bothHandsStats.avgWeight > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-blue-100 text-sm">משקל ממוצע</div>
                <div className="text-2xl font-bold">{bothHandsStats.avgWeight.toFixed(1)} ק״ג</div>
                <div className="text-xs text-blue-200 mt-1">
                  Max: {bothHandsStats.maxWeight} | Min: {bothHandsStats.minWeight}
                </div>
              </div>
            )}
            
            {/* Reps Stats */}
            {bothHandsStats.avgReps > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-blue-100 text-sm">חזרות ממוצעות</div>
                <div className="text-2xl font-bold">{bothHandsStats.avgReps.toFixed(1)}</div>
                <div className="text-xs text-blue-200 mt-1">
                  Max: {bothHandsStats.maxReps} | Min: {bothHandsStats.minReps}
                </div>
              </div>
            )}
            
            {/* RPE Stats */}
            {bothHandsStats.avgRPE > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-blue-100 text-sm">RPE ממוצע</div>
                <div className="text-2xl font-bold">{bothHandsStats.avgRPE.toFixed(1)}</div>
                <div className="text-xs text-blue-200 mt-1">
                  Max: {bothHandsStats.maxRPE}
                </div>
              </div>
            )}
            
            {/* Sessions Count */}
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
              <div className="text-blue-100 text-sm">סשנים</div>
              <div className="text-2xl font-bold">{bothHandsStats.sessionsCount}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Single hand exercise - two cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      
      {/* Right Hand Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">🫱 יד ימין</h3>
          {rightStats && (
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {rightStats.sessionsCount} סשנים
            </span>
          )}
        </div>
        
        {rightStats ? (
          <div className="space-y-3">
            {rightStats.avgWeight > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-blue-100 text-sm">משקל ממוצע</div>
                <div className="text-2xl font-bold">{rightStats.avgWeight.toFixed(1)} ק״ג</div>
                <div className="text-xs text-blue-200 mt-1">
                  Max: {rightStats.maxWeight} | Min: {rightStats.minWeight}
                </div>
              </div>
            )}
            
            {rightStats.avgReps > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-blue-100 text-sm">חזרות ממוצעות</div>
                <div className="text-2xl font-bold">{rightStats.avgReps.toFixed(1)}</div>
                <div className="text-xs text-blue-200 mt-1">
                  Max: {rightStats.maxReps} | Min: {rightStats.minReps}
                </div>
              </div>
            )}
            
            {rightStats.avgRPE > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-blue-100 text-sm">RPE ממוצע</div>
                <div className="text-2xl font-bold">{rightStats.avgRPE.toFixed(1)}</div>
                <div className="text-xs text-blue-200 mt-1">
                  Max: {rightStats.maxRPE}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-blue-100">
            אין נתונים זמינים
          </div>
        )}
      </div>

      {/* Left Hand Card */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">🫲 יד שמאל</h3>
          {leftStats && (
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {leftStats.sessionsCount} סשנים
            </span>
          )}
        </div>
        
        {leftStats ? (
          <div className="space-y-3">
            {leftStats.avgWeight > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-green-100 text-sm">משקל ממוצע</div>
                <div className="text-2xl font-bold">{leftStats.avgWeight.toFixed(1)} ק״ג</div>
                <div className="text-xs text-green-200 mt-1">
                  Max: {leftStats.maxWeight} | Min: {leftStats.minWeight}
                </div>
              </div>
            )}
            
            {leftStats.avgReps > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-green-100 text-sm">חזרות ממוצעות</div>
                <div className="text-2xl font-bold">{leftStats.avgReps.toFixed(1)}</div>
                <div className="text-xs text-green-200 mt-1">
                  Max: {leftStats.maxReps} | Min: {leftStats.minReps}
                </div>
              </div>
            )}
            
            {leftStats.avgRPE > 0 && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="text-green-100 text-sm">RPE ממוצע</div>
                <div className="text-2xl font-bold">{leftStats.avgRPE.toFixed(1)}</div>
                <div className="text-xs text-green-200 mt-1">
                  Max: {leftStats.maxRPE}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-green-100">
            אין נתונים זמינים
          </div>
        )}
      </div>
      
    </div>
  )
}