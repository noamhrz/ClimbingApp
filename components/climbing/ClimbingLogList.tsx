// components/climbing/ClimbingLogList.tsx
'use client'

import { ClimbingLogEntry, BoulderGrade, LeadGrade } from '@/types/climbing'
import { getGradeDisplay } from '@/lib/climbing-helpers'

interface Props {
  logs: ClimbingLogEntry[]
  boulderGrades: BoulderGrade[]
  leadGrades: LeadGrade[]
  onDelete: (id: number) => void
}

export default function ClimbingLogList({ logs, boulderGrades, leadGrades, onDelete }: Props) {
  // Split logs into Lead vs Boulder+Board
  const leadLogs = logs.filter((log) => log.ClimbType === 'Lead')
  const boulderBoardLogs = logs.filter((log) => log.ClimbType === 'Boulder' || log.ClimbType === 'Board')

  console.log('📋 ClimbingLogList received:', logs.length, 'logs')
  console.log('📋 Lead logs:', leadLogs.length, leadLogs)
  console.log('📋 Boulder+Board logs:', boulderBoardLogs.length, boulderBoardLogs)

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDelete = (log: ClimbingLogEntry) => {
    if (!log.ClimbingLogID) {
      console.error('Cannot delete: ClimbingLogID is undefined')
      return
    }
    
    if (confirm('האם למחוק רשומה זו?')) {
      onDelete(log.ClimbingLogID)
    }
  }

  const LogItem = ({ log }: { log: ClimbingLogEntry }) => {
    const gradeDisplay = getGradeDisplay(
      log.GradeID ?? null, 
      log.ClimbType, 
      boulderGrades, 
      leadGrades
    )

    return (
      <div className="border-b last:border-b-0 py-3 hover:bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Date */}
            <div className="text-xs text-gray-500 mb-1">
              📅 {formatDate(log.LogDateTime)}
            </div>

            {/* Grade & Route Name */}
            <div className="font-medium mb-1">
              <span className="text-blue-600">{gradeDisplay}</span>
              {log.RouteName && <span className="text-gray-700 ml-2">- {log.RouteName}</span>}
            </div>

            {/* Attempts & Success */}
            <div className="flex items-center gap-3 text-sm text-gray-600 mb-1">
              <span>🔄 {log.Attempts} ניסיונות</span>
              <span className={log.Successful ? 'text-green-600 font-medium' : 'text-red-600'}>
                {log.Successful ? '✅ הצליח' : '❌ לא הצליח'}
              </span>
              {log.ClimbType === 'Board' && (
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                  Board
                </span>
              )}
            </div>

            {/* Notes */}
            {log.Notes && (
              <div className="text-sm text-gray-600 italic mt-1">
                💭 {log.Notes}
              </div>
            )}
          </div>

          {/* Delete Button */}
          <button
            onClick={() => handleDelete(log)}
            className="text-red-500 hover:text-red-700 ml-2"
            title="מחק"
            disabled={!log.ClimbingLogID}
          >
            🗑️
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold">📋 היסטוריית מסלולים</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-200">
        {/* Lead Column */}
        <div>
          <div className="bg-blue-50 px-4 py-2 font-bold text-blue-900 border-b">
            🧗 Lead ({leadLogs.length})
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {leadLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🧗</div>
                <p>אין מסלולי Lead עדיין</p>
              </div>
            ) : (
              <div className="px-4">
                {leadLogs.map((log) => (
                  <LogItem key={log.ClimbingLogID || `temp-${Math.random()}`} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Boulder + Board Column */}
        <div>
          <div className="bg-green-50 px-4 py-2 font-bold text-green-900 border-b">
            🪨 Boulder + Board ({boulderBoardLogs.length})
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {boulderBoardLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🪨</div>
                <p>אין מסלולי Boulder/Board עדיין</p>
              </div>
            ) : (
              <div className="px-4">
                {boulderBoardLogs.map((log) => (
                  <LogItem key={log.ClimbingLogID || `temp-${Math.random()}`} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
