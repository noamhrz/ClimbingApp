import { useState } from 'react'
import { applyDeloading, clearDeloading } from '@/lib/calendarUtils'

interface DeloadingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  email: string
  mode: 'apply' | 'remove'
}

export default function DeloadingModal({
  isOpen,
  onClose,
  onSuccess,
  email,
  mode,
}: DeloadingModalProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [percentage, setPercentage] = useState(70)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!startDate || !endDate) {
      setError('יש למלא תאריך התחלה וסיום')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end < start) {
      setError('תאריך סיום חייב להיות אחרי תאריך התחלה')
      return
    }

    if (mode === 'apply' && (percentage < 1 || percentage > 100)) {
      setError('אחוז דילודינג חייב להיות בין 1 ל-100')
      return
    }

    setLoading(true)

    try {
      let result
      if (mode === 'apply') {
        result = await applyDeloading(email, start, end, percentage)
      } else {
        result = await clearDeloading(email, start, end)
      }

      if (result.success) {
        onSuccess()
        onClose()
        // Reset form
        setStartDate('')
        setEndDate('')
        setPercentage(70)
      } else {
        setError(result.error || 'שגיאה בעדכון')
      }
    } catch (err) {
      setError('שגיאה בעדכון')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-raised border border-line-strong rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-fg">
          {mode === 'apply' ? '🔵 החלת דילודינג' : '❌ הסרת דילודינג'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-fg-2 mb-1">
                תאריך התחלה
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-fg-2 mb-1">
                תאריך סיום
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            {/* Percentage - only for apply mode */}
            {mode === 'apply' && (
              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  אחוז ביצוע (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
                <p className="text-xs text-muted mt-1">
                  המתאמן יבצע רק {percentage}% מהסטים המתוכננים
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-danger/15 border border-danger text-danger px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Info message */}
            <div className="bg-accent/15 border border-accent text-accent px-4 py-2 rounded-lg text-sm">
              {mode === 'apply'
                ? `פעולה זו תעדכן את כל האימונים בין ${startDate || '___'} ל-${endDate || '___'}`
                : `פעולה זו תסיר את הדילודינג מכל האימונים בין ${startDate || '___'} ל-${endDate || '___'}`}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-line rounded-lg hover:bg-surface transition-colors"
              disabled={loading}
            >
              ביטול
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 rounded-lg text-on-accent transition-colors ${
 mode === 'apply'
 ? 'bg-accent hover:bg-accent-hover'
 : 'bg-danger hover:bg-danger/90'
 } disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={loading}
            >
              {loading ? '⌛ מעדכן...' : mode === 'apply' ? 'החל דילודינג' : 'הסר דילודינג'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
