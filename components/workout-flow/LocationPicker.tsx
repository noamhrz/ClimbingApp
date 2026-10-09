'use client'

// Location picker with search: a button that opens a bottom sheet with a search field
// (filters as you type) and the matching locations; "+ new location" at the end,
// pre-filled with what was typed.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuCheck, LuMapPin, LuPlus, LuSearch, LuX } from 'react-icons/lu'

export interface PickerLocation { LocationID: number; LocationName: string }

interface Props {
  id?: string
  locations: PickerLocation[]
  value: number | null
  onChange: (id: number) => void
  onAddNew: (name: string) => void
  placeholder?: string
  tone?: 'normal' | 'missing' | 'large'
}

// Hebrew-friendly matching: ignore case, quotes and dashes; match any word prefix or substring
const norm = (s: string) => s.toLowerCase().replace(/["'׳״\-–_.]/g, '').replace(/\s+/g, ' ').trim()

export default function LocationPicker({ id, locations, value, onChange, onAddNew, placeholder = 'בחר מיקום', tone = 'normal' }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const current = locations.find(l => l.LocationID === value)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => input.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [open])

  const nq = norm(q)
  const matches = nq
    ? locations
        .filter(l => norm(l.LocationName).includes(nq))
        .sort((a, b) => Number(!norm(b.LocationName).startsWith(nq)) - Number(!norm(a.LocationName).startsWith(nq)))
    : locations

  const pick = (lid: number) => { onChange(lid); setOpen(false); setQ('') }

  const btnCls = tone === 'missing'
    ? 'border-danger text-danger'
    : 'border-line-strong text-fg'

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 rounded-xl border bg-surface min-w-0 ${btnCls} ${
          tone === 'large' ? 'h-12 px-3 w-full text-base font-bold border-2' : 'h-11 px-3 max-w-[60%] text-[15px] font-bold'
        }`}
      >
        <LuMapPin aria-hidden className="w-[18px] h-[18px] shrink-0" />
        <span className="truncate">{current?.LocationName ?? placeholder}</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[96] bg-black/55 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div role="dialog" data-flow aria-modal="true" aria-labelledby="loc-title" dir="rtl" className="w-full max-w-[520px] h-[80vh] bg-raised border-t border-line-strong rounded-t-[20px] flex flex-col">
            <div className="px-4 pt-2.5 pb-3 flex flex-col gap-3 border-b border-line">
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto" />
              <div className="flex items-center justify-between">
                <h2 id="loc-title" className="text-xl font-extrabold">איפה טיפסת?</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label="סגירה" className="w-10 h-10 rounded-xl grid place-items-center text-fg-2">
                  <LuX aria-hidden className="w-5 h-5" />
                </button>
              </div>
              <label className="flex items-center gap-2 h-12 rounded-xl border-2 border-line-strong bg-surface px-3 focus-within:border-accent">
                <LuSearch aria-hidden className="w-5 h-5 text-muted shrink-0" />
                <input
                  ref={input}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && matches[0]) pick(matches[0].LocationID) }}
                  placeholder="חיפוש מיקום"
                  aria-label="חיפוש מיקום"
                  autoComplete="off"
                  enterKeyHint="search"
                  className="flex-1 min-w-0 bg-transparent text-fg text-[17px] focus:outline-none focus-visible:outline-none"
                />
                {q && (
                  <button type="button" onClick={() => setQ('')} aria-label="נקה חיפוש" className="text-faint"><LuX aria-hidden className="w-4 h-4" /></button>
                )}
              </label>
            </div>
            <ul className="flex-1 overflow-y-auto overscroll-contain px-2 py-2" role="listbox" aria-label="מיקומים">
              {matches.map(l => (
                <li key={l.LocationID}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={l.LocationID === value}
                    onClick={() => pick(l.LocationID)}
                    className={`w-full min-h-12 px-3 rounded-xl flex items-center justify-between text-right text-base ${
                      l.LocationID === value ? 'bg-accent/15 text-accent font-bold' : 'text-fg hover:bg-surface'
                    }`}
                  >
                    {l.LocationName}
                    {l.LocationID === value && <LuCheck aria-hidden className="w-5 h-5" />}
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="px-3 py-4 text-muted text-[15px]">לא נמצא מיקום בשם הזה.</li>
              )}
            </ul>
            <div className="px-4 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))] border-t border-line">
              <button
                type="button"
                onClick={() => { setOpen(false); onAddNew(q.trim()); setQ('') }}
                className="w-full h-12 rounded-xl border border-dashed border-line-strong text-fg-2 font-bold flex items-center justify-center gap-2"
              >
                <LuPlus aria-hidden className="w-5 h-5" />{q.trim() ? `הוסף מיקום חדש: ${q.trim()}` : 'הוסף מיקום חדש'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
