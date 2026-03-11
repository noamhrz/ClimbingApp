import { useEffect, useRef, useCallback } from 'react'

export function useFormDraft<T extends object>(
  key: string | null,
  formState: T,
  isReady: boolean,
  onRestore: (draft: T) => void,
  debounceMs = 2500
): { clearDraft: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoredRef = useRef(false)

  // Restore once when isReady flips to true
  useEffect(() => {
    if (!key || !isReady || restoredRef.current) return
    restoredRef.current = true

    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const draft = JSON.parse(raw) as T
        onRestore(draft)
      }
    } catch {
      // ignore corrupt JSON
    }
  }, [key, isReady, onRestore])

  // Auto-save with debounce
  useEffect(() => {
    if (!key || !isReady) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(formState))
      } catch {
        // ignore quota exceeded
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, isReady, formState, debounceMs])

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (key) {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
  }, [key])

  return { clearDraft }
}
