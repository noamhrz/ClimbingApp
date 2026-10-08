// app/goals/[email]/page.tsx
// 🎯 Goals Edit Page - Accordion Layout
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import {
  getGeneralGoals,
  getBoulderGoals,
  getBoardGoals,
  getLeadGoals,
  saveGeneralGoals,
  saveBoulderGoals,
  saveBoardGoals,
  saveLeadGoals,
} from '@/lib/goals-api'
import type { GeneralGoalsData, BoulderGoalsData, LeadGoalsData } from '@/lib/goals-api'
import GeneralGoalsForm from '@/components/goals/GeneralGoalsForm'
import GradeGoalsForm from '@/components/goals/GradeGoalsForm'
import GoalsPyramidEnhanced from '@/components/goals/GoalsPyramidEnhanced'
import GoalsProgressPyramid from '@/components/goals/GoalsProgressPyramid'
import { LuCalendarDays, LuChartColumn, LuLink, LuMountain, LuNotebookPen, LuTarget } from 'react-icons/lu'
import { PageSkeleton } from '@/components/ui/Skeleton'

export default function GoalsEditPage() {
  const params = useParams()
  const router = useRouter()
  const { activeUser, currentUser, loading: authLoading } = useAuth()
  
  const targetEmail = decodeURIComponent(params.email as string)
  
  // Year/Quarter
  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.floor((new Date().getMonth() / 3)) + 1
  
  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState(currentQuarter)
  
  // Data
  const [generalData, setGeneralData] = useState<GeneralGoalsData | null>(null)
  const [boulderData, setBoulderData] = useState<BoulderGoalsData | null>(null)
  const [boardData, setBoardData] = useState<BoulderGoalsData | null>(null)
  const [leadData, setLeadData] = useState<LeadGoalsData | null>(null)
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [openSection, setOpenSection] = useState<string | null>('general')
  const [userName, setUserName] = useState('')

  // Permission check
  useEffect(() => {
    if (!authLoading && activeUser) {
      checkPermission()
    }
  }, [authLoading, activeUser])

  const checkPermission = () => {
    if (!activeUser) {
      router.push('/goals')
      return
    }

    // Check if user has permission to edit this email
    if (activeUser.Role === 'user' && activeUser.Email !== targetEmail) {
      alert('אין לך הרשאה לערוך יעדים של משתמש אחר')
      router.push(`/goals/${activeUser.Email}`)
      return
    }

    // Load data
    loadAllData()
  }

  const loadAllData = async () => {
    setLoading(true)

    // Load user name
    const { data: userData } = await supabase
      .from('Users')
      .select('Name')
      .eq('Email', targetEmail)
      .single()
    
    if (userData) {
      setUserName(userData.Name)
    }

    // Load goals
    const [general, boulder, board, lead] = await Promise.all([
      getGeneralGoals(targetEmail, year, quarter),
      getBoulderGoals(targetEmail, year, quarter),
      getBoardGoals(targetEmail, year, quarter),
      getLeadGoals(targetEmail, year, quarter),
    ])

    setGeneralData(general)
    setBoulderData(boulder)
    setBoardData(board)
    setLeadData(lead)
    setLoading(false)
  }

  // Reload data when year/quarter changes
  useEffect(() => {
    if (!authLoading && activeUser) {
      loadAllData()
    }
  }, [year, quarter])

  const handleSaveGeneral = async (data: GeneralGoalsData) => {
    return await saveGeneralGoals(targetEmail, year, quarter, data)
  }

  const handleSaveBoulder = async (data: BoulderGoalsData) => {
    return await saveBoulderGoals(targetEmail, year, quarter, data)
  }

  const handleSaveBoard = async (data: BoulderGoalsData) => {
    return await saveBoardGoals(targetEmail, year, quarter, data)
  }

  const handleSaveLead = async (data: LeadGoalsData) => {
    return await saveLeadGoals(targetEmail, year, quarter, data)
  }

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  if (authLoading || loading) {
    return (
      <PageSkeleton variant="detail" label="טוען יעדים..." />
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/goals')}
          className="mb-4 text-accent hover:text-accent/90 flex items-center gap-2"
        >
          ← חזרה לרשימת משתמשים
        </button>
        
        <h1 className="text-4xl font-bold mb-2"><LuTarget aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />הגדרת יעדים</h1>
        <p className="text-fg-3 text-lg">{userName || targetEmail}</p>
      </div>

      {/* Year & Quarter Selector */}
      <div className="bg-surface rounded-xl p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-fg-2 mb-2">
              <LuCalendarDays aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />שנה
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-semibold text-fg-2 mb-2">
              <LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />רבעון
            </label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value={1}>Q1 (ינואר-מרץ)</option>
              <option value={2}>Q2 (אפריל-יוני)</option>
              <option value={3}>Q3 (יולי-ספטמבר)</option>
              <option value={4}>Q4 (אוקטובר-דצמבר)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-4">
        {/* General Goals */}
        <div className="bg-surface rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('general')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{openSection === 'general' ? '▼' : '▶'}</span>
              <span className="text-xl font-bold"><LuNotebookPen aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />מטרות כלליות</span>
            </div>
          </button>
          
          {openSection === 'general' && (
            <div className="px-6 pb-6 border-t">
              <div className="pt-6">
                <GeneralGoalsForm
                  initialData={generalData}
                  onSave={handleSaveGeneral}
                />
              </div>
            </div>
          )}
        </div>

        {/* Boulder Goals */}
        <div className="bg-surface rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('boulder')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{openSection === 'boulder' ? '▼' : '▶'}</span>
              <span className="text-xl font-bold">🪨 יעדי בולדר</span>
            </div>
          </button>
          
          {openSection === 'boulder' && (
            <div className="px-6 pb-6 border-t">
              <div className="pt-6">
                <GradeGoalsForm
                  type="boulder"
                  initialData={boulderData}
                  onSave={handleSaveBoulder}
                />
              </div>
            </div>
          )}
        </div>

        {/* Board Goals */}
        <div className="bg-surface rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('board')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{openSection === 'board' ? '▼' : '▶'}</span>
              <span className="text-xl font-bold"><LuMountain aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />יעדי בורד</span>
            </div>
          </button>
          
          {openSection === 'board' && (
            <div className="px-6 pb-6 border-t">
              <div className="pt-6">
                <GradeGoalsForm
                  type="board"
                  initialData={boardData}
                  onSave={handleSaveBoard}
                />
              </div>
            </div>
          )}
        </div>

        {/* Lead Goals */}
        <div className="bg-surface rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('lead')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{openSection === 'lead' ? '▼' : '▶'}</span>
              <span className="text-xl font-bold"><LuLink aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />יעדי ליד</span>
            </div>
          </button>
          
          {openSection === 'lead' && (
            <div className="px-6 pb-6 border-t">
              <div className="pt-6">
                <GradeGoalsForm
                  type="lead"
                  initialData={leadData}
                  onSave={handleSaveLead}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Section - 3 Separate Pyramids */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold mb-2 text-center text-fg"><LuChartColumn aria-hidden className="inline-block w-[1.1em] h-[1.1em] align-[-0.15em] me-1.5" />התקדמות ביעדים</h2>
        <p className="text-center text-muted mb-8">
          מעקב אחר ההתקדמות שלך מול היעדים שהגדרת
        </p>
        
        <div className="space-y-6">
          {/* Boulder Progress */}
          <GoalsProgressPyramid
            email={targetEmail}
            year={year}
            quarter={quarter}
            type="boulder"
            title="🪨 התקדמות בולדר"
          />
          
          {/* Board Progress */}
          <GoalsProgressPyramid
            email={targetEmail}
            year={year}
            quarter={quarter}
            type="board"
            title="🧗 התקדמות בורד"
          />
          
          {/* Lead Progress */}
          <GoalsProgressPyramid
            email={targetEmail}
            year={year}
            quarter={quarter}
            type="lead"
            title="🔗 התקדמות ליד"
          />
        </div>
      </div>
    </div>
  )
}