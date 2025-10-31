// components/climbing/RouteTypeBlock.tsx

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
  
  // Default grade selection
  const [gradeValue, setGradeValue] = useState<number>(
    isLead ? 9 : 6  // 6a for Lead, V6 for Boulder/Board
  )
  const [countValue, setCountValue] = useState<number>(1)
  
  // Quick add handler
  const handleQuickAdd = () => {
    if (countValue < 1) return
    
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
    setCountValue(1) // reset count
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
          <div className="p-4 bg-blue-50 border-b">
            <div className="text-sm font-medium mb-2">🚀 הוספה מהירה:</div>
            
            {/* Grade and Count - Same Row */}
            <div className="flex items-center gap-2 mb-3">
              {/* Grade Dropdown */}
              <select
                value={gradeValue}
                onChange={(e) => setGradeValue(Number(e.target.value))}
                className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
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
                className="w-20 px-3 py-2 border rounded text-center focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Add Button - Separate Row */}
            <button
              onClick={handleQuickAdd}
              disabled={countValue < 1}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
            >
              ⚡ הוסף
            </button>
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