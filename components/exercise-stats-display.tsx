// components/exercise-stats-display.tsx
// 💪 תצוגת סטטיסטיקות תרגילים
// ✅ Left vs Right comparison
// 📊 Progress bars with trend
// 🔧 RTL FIX: Scale labels now show max on left, 0 on right

'use client'

import { useState } from 'react'
import type { ExercisePerformance, ExerciseStats, HandStats, ImbalanceStats } from '@/lib/exercise-stats-metrics'
import { formatValue } from '@/lib/exercise-stats-metrics'

interface ExerciseStatsDisplayProps {
  performance: ExercisePerformance
}

export function ExerciseStatsDisplay({ performance }: ExerciseStatsDisplayProps) {
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const bodyWeightKG = performance.bodyWeightKG || 70
  const maxScaleKG = bodyWeightKG * 1.5 // BW + 50%
  
  if (performance.exercises.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">💪</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">אין נתוני תרגילים</h3>
        <p className="text-gray-600">לא נמצאו תרגילים שבוצעו בטווח התאריכים הנבחר</p>
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
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">💪 סטטיסטיקות תרגילים</h2>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-90">סנן לפי קטגוריה:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            >
              <option value="all" className="text-gray-900">🔍 הכל ({performance.exercises.length})</option>
              {allCategories.map((category) => (
                <option key={category} value={category} className="text-gray-900">
                  {getCategoryIcon(category)} {category} ({categorizedExercises[category].length})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-sm opacity-90">סה"כ תרגילים</div>
            <div className="text-2xl font-bold">{performance.exercises.length}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-sm opacity-90">קטגוריות</div>
            <div className="text-2xl font-bold">{allCategories.length}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
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
  maxScaleKG
}: { 
  category: string
  exercises: ExerciseStats[]
  bodyWeightKG: number
  maxScaleKG: number
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200">
      {/* Category Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b-2 border-gray-200 rounded-t-lg">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>{getCategoryIcon(category)}</span>
          <span>{category}</span>
          <span className="text-sm font-normal text-gray-600">({exercises.length} תרגילים)</span>
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
          />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Exercise Card
// ═══════════════════════════════════════════════════════════════════

function ExerciseCard({ 
  exercise,
  bodyWeightKG,
  maxScaleKG
}: { 
  exercise: ExerciseStats
  bodyWeightKG: number
  maxScaleKG: number
}) {
  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition">
      {/* Exercise Name */}
      <h4 className="text-lg font-bold text-gray-900 mb-4">{exercise.exerciseName}</h4>

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
// Hand Stats Bar
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
  
  // Dynamic scale based on body weight (BW × 1.5)
  // Only for KG exercises, others use their own max
  const effectiveMaxScale = stats.unit === 'KG' ? maxScaleKG : maxValue
  
  const percentage = effectiveMaxScale > 0 ? (stats.current / effectiveMaxScale) * 100 : 0
  
  // Check if this is a bodyweight exercise
  const isBodyWeight = stats.isBodyWeight === true
  
  const colorClasses = {
    green: isBodyWeight ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-green-500',
    red: isBodyWeight ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-red-500',
    yellow: isBodyWeight ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-yellow-500',
    blue: isBodyWeight ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-blue-500'
  }

  const trendIcon = stats.trend > 5 ? '📈' : stats.trend < -5 ? '📉' : '➡️'
  const trendColor = stats.trend > 5 ? 'text-green-600' : stats.trend < -5 ? 'text-red-600' : 'text-gray-600'

  return (
    <div className="mb-4">
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-900">{label}</span>
        {!isBodyWeight && (
          <span className={`text-sm font-medium ${trendColor}`}>
            {trendIcon} {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
          </span>
        )}
        {isBodyWeight && (
          <span className="text-sm font-medium text-purple-600">
            💪 משקל גוף
          </span>
        )}
      </div>

      {/* Body Weight - No Bar, just stats in box */}
      {isBodyWeight ? (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600 italic">** לא הוזן משקל</p>
            <span className="text-2xl font-bold text-purple-600">{formatValue(stats.current, stats.unit, isBodyWeight)}</span>
          </div>
          {/* Stats for body weight */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Max: <strong>{formatValue(stats.max, stats.unit, isBodyWeight)}</strong></span>
            <span>Avg: <strong>{formatValue(stats.avg, stats.unit, isBodyWeight)}</strong></span>
            <span>Sessions: <strong>{stats.totalSessions}</strong></span>
          </div>
          {/* Last 5 for body weight */}
          {stats.last5.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              📈 Last 5: {stats.last5.map(v => formatValue(v, stats.unit, isBodyWeight)).join(' → ')}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Progress Bar - only for exercises with weight */}
          <div className="w-full mb-6 relative" dir="ltr">
            <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-visible">
              
              {/* Grid lines and labels for KG exercises */}
              {stats.unit === 'KG' && (
                <>
                  {/* Generate grid lines every 5kg - RTL */}
                  {Array.from({ length: Math.floor(maxScaleKG / 5) + 1 }, (_, i) => i * 5).map((kg) => {
                    const position = 100 - (kg / maxScaleKG) * 100  // Flip: 100 - position
                    const isMajor = kg % 10 === 0 // Every 10kg is major
                    
                    if (kg === 0) return null // Skip 0
                    
                    return (
                      <div key={kg}>
                        {/* Grid line */}
                        <div 
                          className={`absolute top-0 bottom-0 ${isMajor ? 'w-0.5 bg-gray-400' : 'w-px bg-gray-300'}`}
                          style={{ left: `${position}%` }}
                        />
                        {/* Label every 10kg */}
                        {isMajor && (
                          <div 
                            className="absolute -top-5 text-xs font-medium text-gray-600 whitespace-nowrap"
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
              
              {/* BW Marker for KG exercises - MUST be visible above bar */}
              {stats.unit === 'KG' && (
                <>
                  {/* White background line for contrast */}
                  <div 
                    className="absolute top-0 bottom-0 w-2 bg-white z-20"
                    style={{ 
                      left: `${100 - (bodyWeightKG / effectiveMaxScale) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                  {/* Black vertical line on top */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-black z-30"
                    style={{ 
                      left: `${100 - (bodyWeightKG / effectiveMaxScale) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                  {/* BW Label - BLACK with strong white outline */}
                  <div 
                    className="absolute -top-6 text-sm font-black text-black whitespace-nowrap bg-white px-2 py-1 rounded-md border-2 border-black z-40"
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
              
              {/* Progress bar - aligned to right (RTL) */}
              <div
                className={`h-8 rounded-full ${colorClasses[color]} transition-all flex items-center justify-end pr-2 relative z-10`}
                style={{ 
                  width: `${Math.min(percentage, 100)}%`,
                  marginLeft: 'auto'  // Align to right
                }}
              >
                <span className="text-white text-sm font-bold">
                  {formatValue(stats.current, stats.unit, isBodyWeight)}
                </span>
              </div>
            </div>
            
            {/* Scale labels - RTL FIXED */}
            {stats.unit === 'KG' && (
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">{maxScaleKG.toFixed(0)} KG</span>
                <span className="text-xs text-gray-500">0</span>
              </div>
            )}
          </div>

          {/* Stats Row - only for exercises with bar */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Max: <strong>{formatValue(stats.max, stats.unit, isBodyWeight)}</strong></span>
            <span>Avg: <strong>{formatValue(stats.avg, stats.unit, isBodyWeight)}</strong></span>
            <span>Sessions: <strong>{stats.totalSessions}</strong></span>
          </div>

          {/* Last 5 Timeline - only for exercises with bar */}
          {stats.last5.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              📈 Last 5: {stats.last5.map(v => formatValue(v, stats.unit, isBodyWeight)).join(' → ')}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Imbalance Warning
// ═══════════════════════════════════════════════════════════════════

function ImbalanceWarning({ imbalance }: { imbalance: ImbalanceStats }) {
  const bgColor = imbalance.status === 'critical' ? 'bg-red-50 border-red-300' :
                  imbalance.status === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-green-50 border-green-300'

  const textColor = imbalance.status === 'critical' ? 'text-red-900' :
                    imbalance.status === 'warning' ? 'text-yellow-900' :
                    'text-green-900'

  return (
    <div className={`mt-4 p-3 rounded-lg border-2 ${bgColor}`}>
      <div className={`font-bold ${textColor} mb-1`}>
        {imbalance.message}
      </div>
      <div className="text-sm text-gray-700 space-y-1">
        <div>📊 Current Gap: <strong>{Math.abs(imbalance.currentGap).toFixed(1)}%</strong></div>
        <div>📈 Average Gap: <strong>{Math.abs(imbalance.avgGap).toFixed(1)}%</strong></div>
        <div>🔝 Max Gap: <strong>{Math.abs(imbalance.maxGap).toFixed(1)}%</strong></div>
      </div>
    </div>
  )
}