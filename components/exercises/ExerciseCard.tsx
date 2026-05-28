// components/exercises/ExerciseCard.tsx
// MINIMAL CHANGE: Only add duplicate button

'use client'

import { Exercise } from '@/types/exercises'

interface Props {
  exercise: Exercise
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onOpenDynamicEditor?: () => void
}

export default function ExerciseCard({ exercise, canEdit, onEdit, onDelete, onDuplicate, onOpenDynamicEditor }: Props) {
  // Helper function to get emoji by category
  const getCategoryEmoji = (category: string): string => {
    switch (category) {
      case 'Pull':
        return '⬆️'
      case 'Push':
        return '⬇️'
      case 'Core Stability':
        return '🎯'
      case 'Squat':
        return '🦵'
      case 'Hinge':
        return '🏋️'
      case 'Campus':
        return '🧗'
      case 'Hangboard':
        return '🤚'
      case 'Grip / Hangboard':
        return '🤚'
      case 'Shoulder':
        return '💪'
      case 'Other':
        return '💪'
      default:
        return '💪'
    }
  }

  const emoji = getCategoryEmoji(exercise.Category)

  return (
    <div className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition p-4 ${
      exercise.Status === 'Inactive' ? 'opacity-60' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{emoji}</span>
            <h3 className="font-bold text-lg text-gray-900 leading-tight">
              {exercise.Name}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
              {exercise.Category}
            </span>
            {exercise.isDuration && (
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                ⏱️ זמן
              </span>
            )}
            {exercise.is_dynamic && (
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                🧩 דינמי
              </span>
            )}
            {exercise.Status === 'Inactive' && (
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                לא פעיל
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {exercise.IsSingleHand && (
            <span className="text-xl ml-2" title="תרגיל יד אחת">🖐️</span>
          )}
          {exercise.isDuration && (
            <span className="text-xl" title="תרגיל מבוסס זמן">⏱️</span>
          )}
        </div>
      </div>

      {/* Description */}
      {exercise.Description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-3">
          {exercise.Description}
        </p>
      )}

      {/* Links */}
      {(exercise.VideoURL || exercise.ImageURL) && (
        <div className="flex gap-2 mb-3">
          {exercise.VideoURL && (
            <a
              href={exercise.VideoURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>📹</span>
              <span>וידאו</span>
            </a>
          )}
          {exercise.ImageURL && (
            <a
              href={exercise.ImageURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>🖼️</span>
              <span>תמונה</span>
            </a>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div className="text-xs text-gray-500">
          {exercise.CreatedBy ? (
            <span title={exercise.CreatedBy}>
              👤 {exercise.CreatedBy.split('@')[0]}
            </span>
          ) : (
            <span>👤 מערכת</span>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {exercise.is_dynamic && onOpenDynamicEditor && (
              <button
                onClick={onOpenDynamicEditor}
                className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition font-medium"
              >
                🧩 עורך דינמי
              </button>
            )}
            <button
              onClick={onEdit}
              className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition font-medium"
            >
              ✏️ ערוך
            </button>
            <button
              onClick={onDuplicate}
              className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition font-medium"
              title="שכפל תרגיל"
            >
              📋
            </button>
            <button
              onClick={onDelete}
              className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition font-medium"
            >
              🗑️ מחק
            </button>
          </div>
        )}
      </div>
    </div>
  )
}