// components/exercises/ExerciseAccordion.tsx
// ✨ UPDATED: Added isOpen/onToggle support while preserving all existing functionality

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
  // ✨ Goals from WorkoutsExercises
  Sets?: number | null
  Reps?: number | null
  Duration?: number | null
  Rest?: number | null
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
  exercise: Exercise & ExerciseFormData
  index: number
  onChange: (data: any) => void
  isOpen?: boolean      // ✨ NEW: Controlled state for Toggle Block
  onToggle?: () => void // ✨ NEW: Toggle handler for Toggle Block
}

export default function ExerciseAccordion({ 
  exercise, 
  index, 
  onChange,
  isOpen = false,    // ✨ NEW: Default to closed
  onToggle           // ✨ NEW: Optional toggle handler
}: Props) {
  // ✨ NEW: Use internal state only if onToggle is not provided (backward compatibility)
  const [localExpanded, setLocalExpanded] = useState(false)
  
  // ✨ NEW: Use controlled state if onToggle provided, otherwise use local state
  const isExpanded = onToggle ? isOpen : localExpanded
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded))

  const getSummary = () => {
    const parts: string[] = []
    
    if (exercise.IsSingleHand) {
      // Single Hand exercise
      if (exercise.isDuration) {
        if (exercise.DurationSec) parts.push(`ימין: ${exercise.DurationSec}שנ`)
        if (exercise.DurationSecLeft) parts.push(`שמאל: ${exercise.DurationSecLeft}שנ`)
      } else {
        if (exercise.RepsDone) parts.push(`ימין: ${exercise.RepsDone} חזרות`)
        if (exercise.RepsDoneLeft) parts.push(`שמאל: ${exercise.RepsDoneLeft} חזרות`)
      }
      if (exercise.WeightKG) parts.push(`${exercise.WeightKG}ק"ג`)
    } else {
      // Regular exercise
      if (exercise.isDuration) {
        if (exercise.DurationSec) parts.push(`${exercise.DurationSec}שנ`)
      } else {
        if (exercise.RepsDone) parts.push(`${exercise.RepsDone} חזרות`)
      }
      if (exercise.WeightKG) parts.push(`${exercise.WeightKG}ק"ג`)
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'לא הושלם'
  }

  // Check if exercise has goals
  const hasGoals = exercise.Sets || exercise.Reps || exercise.Duration || exercise.Rest

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Accordion Header */}
      <button
        onClick={handleToggle}
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

          {/* Exercise Goals Section - Minimalist */}
          {hasGoals && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                {exercise.Sets && (
                  <span>
                    <span className="font-medium">{exercise.Sets}</span> סטים
                  </span>
                )}
                {exercise.Reps && (
                  <span>
                    <span className="font-medium">{exercise.Reps}</span> חזרות
                  </span>
                )}
                {exercise.Duration && (
                  <span>
                    <span className="font-medium">{exercise.Duration}</span> שניות
                  </span>
                )}
                {exercise.Rest && (
                  <span className="text-gray-500">
                    מנוחה: <span className="font-medium">{exercise.Rest}</span> שנ׳
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Media Section */}
          {(exercise.ImageURL || exercise.VideoURL) && (
            <div className="mb-4 space-y-3">
              {/* Image - clickable! */}
              {exercise.ImageURL && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🖼️ תמונה להדגמה:
                  </label>
                  <a
                    href={exercise.ImageURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative group cursor-pointer"
                  >
                    <img 
                      src={exercise.ImageURL} 
                      alt={exercise.Name}
                      className="w-full max-w-md rounded-lg shadow-md border border-gray-200 group-hover:opacity-90 transition-opacity"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-lg flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white font-bold text-lg bg-blue-600 px-4 py-2 rounded-lg shadow-lg">
                        🔍 לחץ להגדלה
                      </span>
                    </div>
                  </a>
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
                    צפה בוידאו
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Exercise Form */}
          <ExerciseExecutionForm
            exercise={exercise}
            value={exercise}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  )
}