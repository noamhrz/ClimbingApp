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
      <div className="border-b last:border-b-0 py-3 hover:bg-surface">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Date */}
            <div className="text-xs text-muted mb-1">
              📅 {formatDate(log.LogDateTime)}
            </div>

            {/* Grade & Route Name */}
            <div className="font-medium mb-1">
              <span className="text-accent">{gradeDisplay}</span>
              {log.RouteName && <span className="text-fg-2 ml-2">- {log.RouteName}</span>}
            </div>

            {/* Attempts & Success */}
            <div className="flex items-center gap-3 text-sm text-fg-3 mb-1">
              <span>🔄 {log.Attempts} ניסיונות</span>
              <span className={log.Successful ? 'text-success font-medium' : 'text-danger'}>
                {log.Successful ? '✅ הצליח' : '❌ לא הצליח'}
              </span>
              {log.ClimbType === 'Board' && (
                <span className="bg-info/10 text-info px-2 py-0.5 rounded text-xs">
                  Board
                </span>
              )}
            </div>

            {/* Notes */}
            {log.Notes && (
              <div className="text-sm text-fg-3 italic mt-1">
                💭 {log.Notes}
              </div>
            )}
          </div>

          {/* Delete Button */}
          <button
            onClick={() => handleDelete(log)}
            className="text-danger hover:text-danger/90 ml-2"
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
    <div className="bg-surface rounded-lg mb-6">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold">📋 היסטוריית מסלולים</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-line">
        {/* Lead Column */}
        <div>
          <div className="bg-accent/15 px-4 py-2 font-bold text-accent border-b">
            🧗 Lead ({leadLogs.length})
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {leadLogs.length === 0 ? (
              <div className="p-8 text-center text-muted">
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
          <div className="bg-success/15 px-4 py-2 font-bold text-success border-b">
            🪨 Boulder + Board ({boulderBoardLogs.length})
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {boulderBoardLogs.length === 0 ? (
              <div className="p-8 text-center text-muted">
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
