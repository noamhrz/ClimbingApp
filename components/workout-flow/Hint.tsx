'use client'

// Gentle usage hints: a small, quiet line with a close button.
// Each hint shows on its first few appearances only (per device), and never again once closed.

import { ReactNode, useEffect, useState } from 'react'
import { LuLightbulb, LuX } from 'react-icons/lu'

const PREFIX = 'mw-hint-'

export function hintCount(id: string): number {
  try { return Number(localStorage.getItem(PREFIX + id) || 0) } catch { return 0 }
}
export function setHintCount(id: string, n: number) {
  try { localStorage.setItem(PREFIX + id, String(n)) } catch { /* storage unavailable */ }
}

export default function Hint({ id, max = 3, children, className = '' }: {
  id: string
  max?: number
  children: ReactNode
  className?: string
}) {
  // these steps render only on the client, after the workout has loaded
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && hintCount(id) < max)

  // count one appearance per mount
  useEffect(() => {
    if (visible) setHintCount(id, hintCount(id) + 1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-line bg-surface/70 px-3 py-2 text-[13px] leading-relaxed text-fg-3 ${className}`}>
      <LuLightbulb aria-hidden className="w-4 h-4 mt-0.5 shrink-0 text-accent/80" />
      <span className="flex-1">{children}</span>
      <button
        type="button"
        aria-label="הסתר רמז"
        onClick={() => { setHintCount(id, 99); setVisible(false) }}
        className="-m-1.5 p-1.5 text-faint hover:text-fg-2 shrink-0"
      >
        <LuX aria-hidden className="w-4 h-4" />
      </button>
    </div>
  )
}
