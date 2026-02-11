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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">
          📊 סשנים מסוננים ({logs.length})
        </h3>
        
        {/* Pagination info */}
        {totalPages > 1 && (
          <div className="text-sm text-gray-600">
            עמוד {currentPage} מתוך {totalPages}
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                תאריך
              </th>
              {isSingleHand && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  יד
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                סט
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                משקל (ק״ג)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                חזרות
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                משך (שניות)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                RPE
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Volume Score
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                הערות
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedLogs.map((log, index) => (
              <tr 
                key={log.ExerciseLogID}
                className={`hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <div className="font-medium">
                    {moment(log.CreatedAt).format('DD/MM/YYYY')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {moment(log.CreatedAt).format('HH:mm')}
                  </div>
                </td>
                
                {isSingleHand && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {log.HandSide === 'Right' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        🫱 ימין
                      </span>
                    ) : log.HandSide === 'Left' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        🫲 שמאל
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        שתיים
                      </span>
                    )}
                  </td>
                )}
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {log.SetNumber || '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.WeightKG !== null ? log.WeightKG.toFixed(1) : '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {log.RepsDone || '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {log.DurationSec || '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {log.RPE ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.RPE >= 8 ? 'bg-red-100 text-red-800' :
                      log.RPE >= 6 ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {log.RPE}
                    </span>
                  ) : '-'}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {log.VolumeScore || '-'}
                </td>
                
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {log.Notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            הבא →
          </button>
        </div>
      )}
    </div>
  )
}