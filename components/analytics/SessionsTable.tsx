// components/analytics/SessionsTable.tsx
// Table showing filtered exercise logs - WITH PAGINATION

'use client'

import { useState } from 'react'
import { ExerciseLog } from '@/types/analytics'
import moment from 'moment'

interface SessionsTableProps {
  logs: ExerciseLog[]
  isSingleHand: boolean
}

export default function SessionsTable({ logs, isSingleHand }: SessionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 20 // Show 20 logs per page
  
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-line p-8">
        <div className="text-center text-muted">
          <div className="text-4xl mb-2">📋</div>
          <div>אין סשנים להצגה</div>
        </div>
      </div>
    )
  }

  // ✅ OPTIMIZATION: Paginate logs
  const totalPages = Math.ceil(logs.length / logsPerPage)
  const startIndex = (currentPage - 1) * logsPerPage
  const endIndex = startIndex + logsPerPage
  const displayedLogs = logs.slice(startIndex, endIndex)

  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      <div className="p-4 border-b border-line bg-surface flex justify-between items-center">
        <h3 className="text-lg font-bold text-fg">
          📊 סשנים מסוננים ({logs.length})
        </h3>
        
        {/* Pagination info */}
        {totalPages > 1 && (
          <div className="text-sm text-fg-3">
            עמוד {currentPage} מתוך {totalPages}
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface border-b border-line">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                תאריך
              </th>
              {isSingleHand && (
                <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                  יד
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                סט
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                משקל (ק״ג)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                חזרות
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                משך (שניות)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                RPE
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                Volume Score
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-fg-2 uppercase tracking-wider">
                הערות
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-line">
            {displayedLogs.map((log, index) => (
              <tr 
                key={log.ExerciseLogID}
                className={`hover:bg-surface/90 transition-colors ${
 index % 2 === 0 ? 'bg-surface' : 'bg-surface/50'
 }`}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm text-fg">
                  <div className="font-medium">
                    {moment(log.CreatedAt).format('DD/MM/YYYY')}
                  </div>
                  <div className="text-xs text-muted">
                    {moment(log.CreatedAt).format('HH:mm')}
                  </div>
                </td>
                
                {isSingleHand && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {log.HandSide === 'Right' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent">
                        🫱 ימין
                      </span>
                    ) : log.HandSide === 'Left' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
                        🫲 שמאל
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-fg">
                        שתיים
                      </span>
                    )}
                  </td>
                )}
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-fg-2">
                  {log.SetNumber || '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-fg">
                  {log.WeightKG !== null ? log.WeightKG.toFixed(1) : '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-fg-2">
                  {log.RepsDone || '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-fg-2">
                  {log.DurationSec || '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {log.RPE ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 log.RPE >= 8 ? 'bg-danger/15 text-danger' :
 log.RPE >= 6 ? 'bg-warning/10 text-warning' :
 'bg-success/15 text-success'
 }`}>
                      {log.RPE}
                    </span>
                  ) : '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-fg-2">
                  {log.VolumeScore || '-'}
                </td>
                
                <td className="px-4 py-3 text-sm text-fg-3 max-w-xs truncate">
                  {log.Notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-line bg-surface flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-surface border border-line rounded-lg text-sm font-medium text-fg-2 hover:bg-surface/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← הקודם
          </button>
          
          <div className="flex gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show first, last, current, and 2 around current
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
 currentPage === pageNum
 ? 'bg-accent text-on-accent'
 : 'bg-surface border border-line text-fg-2 hover:bg-surface/90'
 }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-surface border border-line rounded-lg text-sm font-medium text-fg-2 hover:bg-surface/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            הבא →
          </button>
        </div>
      )}
    </div>
  )
}