// components/exercises/ExerciseExecutionForm.tsx
// ✨ FIXED VERSION - Removed Completed checkboxes (auto-set to true on save)

'use client'

import { useState } from 'react'

interface Exercise {
  ExerciseID: number
  Name: string
  Description?: string
  IsSingleHand: boolean
  isDuration: boolean
}

interface ExerciseFormData {
  // Regular or Right hand
  RepsDone?: number | null
  DurationSec?: number | null
  WeightKG?: number | null
  RPE?: number | null
  Notes?: string
  
  // Left hand (for single hand exercises)
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
  disabled?: boolean
}

export default function ExerciseExecutionForm({ exercise, value, onChange, disabled = false }: Props) {
  const { IsSingleHand, isDuration } = exercise

  // Handle regular field change
  const handleChange = (field: keyof ExerciseFormData, val: any) => {
    onChange({ ...value, [field]: val })
  }

  // Render regular exercise (not single hand)
  const renderRegular = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Reps or Duration */}
        {isDuration ? (
          <div>
            <label className="block text-xs text-gray-600 mb-1">⏱️ זמן (שניות)</label>
            <input
              type="number"
              min="0"
              value={value.DurationSec ?? ''}
              onChange={(e) => handleChange('DurationSec', e.target.value ? Number(e.target.value) : null)}
              placeholder="שניות"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-600 mb-1">🔢 חזרות</label>
            <input
              type="number"
              min="0"
              value={value.RepsDone ?? ''}
              onChange={(e) => handleChange('RepsDone', e.target.value ? Number(e.target.value) : null)}
              placeholder="חזרות"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
        )}

        {/* Weight */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">⚖️ משקל (ק״ג)</label>
          <input
            type="number"
            step="0.5"
            value={value.WeightKG ?? ''}
            onChange={(e) => handleChange('WeightKG', e.target.value ? Number(e.target.value) : null)}
            placeholder="משקל"
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* RPE */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">💪 RPE (1-10)</label>
          <input
            type="number"
            min="1"
            max="10"
            value={value.RPE ?? ''}
            onChange={(e) => handleChange('RPE', e.target.value ? Number(e.target.value) : null)}
            placeholder="RPE"
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">📝 הערות</label>
        <textarea
          value={value.Notes ?? ''}
          onChange={(e) => handleChange('Notes', e.target.value)}
          placeholder="הערות..."
          rows={2}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-sm"
        />
      </div>
    </div>
  )

  // Render single hand exercise
  const renderSingleHand = () => (
    <div className="space-y-4">
      {/* Right Hand */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span className="text-xl">🫱</span>
          <span>יד ימין</span>
        </h4>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Reps or Duration - Right */}
            {isDuration ? (
              <div>
                <label className="block text-xs text-gray-600 mb-1">⏱️ זמן (שניות)</label>
                <input
                  type="number"
                  min="0"
                  value={value.DurationSec ?? ''}
                  onChange={(e) => handleChange('DurationSec', e.target.value ? Number(e.target.value) : null)}
                  placeholder="שניות"
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-600 mb-1">🔢 חזרות</label>
                <input
                  type="number"
                  min="0"
                  value={value.RepsDone ?? ''}
                  onChange={(e) => handleChange('RepsDone', e.target.value ? Number(e.target.value) : null)}
                  placeholder="חזרות"
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            )}

            {/* Weight - Right */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">⚖️ משקל</label>
              <input
                type="number"
                step="0.5"
                value={value.WeightKG ?? ''}
                onChange={(e) => handleChange('WeightKG', e.target.value ? Number(e.target.value) : null)}
                placeholder="משקל"
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* RPE - Right */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">💪 RPE</label>
              <input
                type="number"
                min="1"
                max="10"
                value={value.RPE ?? ''}
                onChange={(e) => handleChange('RPE', e.target.value ? Number(e.target.value) : null)}
                placeholder="RPE"
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Notes - Right */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">📝 הערות</label>
            <textarea
              value={value.Notes ?? ''}
              onChange={(e) => handleChange('Notes', e.target.value)}
              placeholder="הערות..."
              rows={2}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Left Hand */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
          <span className="text-xl">🫲</span>
          <span>יד שמאל</span>
        </h4>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Reps or Duration - Left */}
            {isDuration ? (
              <div>
                <label className="block text-xs text-gray-600 mb-1">⏱️ זמן (שניות)</label>
                <input
                  type="number"
                  min="0"
                  value={value.DurationSecLeft ?? ''}
                  onChange={(e) => handleChange('DurationSecLeft', e.target.value ? Number(e.target.value) : null)}
                  placeholder="שניות"
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-600 mb-1">🔢 חזרות</label>
                <input
                  type="number"
                  min="0"
                  value={value.RepsDoneLeft ?? ''}
                  onChange={(e) => handleChange('RepsDoneLeft', e.target.value ? Number(e.target.value) : null)}
                  placeholder="חזרות"
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                />
              </div>
            )}

            {/* Weight - Left */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">⚖️ משקל</label>
              <input
                type="number"
                step="0.5"
                value={value.WeightKGLeft ?? ''}
                onChange={(e) => handleChange('WeightKGLeft', e.target.value ? Number(e.target.value) : null)}
                placeholder="משקל"
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
              />
            </div>

            {/* RPE - Left */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">💪 RPE</label>
              <input
                type="number"
                min="1"
                max="10"
                value={value.RPELeft ?? ''}
                onChange={(e) => handleChange('RPELeft', e.target.value ? Number(e.target.value) : null)}
                placeholder="RPE"
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Notes - Left */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">📝 הערות</label>
            <textarea
              value={value.NotesLeft ?? ''}
              onChange={(e) => handleChange('NotesLeft', e.target.value)}
              placeholder="הערות..."
              rows={2}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">
            {IsSingleHand ? '🖐️' : isDuration ? '⏱️' : '💪'}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">{exercise.Name}</h3>
            {exercise.Description && (
              <p className="text-sm text-gray-600 mt-1">{exercise.Description}</p>
            )}
            <div className="flex gap-2 mt-2">
              {IsSingleHand && (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                  🖐️ יד אחת
                </span>
              )}
              {isDuration && (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                  ⏱️ זמן
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {IsSingleHand ? renderSingleHand() : renderRegular()}
    </div>
  )
}