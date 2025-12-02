// components/climbing/RouteTypeBlock.tsx - WITH SUCCESS FEEDBACK

'use client'

import { useState, useEffect } from 'react'
import { ClimbingRoute, BoulderGrade, LeadGrade, BoardType } from '@/types/climbing'
import { RouteTable } from './RouteTable'
import { generateTempId, getGradeDisplay } from '@/lib/climbing-helpers'

interface RouteTypeBlockProps {
  type: 'Boulder' | 'Board' | 'Lead'
  icon: string
  routes: ClimbingRoute[]
  onRoutesChange: (routes: ClimbingRoute[]) => void
  boulderGrades: BoulderGrade[]
  leadGrades: LeadGrade[]
  boardTypes: BoardType[]
  selectedBoardType: number | null
  onBoardTypeChange: (boardTypeId: number | null) => void
}

export function RouteTypeBlock({
  type,
  icon,
  routes,
  onRoutesChange,
  boulderGrades,
  leadGrades,
  boardTypes,
  selectedBoardType,
  onBoardTypeChange
}: RouteTypeBlockProps) {
  const isLead = type === 'Lead'
  
  // Accordion state - default to open if there are routes
  const [isOpen, setIsOpen] = useState<boolean>(routes.length > 0)
  
  // Auto-open when routes are added
  useEffect(() => {
    if (routes.length > 0 && !isOpen) {
      setIsOpen(true)
    }
  }, [routes.length])
  
  // ✨ CHANGED: Default grade V1 (grade 1) instead of V6 (grade 6)
  const DEFAULT_BOULDER_GRADE = 1  // V1
  const DEFAULT_LEAD_GRADE = 4     // 4a (LeadGradeID 4)
  
  // Default grade selection
  const [gradeValue, setGradeValue] = useState<number>(
    isLead ? DEFAULT_LEAD_GRADE : DEFAULT_BOULDER_GRADE
  )
  const [countValue, setCountValue] = useState<number>(1)
  
  // ✨ NEW: Loading and success states
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  
  // Quick add handler
  const handleQuickAdd = () => {
    if (countValue < 1 || isAdding) return
    
    // ✨ Show loading state
    setIsAdding(true)
    
    const newRoutes: ClimbingRoute[] = Array(countValue).fill(null).map(() => ({
      id: generateTempId(),
      climbType: type,
      gradeID: gradeValue,
      gradeDisplay: getGradeDisplay(gradeValue, type, boulderGrades, leadGrades),
      routeName: '',
      attempts: 1,
      successful: true,
      notes: ''
    }))
    
    onRoutesChange([...routes, ...newRoutes])
    
    // ✨ Reset to defaults with success animation
    setTimeout(() => {
      setIsAdding(false)
      setJustAdded(true)
      setCountValue(1)
      setGradeValue(isLead ? DEFAULT_LEAD_GRADE : DEFAULT_BOULDER_GRADE)
      
      // Hide success state after 800ms
      setTimeout(() => setJustAdded(false), 800)
    }, 300)
  }
  
  // Update route
  const updateRoute = (id: string, updates: Partial<ClimbingRoute>) => {
    onRoutesChange(
      routes.map(r => r.id === id ? { ...r, ...updates } : r)
    )
  }
  
  // Delete route
  const deleteRoute = (id: string) => {
    onRoutesChange(routes.filter(r => r.id !== id))
  }
  
  return (
    <div className="mb-6 border rounded-lg overflow-hidden shadow-sm">
      {/* Accordion Header - Clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 flex items-center justify-between hover:from-blue-600 hover:to-blue-700 transition-all"
      >
        <span className="font-bold text-lg">
          {icon} {type} ({routes.length} מסלולים)
        </span>
        <span className="text-2xl transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>
      
      {/* Collapsible Content */}
      {isOpen && (
        <>
          {/* Board Type Selector - Only for Board */}
          {type === 'Board' && (
            <div className="p-4 bg-purple-50 border-b">
              <label className="block text-sm font-medium mb-2">
                🏋️ סוג Board:
              </label>
              <select
                value={selectedBoardType || ''}
                onChange={(e) => onBoardTypeChange(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
              >
                <option value="">בחר סוג Board</option>
                {(boardTypes || []).map(board => (
                  <option key={board.BoardID} value={board.BoardID}>
                    {board.BoardName} - {board.Manufacturer}
                    {board.AppSupported && ' 📱'}
                    {board.LEDSystem && ' 💡'}
                  </option>
                ))}
              </select>
              {selectedBoardType && (boardTypes || []).find(b => b.BoardID === selectedBoardType) && (
                <p className="text-xs text-gray-600 mt-1">
                  {(boardTypes || []).find(b => b.BoardID === selectedBoardType)?.Description}
                </p>
              )}
            </div>
          )}

          {/* Quick Add */}
          <div className={`p-4 border-b transition-all duration-300 ${
            justAdded ? 'bg-green-50' : 'bg-blue-50'
          }`}>
            <div className="text-sm font-medium mb-2">🚀 הוספה מהירה:</div>
            
            {/* Grade and Count - Same Row */}
            <div className="flex items-center gap-2 mb-3">
              {/* Grade Dropdown */}
              <select
                value={gradeValue}
                onChange={(e) => setGradeValue(Number(e.target.value))}
                disabled={isAdding}
                className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLead ? (
                  // Lead grades (1-30)
                  leadGrades.map(g => (
                    <option key={g.LeadGradeID} value={g.LeadGradeID}>
                      {g.FrenchGrade} ({g.YosemiteGrade})
                    </option>
                  ))
                ) : (
                  // Boulder/Board grades (0-17)
                  boulderGrades.map(g => (
                    <option key={g.BoulderGradeID} value={g.BoulderGradeID}>
                      {g.VGrade} ({g.FontGrade})
                    </option>
                  ))
                )}
              </select>
              
              <span className="text-lg px-2">×</span>
              
              {/* Count Input */}
              <input
                type="number"
                value={countValue}
                onChange={(e) => setCountValue(Number(e.target.value))}
                min="1"
                max="50"
                disabled={isAdding}
                className="w-20 px-3 py-2 border rounded text-center focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>
            
            {/* Add Button - Separate Row */}
            <button
              onClick={handleQuickAdd}
              disabled={countValue < 1 || isAdding}
              className={`w-full px-4 py-2 rounded font-medium transition-all duration-300 ${
                justAdded
                  ? 'bg-green-600 text-white scale-105'
                  : isAdding
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:bg-gray-300 disabled:cursor-not-allowed`}
            >
              {isAdding ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מוסיף...
                </span>
              ) : justAdded ? (
                <span className="flex items-center justify-center gap-2">
                  ✅ נוסף בהצלחה!
                </span>
              ) : (
                '⚡ הוסף'
              )}
            </button>
            
            {/* Success Message */}
            {justAdded && (
              <div className="mt-2 text-center text-sm text-green-700 font-medium animate-pulse">
                🎉 {countValue} מסלולים נוספו!
              </div>
            )}
          </div>
          
          {/* Table */}
          <RouteTable
            routes={routes}
            onUpdate={updateRoute}
            onDelete={deleteRoute}
          />
        </>
      )}
    </div>
  )
}