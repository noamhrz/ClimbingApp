// components/exercise-stats-display.tsx
// 💪 תצוגת סטטיסטיקות תרגילים
// ✅ Left vs Right comparison
// 📊 Progress bars with trend
// 🔧 RTL FIX: Scale labels now show max on left, 0 on right
// 🔗 NEW: Clickable exercise titles linking to detailed analytics
// 🔄 Uses UserContext for impersonation support

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUserContext } from '@/context/UserContext'
import type { ExercisePerformance, ExerciseStats, HandStats, ImbalanceStats } from '@/lib/exercise-stats-metrics'
import { formatValue } from '@/lib/exercise-stats-metrics'
import { LuBicepsFlexed, LuChartColumn, LuTrendingUp } from 'react-icons/lu'

interface ExerciseStatsDisplayProps {
  performance: ExercisePerformance
  selectedEmail?: string
}

export function ExerciseStatsDisplay({ performance, selectedEmail }: ExerciseStatsDisplayProps) {
  const { selectedUser } = useUserContext()
  const userEmail = selectedEmail || selectedUser?.userEmail || selectedUser?.Email
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const bodyWeightKG = performance.bodyWeightKG || 70
  const maxScaleKG = bodyWeightKG * 1.5 // BW + 50%
  
  if (performance.exercises.length === 0) {
    return (
      <div className="bg-accent/15 border border-accent rounded-lg p-8 text-center">
        <div className="text-4xl mb-3"><LuBicepsFlexed aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
        <h3 className="text-xl font-bold text-fg mb-2">אין נתוני תרגילים</h3>
        <p className="text-fg-3">לא נמצאו תרגילים שבוצעו בטווח התאריכים הנבחר</p>
      </div>
    )
  }

  // Group by category
  const categorizedExercises = groupByCategory(performance.exercises)
  const allCategories = Object.keys(categorizedExercises).sort()

  // Filter
  const filteredExercises = selectedCategory === 'all' 
    ? categorizedExercises 
    : { [selectedCategory]: categorizedExercises[selectedCategory] }

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="rounded-lg p-6 text-fg bg-surface border border-line">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold"><LuBicepsFlexed aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />סטטיסטיקות תרגילים</h2>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-90">סנן לפי קטגוריה:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg min-h-11 bg-bg border border-line-strong text-fg font-medium focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="all" className="text-fg">🔍 הכל ({performance.exercises.length})</option>
              {allCategories.map((category) => (
                <option key={category} value={category} className="text-fg">
                  {getCategoryIcon(category)} {category} ({categorizedExercises[category].length})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-raised border border-line rounded-lg p-3">
            <div className="text-sm opacity-90">סה"כ תרגילים</div>
            <div className="text-2xl font-bold">{performance.exercises.length}</div>
          </div>
          <div className="bg-raised border border-line rounded-lg p-3">
            <div className="text-sm opacity-90">קטגוריות</div>
            <div className="text-2xl font-bold">{allCategories.length}</div>
          </div>
          <div className="bg-raised border border-line rounded-lg p-3">
            <div className="text-sm opacity-90">מוצגים</div>
            <div className="text-2xl font-bold">
              {selectedCategory === 'all' ? performance.exercises.length : categorizedExercises[selectedCategory]?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Category Sections */}
      {Object.entries(filteredExercises).map(([category, exercises]) => (
        <CategorySection 
          key={category} 
          category={category} 
          exercises={exercises}
          bodyWeightKG={bodyWeightKG}
          maxScaleKG={maxScaleKG}
          userEmail={userEmail}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Group by Category
// ═══════════════════════════════════════════════════════════════════

function groupByCategory(exercises: ExerciseStats[]): Record<string, ExerciseStats[]> {
  const grouped: Record<string, ExerciseStats[]> = {}
  
  for (const exercise of exercises) {
    const category = exercise.category || 'אחר'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(exercise)
  }

  return grouped
}

// ═══════════════════════════════════════════════════════════════════
// Category Icon
// ═══════════════════════════════════════════════════════════════════

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Grip / Hangboard': '🪵',
    'Pull': '💪',
    'Push': '🔥',
    'Shoulder': '🏋️',
    'Legs': '🦵',
    'Core Stability': '🎯',
    'Wrist': '🤲',
    'Finger': '👆',
    'Elbow': '💪',
    'Hip hinge': '🏋️',
    'Squat': '🦵',
  }
  return icons[category] || '📋'
}

// ═══════════════════════════════════════════════════════════════════
// Category Section
// ═══════════════════════════════════════════════════════════════════

function CategorySection({ 
  category, 
  exercises,
  bodyWeightKG,
  maxScaleKG,
  userEmail
}: { 
  category: string
  exercises: ExerciseStats[]
  bodyWeightKG: number
  maxScaleKG: number
  userEmail?: string
}) {
  return (
    <div className="bg-surface rounded-lg border-2 border-line">
      {/* Category Header */}
      <div className="p-4 border-b-2 border-line rounded-t-lg bg-surface">
        <h3 className="text-xl font-bold text-fg flex items-center gap-2">
          <span>{getCategoryIcon(category)}</span>
          <span>{category}</span>
          <span className="text-sm font-normal text-fg-3">({exercises.length} תרגילים)</span>
        </h3>
      </div>

      {/* Exercises */}
      <div className="p-6 space-y-6">
        {exercises.map((exercise) => (
          <ExerciseCard 
            key={exercise.exerciseId} 
            exercise={exercise}
            bodyWeightKG={bodyWeightKG}
            maxScaleKG={maxScaleKG}
            userEmail={userEmail}
          />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Exercise Card
// ═══════════════════════════════════════════════════════════════════

export function ExerciseCard({
  exercise,
  bodyWeightKG,
  maxScaleKG,
  userEmail
}: { 
  exercise: ExerciseStats
  bodyWeightKG: number
  maxScaleKG: number
  userEmail?: string
}) {
  // Build analytics URL
  const buildAnalyticsUrl = () => {
    const params = new URLSearchParams({
      exerciseId: exercise.exerciseId.toString(),
    })
    
    if (userEmail) {
      params.append('email', userEmail)
    }
    
    return `/exercise-analytics?${params.toString()}`
  }

  return (
    <div className="border-2 border-line rounded-lg p-4 hover:border-info/30 transition">
      {/* Exercise Name - Clickable */}
      <div className="mb-4 flex items-center justify-between">
        <Link 
          href={buildAnalyticsUrl()}
          className="text-lg font-bold text-accent hover:text-accent/90 hover:underline transition-colors flex items-center gap-2 group"
        >
          <span>{exercise.exerciseName}</span>
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" />
          </span>
        </Link>
      </div>

      {/* Right Hand */}
      {exercise.rightHand && (
        <HandStatsBar 
          label="Right Hand 🟢" 
          stats={exercise.rightHand} 
          color="green"
          maxValue={exercise.rightHand.max}
          bodyWeightKG={bodyWeightKG}
          maxScaleKG={maxScaleKG}
        />
      )}

      {/* Left Hand */}
      {exercise.leftHand && (
        <HandStatsBar 
          label="Left Hand 🔴" 
          stats={exercise.leftHand} 
          color={exercise.imbalance?.status === 'critical' ? 'red' : 
                 exercise.imbalance?.status === 'warning' ? 'yellow' : 'green'}
          maxValue={exercise.rightHand?.max || exercise.leftHand.max}
          bodyWeightKG={bodyWeightKG}
          maxScaleKG={maxScaleKG}
        />
      )}

      {/* Both Hands */}
      {exercise.bothHands && (
        <HandStatsBar 
          label="Both Hands 🙌" 
          stats={exercise.bothHands} 
          color="blue"
          maxValue={exercise.bothHands.max}
          bodyWeightKG={bodyWeightKG}
          maxScaleKG={maxScaleKG}
        />
      )}

      {/* Imbalance Warning */}
      {exercise.imbalance && (
        <ImbalanceWarning imbalance={exercise.imbalance} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Hand Stats Bar (unchanged)
// ═══════════════════════════════════════════════════════════════════

function HandStatsBar({ 
  label, 
  stats, 
  color,
  maxValue,
  bodyWeightKG,
  maxScaleKG
}: { 
  label: string
  stats: HandStats
  color: 'green' | 'red' | 'yellow' | 'blue'
  maxValue: number
  bodyWeightKG: number
  maxScaleKG: number
}) {
  
  const effectiveMaxScale = stats.unit === 'KG' ? maxScaleKG : maxValue
  const percentage = effectiveMaxScale > 0 ? (stats.current / effectiveMaxScale) * 100 : 0
  const isBodyWeight = stats.isBodyWeight === true
  
  const colorClasses = {
    green: isBodyWeight ? 'bg-info ' : 'bg-success',
    red: isBodyWeight ? 'bg-info ' : 'bg-danger',
    yellow: isBodyWeight ? 'bg-info ' : 'bg-warning',
    blue: isBodyWeight ? 'bg-info ' : 'bg-accent'
  }

  const trendIcon = stats.trend > 5 ? '📈' : stats.trend < -5 ? '📉' : '➡️'
  const trendColor = stats.trend > 5 ? 'text-success' : stats.trend < -5 ? 'text-danger' : 'text-fg-3'

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-fg">{label}</span>
        {!isBodyWeight && (
          <span className={`text-sm font-medium ${trendColor}`}>
            {trendIcon} {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
          </span>
        )}
        {isBodyWeight && (
          <span className="text-sm font-medium text-info">
            <LuBicepsFlexed aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />משקל גוף
          </span>
        )}
      </div>

      {isBodyWeight ? (
        <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-fg-3 italic">** לא הוזן משקל</p>
            <span className="text-2xl font-bold text-info">{formatValue(stats.current, stats.unit, isBodyWeight)}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-fg-3">
            <span>Max: <strong>{formatValue(stats.max, stats.unit, isBodyWeight)}</strong></span>
            <span>Avg: <strong>{formatValue(stats.avg, stats.unit, isBodyWeight)}</strong></span>
            <span>Sessions: <strong>{stats.totalSessions}</strong></span>
          </div>
          {stats.last5.length > 0 && (
            <div className="mt-2 text-xs text-muted">
              📈 Last 5: {stats.last5.map(v => formatValue(v, stats.unit, isBodyWeight)).join(' → ')}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="w-full mb-6 relative" dir="ltr">
            <div className="w-full bg-raised rounded-full h-8 relative overflow-visible">
              
              {stats.unit === 'KG' && (
                <>
                  {Array.from({ length: Math.floor(maxScaleKG / 5) + 1 }, (_, i) => i * 5).map((kg) => {
                    const position = 100 - (kg / maxScaleKG) * 100
                    const isMajor = kg % 10 === 0
                    
                    if (kg === 0) return null
                    
                    return (
                      <div key={kg}>
                        <div 
                          className={`absolute top-0 bottom-0 ${isMajor ? 'w-0.5 bg-raised' : 'w-px bg-line-strong'}`}
                          style={{ left: `${position}%` }}
                        />
                        {isMajor && (
                          <div 
                            className="absolute -top-5 text-xs font-medium text-fg-3 whitespace-nowrap"
                            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                          >
                            {kg}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
              
              {stats.unit === 'KG' && (
                <>
                  <div 
                    className="absolute top-0 bottom-0 w-2 bg-surface z-20"
                    style={{ 
                      left: `${100 - (bodyWeightKG / effectiveMaxScale) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-black z-30"
                    style={{ 
                      left: `${100 - (bodyWeightKG / effectiveMaxScale) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                  <div 
                    className="absolute -top-6 text-sm font-black text-fg whitespace-nowrap bg-surface px-2 py-1 rounded-md border-2 border-line-strong z-40"
                    style={{ 
                      left: `${100 - (bodyWeightKG / effectiveMaxScale) * 100}%`, 
                      transform: 'translateX(-50%)',
                      boxShadow: '0 0 0 3px white, 0 3px 6px rgba(0,0,0,0.4)'
                    }}
                  >
                    BW
                  </div>
                </>
              )}
              
              <div
                className={`h-8 rounded-full ${colorClasses[color]} transition-all flex items-center justify-end pr-2 relative z-10`}
                style={{ 
                  width: `${Math.min(percentage, 100)}%`,
                  marginLeft: 'auto'
                }}
              >
                <span className="text-on-accent text-sm font-bold">
                  {formatValue(stats.current, stats.unit, isBodyWeight)}
                </span>
              </div>
            </div>
            
            {stats.unit === 'KG' && (
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted">{maxScaleKG.toFixed(0)} KG</span>
                <span className="text-xs text-muted">0</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-fg-3">
            <span>Max: <strong>{formatValue(stats.max, stats.unit, isBodyWeight)}</strong></span>
            <span>Avg: <strong>{formatValue(stats.avg, stats.unit, isBodyWeight)}</strong></span>
            <span>Sessions: <strong>{stats.totalSessions}</strong></span>
          </div>

          {stats.last5.length > 0 && (
            <div className="mt-2 text-xs text-muted">
              📈 Last 5: {stats.last5.map(v => formatValue(v, stats.unit, isBodyWeight)).join(' → ')}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Imbalance Warning (unchanged)
// ═══════════════════════════════════════════════════════════════════

function ImbalanceWarning({ imbalance }: { imbalance: ImbalanceStats }) {
  const bgColor = imbalance.status === 'critical' ? 'bg-danger/10 border-danger/30' :
                  imbalance.status === 'warning' ? 'bg-warning/10 border-warning/30' :
                  'bg-success/10 border-success/30'

  const textColor = imbalance.status === 'critical' ? 'text-danger' :
                    imbalance.status === 'warning' ? 'text-warning' :
                    'text-success'

  return (
    <div className={`mt-4 p-3 rounded-lg border-2 ${bgColor}`}>
      <div className={`font-bold ${textColor} mb-1`}>
        {imbalance.message}
      </div>
      <div className="text-sm text-fg-2 space-y-1">
        <div><LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />Current Gap: <strong>{Math.abs(imbalance.currentGap).toFixed(1)}%</strong></div>
        <div><LuTrendingUp aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />Average Gap: <strong>{Math.abs(imbalance.avgGap).toFixed(1)}%</strong></div>
        <div>🔝 Max Gap: <strong>{Math.abs(imbalance.maxGap).toFixed(1)}%</strong></div>
      </div>
    </div>
  )
}