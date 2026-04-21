// components/climbing-stats-display.tsx
// 🧗 תצוגת סטטיסטיקות טיפוס - Boulder+Board מאוחדים

'use client'

import { useState } from 'react'
import type { ClimbingPerformance, ClimbTypeStats, GradeStats } from '@/lib/climbing-stats-metrics'

interface ClimbingStatsDisplayProps {
  performance: ClimbingPerformance
}

export function ClimbingStatsDisplay({ performance }: ClimbingStatsDisplayProps) {
  
  if (performance.totalRoutes === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">🧗</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">אין נתוני טיפוס</h3>
        <p className="text-gray-600">לא נמצאו רשומות טיפוס בטווח התאריכים הנבחר</p>
      </div>
    )
  }

  // Combine Boulder + Board grades
  const combinedBoulderBoard = combineBoulderAndBoard(performance.boulder, performance.board)

  return (
    <div className="space-y-6">
      {/* Overall Summary - Simplified */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-4">🧗 סיכום טיפוס</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Boulder Points */}
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-sm opacity-90 mb-1">🧗 בולדר</div>
            <div className="text-3xl font-bold">
              {combinedBoulderBoard?.grades
                .filter(g => g.climbType === 'Boulder' && g.successfulRoutes > 0)
                .reduce((sum, g) => sum + (g.successfulRoutes * g.gradeId), 0) || 0}
            </div>
            <div className="text-xs opacity-75 mt-1">נקודות הצלחה</div>
          </div>

          {/* Board Points */}
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-sm opacity-90 mb-1">🎯 בורד</div>
            <div className="text-3xl font-bold">
              {combinedBoulderBoard?.grades
                .filter(g => g.climbType === 'Board' && g.successfulRoutes > 0)
                .reduce((sum, g) => sum + (g.successfulRoutes * g.gradeId), 0) || 0}
            </div>
            <div className="text-xs opacity-75 mt-1">נקודות הצלחה</div>
          </div>

          {/* Lead Routes */}
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-sm opacity-90 mb-1">🪢 ליד</div>
            <div className="text-3xl font-bold">
              {performance.lead?.totalSuccesses || 0}
            </div>
            <div className="text-xs opacity-75 mt-1">מסלולים הושלמו</div>
          </div>
        </div>
      </div>

      {/* Boulder + Board Combined */}
      {combinedBoulderBoard && (
        <ClimbTypeCardCombined stats={combinedBoulderBoard} />
      )}

      {/* Lead Stats */}
      {performance.lead && (
        <ClimbTypeCard stats={performance.lead} icon="🪢" title="ליד" />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Combine Boulder + Board into one stats object
// ═══════════════════════════════════════════════════════════════════

function combineBoulderAndBoard(
  boulder: ClimbTypeStats | null,
  board: ClimbTypeStats | null
): ClimbTypeStats | null {
  if (!boulder && !board) return null

  const allGrades: GradeStats[] = []
  
  if (boulder) {
    allGrades.push(...boulder.grades.map(g => ({ ...g, climbType: 'Boulder' as const })))
  }
  
  if (board) {
    allGrades.push(...board.grades.map(g => ({ ...g, climbType: 'Board' as const })))
  }

  // Sort: by grade desc, then Boulder before Board
  allGrades.sort((a, b) => {
    if (a.gradeId !== b.gradeId) return b.gradeId - a.gradeId
    return a.climbType === 'Boulder' ? -1 : 1
  })

  const totalRoutes = (boulder?.totalRoutes || 0) + (board?.totalRoutes || 0)
  const totalSuccesses = (boulder?.totalSuccesses || 0) + (board?.totalSuccesses || 0)
  const totalAttempts = (boulder?.totalAttempts || 0) + (board?.totalAttempts || 0)
  const overallSuccessRate = totalRoutes > 0 ? (totalSuccesses / totalRoutes) * 100 : 0

  return {
    type: 'Boulder',
    grades: allGrades,
    totalRoutes,
    totalSuccesses,
    totalAttempts,
    overallSuccessRate
  }
}

// ═══════════════════════════════════════════════════════════════════
// Combined Boulder + Board Card
// ═══════════════════════════════════════════════════════════════════

function ClimbTypeCardCombined({ stats }: { stats: ClimbTypeStats }) {
  const [open, setOpen] = useState(true)
  const [tableOpen, setTableOpen] = useState(false)

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200">
      {/* Card header — toggles pyramid + table wrapper */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-right bg-gradient-to-r from-orange-100 via-yellow-100 to-orange-100 p-4 border-b-2 border-gray-200 rounded-t-lg focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>🧗</span>
            <span>בולדר + בורד</span>
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 flex gap-4">
              <span>מסלולים: <strong>{stats.totalRoutes}</strong></span>
              <span>הצלחות: <strong>{stats.totalSuccesses}</strong></span>
            </div>
            <span className="text-gray-400 text-xl">{open ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mini Pyramid */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 h-full">
                <h4 className="text-sm font-bold text-gray-700 mb-3 text-center">📊 פירמידת מסלולים</h4>
                <MiniPyramidCombined grades={stats.grades} />
              </div>
            </div>

            {/* Table — sub-accordion */}
            <div className="lg:col-span-2">
              <button
                type="button"
                onClick={() => setTableOpen(t => !t)}
                className="w-full text-right flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition mb-2 focus:outline-none"
              >
                <span className="text-sm font-bold text-gray-700">📋 טבלה מפורטת</span>
                <span className="text-gray-400 text-sm">{tableOpen ? '▲' : '▼'}</span>
              </button>
              {tableOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-gray-700">
                        <th className="text-right p-2 font-bold">דירוג</th>
                        <th className="text-center p-2 font-bold">✅ הצלחות</th>
                        <th className="text-center p-2 font-bold">🔄 ניסיונות+</th>
                        <th className="text-center p-2 font-bold">📈 ממוצע</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.grades.map((grade, idx) => (
                        <GradeRowCombined key={`${grade.gradeId}-${grade.climbType}-${idx}`} grade={grade} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Regular Card for Lead
// ═══════════════════════════════════════════════════════════════════

function ClimbTypeCard({ stats, icon, title }: { stats: ClimbTypeStats; icon: string; title: string }) {
  const [open, setOpen] = useState(true)
  const [tableOpen, setTableOpen] = useState(false)

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200">
      {/* Card header — toggles pyramid + table wrapper */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-right bg-gradient-to-r from-gray-100 to-gray-50 p-4 border-b-2 border-gray-200 rounded-t-lg focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>{icon}</span>
            <span>{title}</span>
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 flex gap-4">
              <span>מסלולים: <strong>{stats.totalRoutes}</strong></span>
              <span>הצלחות: <strong>{stats.totalSuccesses}</strong></span>
            </div>
            <span className="text-gray-400 text-xl">{open ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 h-full">
                <h4 className="text-sm font-bold text-gray-700 mb-3 text-center">📊 פירמידת מסלולים</h4>
                <MiniPyramid grades={stats.grades} />
              </div>
            </div>

            {/* Table — sub-accordion */}
            <div className="lg:col-span-2">
              <button
                type="button"
                onClick={() => setTableOpen(t => !t)}
                className="w-full text-right flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition mb-2 focus:outline-none"
              >
                <span className="text-sm font-bold text-gray-700">📋 טבלה מפורטת</span>
                <span className="text-gray-400 text-sm">{tableOpen ? '▲' : '▼'}</span>
              </button>
              {tableOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-gray-700">
                        <th className="text-right p-2 font-bold">דירוג</th>
                        <th className="text-center p-2 font-bold">✅ הצלחות</th>
                        <th className="text-center p-2 font-bold">🔄 ניסיונות+</th>
                        <th className="text-center p-2 font-bold">📈 ממוצע</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.grades.map((grade) => (
                        <GradeRow key={grade.gradeId} grade={grade} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Grade Row for Combined Boulder+Board
// ═══════════════════════════════════════════════════════════════════

function GradeRowCombined({ grade }: { grade: GradeStats }) {
  const successBgColor = grade.successRate >= 80 ? 'bg-green-50' :
                         grade.successRate >= 50 ? 'bg-yellow-50' : 'bg-red-50'
  
  const typeColor = grade.climbType === 'Boulder' ? 'border-l-4 border-l-orange-500' :
                   grade.climbType === 'Board' ? 'border-l-4 border-l-yellow-500' : ''
  
  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition ${typeColor}`}>
      <td className="text-right p-2 font-bold text-gray-900">
        <div className="flex items-center gap-2">
          <span>{grade.gradeName}</span>
          {grade.climbType === 'Board' && (
            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">
              בורד
            </span>
          )}
        </div>
      </td>
      <td className="text-center p-2 text-green-700 font-semibold">
        {grade.successfulRoutes}
      </td>
      <td className="text-center p-2 text-blue-700">
        {grade.attemptsWithSuccess}
      </td>
      <td className="text-center p-2 font-medium text-purple-700">
        {grade.avgAttemptsToSuccess > 0 ? grade.avgAttemptsToSuccess.toFixed(1) : '—'}
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Regular Grade Row (for Lead)
// ═══════════════════════════════════════════════════════════════════

function GradeRow({ grade }: { grade: GradeStats }) {
  const bgColor = grade.successRate >= 80 ? 'bg-green-50' :
                  grade.successRate >= 50 ? 'bg-yellow-50' : 'bg-red-50'
  
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
      <td className="text-right p-2 font-bold text-gray-900">
        {grade.gradeName}
      </td>
      <td className="text-center p-2 text-green-700 font-semibold">
        {grade.successfulRoutes}
      </td>
      <td className="text-center p-2 text-blue-700">
        {grade.attemptsWithSuccess}
      </td>
      <td className="text-center p-2 font-medium text-purple-700">
        {grade.avgAttemptsToSuccess > 0 ? grade.avgAttemptsToSuccess.toFixed(1) : '—'}
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Mini Pyramid for Combined Boulder+Board
// ═══════════════════════════════════════════════════════════════════

function MiniPyramidCombined({ grades }: { grades: GradeStats[] }) {
  if (grades.length === 0) return null

  const maxRoutes = Math.max(...grades.map(g => g.successfulRoutes))

  return (
    <div className="space-y-2">
      {grades.map((grade, idx) => {
        const widthPercent = maxRoutes > 0 ? (grade.successfulRoutes / maxRoutes) * 100 : 0
        const barColor = grade.climbType === 'Boulder' ? 'bg-orange-500' : 'bg-yellow-500'
        
        return (
          <div key={`${grade.gradeId}-${grade.climbType}-${idx}`} className="flex items-center gap-2">
            <div className="w-12 text-right font-bold text-gray-700 text-xs flex items-center gap-1">
              <span>{grade.gradeName}</span>
              {grade.climbType === 'Board' && <span className="text-yellow-600">●</span>}
            </div>
            
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 flex items-center justify-center ${barColor}`}
                style={{ width: `${widthPercent}%` }}
              >
                {widthPercent > 25 && (
                  <span className="text-white font-bold text-xs">
                    {grade.successfulRoutes}
                  </span>
                )}
              </div>
            </div>
            
            {widthPercent <= 25 && (
              <div className="w-6 text-xs font-bold text-gray-600">
                {grade.successfulRoutes}
              </div>
            )}
          </div>
        )
      })}
      
      <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>בולדר</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>בורד</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Mini Pyramid for Lead
// ═══════════════════════════════════════════════════════════════════

function MiniPyramid({ grades }: { grades: GradeStats[] }) {
  if (grades.length === 0) return null

  const maxRoutes = Math.max(...grades.map(g => g.successfulRoutes))

  return (
    <div className="space-y-2">
      {grades.map((grade) => {
        const widthPercent = maxRoutes > 0 ? (grade.successfulRoutes / maxRoutes) * 100 : 0
        const barColor = grade.successRate >= 80 ? 'bg-green-500' :
                        grade.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
        
        return (
          <div key={grade.gradeId} className="flex items-center gap-2">
            <div className="w-12 text-right font-bold text-gray-700 text-xs">
              {grade.gradeName}
            </div>
            
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 flex items-center justify-center ${barColor}`}
                style={{ width: `${widthPercent}%` }}
              >
                {widthPercent > 25 && (
                  <span className="text-white font-bold text-xs">
                    {grade.successfulRoutes}
                  </span>
                )}
              </div>
            </div>
            
            {widthPercent <= 25 && (
              <div className="w-6 text-xs font-bold text-gray-600">
                {grade.successfulRoutes}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}