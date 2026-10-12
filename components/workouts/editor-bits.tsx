'use client'

// Small shared pieces of the workout / dynamic-exercise editors.

import { useState, useSyncExternalStore } from 'react'

// md breakpoint, read without an effect (server render = phone)
const mq = () => window.matchMedia('(min-width: 768px)')
export function useIsDesktop() {
  return useSyncExternalStore(
    cb => { const m = mq(); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => mq().matches,
    () => false,
  )
}

// Small number field for the desktop rows: keeps its own text so it can be emptied while typing
export function InlineNum({ label, value, min = 0, onChange }: { label: string; value: number; min?: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value))
  const [seen, setSeen] = useState(value)
  if (value !== seen) { setSeen(value); if (Number(text) !== value) setText(String(value)) }
  return (
    <label className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-muted">
      {label}
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onFocus={e => e.currentTarget.select()}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9]/g, '')
          setText(raw)
          if (raw !== '') onChange(Math.max(min, Number(raw)))
        }}
        onBlur={() => { if (text === '' || Number(text) < min) { setText(String(Math.max(min, value))); onChange(Math.max(min, value)) } }}
        className="w-16 h-9 rounded-lg border-2 border-line-strong bg-raised text-fg text-center text-base font-extrabold tabular-nums focus:outline-none focus:border-accent"
      />
    </label>
  )
}

