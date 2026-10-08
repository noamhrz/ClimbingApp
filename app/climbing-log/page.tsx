// app/climbing-log/page.tsx - FIXED
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveUserEmail } from '@/context/AuthContext'
import { ClimbingLogEntry, BoulderGrade, LeadGrade, BoardType, ClimbingLocation } from '@/types/climbing'
import {
  fetchClimbingLogs,
  fetchBoulderGrades,
  fetchLeadGrades,
  fetchBoardTypes,
  fetchClimbingLocations,
  addClimbingLog,
  deleteClimbingLog,
  calculateHistogramSplit,
  calculateHistogramLead,
} from '@/lib/climbing-log-api'
import ClimbingLogChart from '@/components/climbing/ClimbingLogChart'
import ClimbingLogFilters, { ClimbingLogFilters as FiltersType } from '@/components/climbing/ClimbingLogFilters'
import ClimbingLogList from '@/components/climbing/ClimbingLogList'
import AddClimbingLogModal from '@/components/climbing/AddClimbingLogModal'
import { LuMountain } from 'react-icons/lu'

export default function ClimbingLogPage() {
  const router = useRouter()
  const email = useActiveUserEmail()

  const [allLogs, setAllLogs] = useState<ClimbingLogEntry[]>([]) // All logs from DB
  const [filteredLogs, setFilteredLogs] = useState<ClimbingLogEntry[]>([]) // After filtering
  const [boulderGrades, setBoulderGrades] = useState<BoulderGrade[]>([])
  const [leadGrades, setLeadGrades] = useState<LeadGrade[]>([])
  const [boardTypes, setBoardTypes] = useState<BoardType[]>([])
  const [locations, setLocations] = useState<ClimbingLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filters, setFilters] = useState<FiltersType>({
    startDate: '',
    endDate: '', // Show all dates by default
    climbType: 'BoulderBoard',
    minGradeId: null,
    maxGradeId: null,
  })

  // Load static data once
  useEffect(() => {
    loadStaticData()
  }, [])

  // Load logs when email or date/grade filters change
  useEffect(() => {
    if (email) {
      loadLogs()
    }
  }, [email, filters.startDate, filters.endDate, filters.minGradeId, filters.maxGradeId])

  // Apply client-side filter when climbType or allLogs change
  useEffect(() => {
    applyClientSideFilter()
  }, [allLogs, filters.climbType])

  const loadStaticData = async () => {
    try {
      const [boulderGradesData, leadGradesData, boardTypesData, locationsData] = await Promise.all([
        fetchBoulderGrades(),
        fetchLeadGrades(),
        fetchBoardTypes(),
        fetchClimbingLocations(),
      ])

      setBoulderGrades(boulderGradesData)
      setLeadGrades(leadGradesData)
      setBoardTypes(boardTypesData)
      setLocations(locationsData)
    } catch (error) {
      console.error('Error loading static data:', error)
    }
  }

  const loadLogs = async () => {
    if (!email) return

    setLoading(true)
    try {
      // Fetch all logs with date/grade filters only
      const logsData = await fetchClimbingLogs(email, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        minGradeId: filters.minGradeId,
        maxGradeId: filters.maxGradeId,
      })

      setAllLogs(logsData)
    } catch (error) {
      console.error('Error loading logs:', error)
      alert('שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }

  const applyClientSideFilter = () => {
    if (filters.climbType === 'Lead') {
      const leadLogs = allLogs.filter((log) => log.ClimbType === 'Lead')
      setFilteredLogs(leadLogs)
    } else {
      // BoulderBoard
      const bbLogs = allLogs.filter((log) => log.ClimbType === 'Boulder' || log.ClimbType === 'Board')
      setFilteredLogs(bbLogs)
    }
  }

  const handleAddLog = async (logData: any) => {
    if (!email) return

    try {
      await addClimbingLog(email, logData)
      await loadLogs()
      alert('✅ המסלול נוסף בהצלחה!')
    } catch (error) {
      console.error('Error adding log:', error)
      throw error
    }
  }

  const handleDeleteLog = async (logId: number) => {
    try {
      await deleteClimbingLog(logId)
      await loadLogs()
    } catch (error) {
      console.error('Error deleting log:', error)
      alert('שגיאה במחיקת רשומה')
    }
  }

  // Calculate chart data based on filter
  const getChartData = () => {
    if (filters.climbType === 'Lead') {
      return {
        type: 'Lead' as const,
        lead: calculateHistogramLead(filteredLogs, leadGrades),
      }
    } else {
      // BoulderBoard
      return {
        type: 'BoulderBoard' as const,
        boulderBoard: calculateHistogramSplit(filteredLogs, boulderGrades),
      }
    }
  }

  const chartData = getChartData()

  if (!email) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-fg-3">אנא התחבר כדי לצפות ביומן הטיפוס</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-fg-3 hover:text-fg"
            title="חזור לדף הבית"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          <h1 className="text-3xl font-bold"><LuMountain aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />יומן טיפוס</h1>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-on-accent px-4 py-2 rounded-lg hover:bg-accent-hover font-medium"
          >
            + הוסף מסלול
          </button>
          <div className="text-sm text-fg-3">
            סה"כ {allLogs.length} מסלולים
          </div>
        </div>
      </div>

      {/* Filters */}
      <ClimbingLogFilters
        filters={filters}
        onChange={setFilters}
        boulderGrades={boulderGrades}
        leadGrades={leadGrades}
      />

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-fg-3">טוען נתונים...</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          {filteredLogs.length > 0 && <ClimbingLogChart data={chartData} />}

          {/* List */}
          {filteredLogs.length === 0 ? (
            <div className="bg-surface rounded-lg p-12 text-center">
              <div className="text-6xl mb-4"><LuMountain aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em]" /></div>
              <p className="text-fg-3 text-lg mb-4">
                {allLogs.length > 0
                  ? 'לא נמצאו מסלולים עם הסינון הנוכחי'
                  : 'עדיין אין רשומות ביומן'}
              </p>
              {allLogs.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-accent hover:underline font-medium"
                >
                  הוסף את המסלול הראשון שלך!
                </button>
              )}
            </div>
          ) : (
            <ClimbingLogList
              logs={allLogs} // ← Pass ALL logs, not filtered!
              boulderGrades={boulderGrades}
              leadGrades={leadGrades}
              onDelete={handleDeleteLog}
            />
          )}
        </>
      )}

      {/* Add Modal */}
      <AddClimbingLogModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddLog}
        boulderGrades={boulderGrades}
        leadGrades={leadGrades}
        boardTypes={boardTypes}
        locations={locations}
      />
    </div>
  )
}
