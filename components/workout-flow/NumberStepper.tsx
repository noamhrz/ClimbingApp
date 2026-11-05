'use client'

// Big number field with − / + buttons. One tap on the number selects all of it,
// so the next digit typed replaces the value.

import { useState } from 'react'
import { LuMinus, LuPlus } from 'react-icons/lu'

interface Props {
  id: string
  label: string
  unit?: string
  value: number | null | undefined
  placeholder?: number | null   // shown greyed when empty (last time / target)
  step: number
  min?: number
  /** allow values below zero (weight: assistance, e.g. a band on pull-ups): − goes past 0, and a ± toggle flips the sign */
  negative?: { label: string; hint: string }
  /** shown under an empty field that has a suggestion, e.g. "יישמר כך בסיום הסט" */
  suggestNote?: string
  onChange: (v: number | null) => void
}

function selectAll(el: HTMLInputElement) {
  const sel = () => { try { el.setSelectionRange(0, el.value.length) } catch { el.select() } }
  sel(); requestAnimationFrame(sel); setTimeout(sel, 60)
}

const fmt = (v: number | null | undefined) => (v == null ? '' : String(v))

export default function NumberStepper({ id, label, unit, value, placeholder, step, min = 0, negative, suggestNote, onChange }: Props) {
  // local text so "12." or "2," can be typed before it is a number
  const [text, setText] = useState(fmt(value))
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    // value changed from outside (+/−, "same as last time"): show it, unless the text already means it
    setSeen(value)
    if (!(text !== '' && Number(text.replace(',', '.')) === value)) setText(fmt(value))
  }

  const base = value ?? placeholder ?? 0
  const bump = (d: number) => {
    const next = Math.max(min, Math.round((base + d) * 100) / 100)
    onChange(next)
    try { navigator.vibrate?.(8) } catch { /* not supported */ }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[15px] font-bold text-fg-2">
          {label} {unit && <span className="font-normal text-muted">{unit}</span>}
        </label>
        {negative && (
          // phone number pads have no minus key: flip the sign here
          <button
            type="button"
            aria-pressed={(value ?? 0) < 0}
            onClick={() => {
              const v = value ?? placeholder ?? 0
              onChange(v === 0 ? -step : -v)
            }}
            className={`h-8 px-3 rounded-full border text-sm font-bold ${(value ?? 0) < 0 ? 'border-info text-info bg-info/15' : 'border-line-strong text-fg-3'}`}
          >
            {negative.label}
          </button>
        )}
      </div>
      <div dir="ltr" className="flex gap-2 h-16">
        <button
          type="button"
          aria-label={`הפחת ${label}`}
          onClick={() => bump(-step)}
          className="w-16 rounded-2xl border border-line-strong bg-raised text-fg grid place-items-center active:scale-95"
        >
          <LuMinus aria-hidden className="w-6 h-6" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          placeholder={placeholder != null ? String(placeholder) : '0'}
          onFocus={e => selectAll(e.currentTarget)}
          onClick={e => selectAll(e.currentTarget)}
          onMouseUp={e => e.preventDefault()}
          onChange={e => {
            const raw = e.target.value.replace(/[^0-9.,-]/g, '')
            setText(raw)
            const n = parseFloat(raw.replace(',', '.'))
            onChange(raw === '' || isNaN(n) ? null : n)
          }}
          className="flex-1 min-w-0 rounded-2xl border-2 border-line-strong bg-surface text-fg text-center text-[34px] font-extrabold tabular-nums placeholder:text-[#8A8379] focus:outline-none focus:border-accent"
        />
        <button
          type="button"
          aria-label={`הוסף ${label}`}
          onClick={() => bump(step)}
          className="w-16 rounded-2xl bg-accent text-on-accent grid place-items-center active:scale-95"
        >
          <LuPlus aria-hidden className="w-6 h-6" />
        </button>
      </div>
      {suggestNote && value == null && placeholder != null && (
        <p className="text-[13px] text-muted">{suggestNote}</p>
      )}
      {negative && (value ?? 0) < 0 && (
        <p className="text-sm text-info">{negative.hint}</p>
      )}
    </div>
  )
}
