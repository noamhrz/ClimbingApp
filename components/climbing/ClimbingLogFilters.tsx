// components/climbing/ClimbingLogFilters.tsx
'use client'

import { BoulderGrade, LeadGrade } from '@/types/climbing'

export interface ClimbingLogFilters {
  startDate: string
  endDate: string
  climbType: 'Lead' | 'BoulderBoard'
  minGradeId: number | null
  maxGradeId: number | null
}

interface Props {
  filters: ClimbingLogFilters
  onChange: (filters: ClimbingLogFilters) => void
  boulderGrades: BoulderGrade[]
  leadGrades: LeadGrade[]
}

export default function ClimbingLogFilters({ filters, onChange, boulderGrades, leadGrades }: Props) {
  const handleChange = (key: keyof ClimbingLogFilters, value: any) => {
    console.log('🔧 handleChange called:', key, '=', value)
    const newFilters = { ...filters, [key]: value }
    console.log('🔧 New filters:', newFilters)
    onChange(newFilters)
  }

  // Get grades based on selected climb type
  const relevantGrades = 
    filters.climbType === 'Lead' 
      ? leadGrades 
      : boulderGrades

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="font-bold mb-4">🔍 סינונים</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium mb-1">מתאריך</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium mb-1">עד תאריך</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {/* Climb Type */}
        <div>
          <label className="block text-sm font-medium mb-1">סוג טיפוס</label>
          <select
            value={filters.climbType}
            onChange={(e) => {
              const newType = e.target.value as 'Lead' | 'BoulderBoard'
              console.log('🔄 Filter changed from', filters.climbType, 'to', newType)
              // Update all at once to avoid race condition
              onChange({
                ...filters,
                climbType: newType,
                minGradeId: null,
                maxGradeId: null,
              })
            }}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="BoulderBoard">🪨 בולדר + בורד</option>
            <option value="Lead">🧗 הובלה (Lead)</option>
          </select>
        </div>

        {/* Min Grade */}
        <div>
          <label className="block text-sm font-medium mb-1">דירוג מינימלי</label>
          <select
            value={filters.minGradeId || ''}
            onChange={(e) => handleChange('minGradeId', e.target.value ? Number(e.target.value) : null)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">הכל</option>
            {relevantGrades.map((grade) => {
              const id = 'LeadGradeID' in grade ? grade.LeadGradeID : grade.BoulderGradeID
              const label = 'FrenchGrade' in grade 
                ? `${grade.FrenchGrade} (${grade.YosemiteGrade})`
                : `${grade.VGrade} (${grade.FontGrade})`
              return (
                <option key={id} value={id}>
                  {label}
                </option>
              )
            })}
          </select>
        </div>

        {/* Max Grade */}
        <div>
          <label className="block text-sm font-medium mb-1">דירוג מקסימלי</label>
          <select
            value={filters.maxGradeId || ''}
            onChange={(e) => handleChange('maxGradeId', e.target.value ? Number(e.target.value) : null)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">הכל</option>
            {relevantGrades.map((grade) => {
              const id = 'LeadGradeID' in grade ? grade.LeadGradeID : grade.BoulderGradeID
              const label = 'FrenchGrade' in grade 
                ? `${grade.FrenchGrade} (${grade.YosemiteGrade})`
                : `${grade.VGrade} (${grade.FontGrade})`
              return (
                <option key={id} value={id}>
                  {label}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Reset Button */}
      <div className="mt-4">
        <button
          onClick={() => {
            onChange({
              startDate: '',
              endDate: '', // Show all dates
              climbType: 'BoulderBoard',
              minGradeId: null,
              maxGradeId: null,
            })
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          🔄 איפוס סינונים
        </button>
      </div>
    </div>
  )
}