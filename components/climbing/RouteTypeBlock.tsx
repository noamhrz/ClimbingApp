// components/climbing/RouteTypeBlock.tsx

'use client'

import { useState } from 'react'
import { ClimbingRoute, BoulderGrade, LeadGrade } from '@/types/climbing'
import { RouteTable } from './RouteTable'
import { generateTempId, getGradeDisplay } from '@/lib/climbing-helpers'

interface RouteTypeBlockProps {
  type: 'Boulder' | 'Board' | 'Lead'
  icon: string
  routes: ClimbingRoute[]
  onRoutesChange: (routes: ClimbingRoute[]) => void
  boulderGrades: BoulderGrade[]
  leadGrades: LeadGrade[]
}

export function RouteTypeBlock({
  type,
  icon,
  routes,
  onRoutesChange,
  boulderGrades,
  leadGrades
}: RouteTypeBlockProps) {
  const isLead = type === 'Lead'
  
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
        <h3 className="font-bold text-lg">
          {icon} {type} ({routes.length} מסלולים)
        </h3>
      </div>
      
      {/* Quick Add */}
      <div className="p-4 bg-blue-50 border-b flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">🚀 הוספה מהירה:</span>
        
        {/* Grade Dropdown */}
        <select
          value={gradeValue}
          onChange={(e) => setGradeValue(Number(e.target.value))}
          className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
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
        
        <span className="text-lg">×</span>
        
        {/* Count Input */}
        <input
          type="number"
          value={countValue}
          onChange={(e) => setCountValue(Number(e.target.value))}
          min="1"
          max="50"
          className="w-20 px-3 py-2 border rounded text-center focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Add Button */}
        <button
          onClick={handleQuickAdd}
          disabled={countValue < 1}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
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
    </div>
  )
}
