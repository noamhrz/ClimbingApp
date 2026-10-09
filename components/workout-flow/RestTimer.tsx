'use client'

// Floating rest countdown above the action bar: progress, +15 s, skip.
// Vibrates when it ends (where the phone supports it), shows "let's go" briefly, then closes.

import { useEffect, useState } from 'react'
import { LuPlus, LuSkipForward, LuTimer } from 'react-icons/lu'

interface Props {
  endsAt: number      // ms timestamp
  total: number       // seconds, for the progress bar
  onAdd: (sec: number) => void
  onClose: () => void
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

export default function RestTimer({ endsAt, total, onAdd, onClose }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const done = left === 0

  useEffect(() => {
    if (!done) return
    try { navigator.vibrate?.([200, 100, 200]) } catch { /* not supported */ }
    const t = setTimeout(onClose, 2200)
    return () => clearTimeout(t)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.min(100, Math.max(0, ((total - left) / Math.max(1, total)) * 100))

  return (
    <div
      role="timer"
      aria-live="polite"
      className={`relative overflow-hidden rounded-2xl border px-3 py-2 flex items-center gap-3 ${
        done ? 'border-success bg-success/15' : 'border-line-strong bg-raised'
      }`}
    >
      <span aria-hidden className="absolute inset-y-0 right-0 bg-accent/12 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      <LuTimer aria-hidden className={`relative w-5 h-5 shrink-0 ${done ? 'text-success' : 'text-accent'}`} />
      <span className="relative flex-1 font-extrabold text-lg tabular-nums">
        {done ? 'יאללה, ממשיכים!' : <>מנוחה <span dir="ltr">{fmt(left)}</span></>}
      </span>
      {!done && (
        <>
          <button type="button" onClick={() => onAdd(15)} aria-label="הוסף 15 שניות" className="relative h-10 px-2.5 rounded-xl border border-line-strong bg-surface text-fg-2 text-sm font-bold flex items-center gap-1">
            <LuPlus aria-hidden className="w-4 h-4" />15
          </button>
          <button type="button" onClick={onClose} className="relative h-10 px-3 rounded-xl bg-fg text-bg text-sm font-extrabold flex items-center gap-1.5">
            <LuSkipForward aria-hidden className="w-4 h-4" />דלג
          </button>
        </>
      )}
    </div>
  )
}
