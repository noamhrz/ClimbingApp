// components/exercises/ExerciseAccordion.tsx
// ✨ Accordion wrapper for ExerciseExecutionForm with media display

'use client'

import { useState } from 'react'
import ExerciseExecutionForm from './ExerciseExecutionForm'

interface Exercise {
  ExerciseID: number
  Name: string
  Description?: string
  IsSingleHand: boolean
  isDuration: boolean
  ImageURL?: string | null
  VideoURL?: string | null
}

interface ExerciseFormData {
  RepsDone?: number | null
  DurationSec?: number | null
  WeightKG?: number | null
  RPE?: number | null
  Notes?: string
  RepsDoneLeft?: number | null
  DurationSecLeft?: number | null
  WeightKGLeft?: number | null
  RPELeft?: number | null
  NotesLeft?: string
}

interface Props {
  exercise: Exercise
  value: ExerciseFormData
  onChange: (data: ExerciseFormData) => void
  index: number
  disabled?: boolean
}

export default function ExerciseAccordion({ exercise, value, onChange, index, disabled = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed by default

  // Calculate summary text
  const getSummary = () => {
    const parts: string[] = []
    
    if (exercise.IsSingleHand) {
      // Single hand exercise
      if (exercise.isDuration) {
        if (value.DurationSec) parts.push(`ימין: ${value.DurationSec}s`)
        if (value.DurationSecLeft) parts.push(`שמאל: ${value.DurationSecLeft}s`)
      } else {
        if (value.RepsDone) parts.push(`ימין: ${value.RepsDone} חזרות`)
        if (value.RepsDoneLeft) parts.push(`שמאל: ${value.RepsDoneLeft} חזרות`)
      }
    } else {
      // Regular exercise
      if (exercise.isDuration && value.DurationSec) {
        parts.push(`${value.DurationSec}s`)
      } else if (value.RepsDone) {
        parts.push(`${value.RepsDone} חזרות`)
      }
      
      if (value.WeightKG) {
        parts.push(`${value.WeightKG}kg`)
      }
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'לא הושלם'
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-right">
          <span className="text-lg font-medium text-gray-900">
            {index + 1}. {exercise.Name}
          </span>
          {!isExpanded && (
            <span className="text-sm text-gray-500">
              {getSummary()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Media indicators when collapsed */}
          {!isExpanded && (
            <>
              {exercise.ImageURL && (
                <span className="text-blue-500 text-sm">🖼️</span>
              )}
              {exercise.VideoURL && (
                <span className="text-blue-500 text-sm">🎥</span>
              )}
            </>
          )}
          
          {/* Expand/Collapse icon */}
          <span className="text-gray-400 text-xl">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-gray-100">
          {/* Description */}
          {exercise.Description && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">{exercise.Description}</p>
            </div>
          )}

          {/* Media Section */}
          {(exercise.ImageURL || exercise.VideoURL) && (
            <div className="mb-4 space-y-3">
              {/* Image */}
              {exercise.ImageURL && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🖼️ תמונה להדגמה:
                  </label>
                  <img 
                    src={exercise.ImageURL} 
                    alt={exercise.Name}
                    className="w-full max-w-md rounded-lg shadow-md border border-gray-200"
                  />
                </div>
              )}

              {/* Video Link */}
              {exercise.VideoURL && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎥 וידאו הדגמה:
                  </label>
                  <a
                    href={exercise.VideoURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <span>▶️</span>
                    <span>צפה בוידאו</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Exercise Form */}
          <ExerciseExecutionForm
            exercise={exercise}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}