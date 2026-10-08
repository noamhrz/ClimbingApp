'use client'

// One exercise per screen: targets, last time, big steppers, RPE buttons, note.
// Works on the same exercise form fields the workout page saves
// (RepsDone / DurationSec / WeightKG / RPE / Notes, and the *Left fields for single-hand).

import { useState } from 'react'
import { LuCopy, LuImage, LuPlay } from 'react-icons/lu'
import NumberStepper from './NumberStepper'

export interface LastValues {
  date: string | null
  RepsDone?: number | null; DurationSec?: number | null; WeightKG?: number | null; RPE?: number | null
  RepsDoneLeft?: number | null; DurationSecLeft?: number | null; WeightKGLeft?: number | null; RPELeft?: number | null
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  exercise: any
  position: { n: number; of: number }
  last?: LastValues
  onChange: (data: Record<string, any>) => void
}

const n = (v: unknown) => (v == null || v === '' ? null : Number(v))

export function sideSummary(o: any, left: boolean, isDuration: boolean): string | null {
  const s = left ? 'Left' : ''
  const p = n(o[(isDuration ? 'DurationSec' : 'RepsDone') + s])
  if (p == null) return null
  const w = n(o['WeightKG' + s]), r = n(o['RPE' + s])
  return (isDuration ? `${p} שנ׳` : `${p} חזרות`) + (w ? ` · ${w} ק״ג` : '') + (r ? ` · RPE ${r}` : '')
}

export function exerciseSummary(o: any): string | null {
  if (o.IsSingleHand) {
    const a = sideSummary(o, false, o.isDuration), b = sideSummary(o, true, o.isDuration)
    return a || b ? `ימין ${a ?? '–'}  |  שמאל ${b ?? '–'}` : null
  }
  return sideSummary(o, false, o.isDuration)
}

export default function ExerciseStep({ exercise: ex, position, last, onChange }: Props) {
  const [side, setSide] = useState<'R' | 'L'>('R')
  const [noteOpen, setNoteOpen] = useState(false)
  const single = !!ex.IsSingleHand
  const s = single && side === 'L' ? 'Left' : ''
  const primKey = (ex.isDuration ? 'DurationSec' : 'RepsDone') + s
  const target = ex.isDuration ? n(ex.Duration) : n(ex.Reps)

  const lastText = last ? exerciseSummary({ ...last, IsSingleHand: single, isDuration: ex.isDuration }) : null
  const noteKey = 'Notes' + s
  const showNote = noteOpen || !!ex[noteKey]

  const targets: string[] = []
  if (ex.Sets) targets.push(`${ex.Sets} סטים`)
  if (ex.Reps) targets.push(`${ex.Reps} חזרות`)
  if (ex.Duration) targets.push(`${ex.Duration} שנ׳`)
  if (ex.Rest) targets.push(`מנוחה ${ex.Rest} שנ׳`)

  const copyLast = () => {
    if (!last) return
    const keys = ['RepsDone', 'DurationSec', 'WeightKG', 'RPE', 'RepsDoneLeft', 'DurationSecLeft', 'WeightKGLeft', 'RPELeft'] as const
    const o: Record<string, number | null> = {}
    for (const k of keys) if (last[k] != null) o[k] = last[k] as number
    onChange(o)
  }
  const sameAsRight = () => onChange({
    RepsDoneLeft: ex.RepsDone ?? null, DurationSecLeft: ex.DurationSec ?? null,
    WeightKGLeft: ex.WeightKG ?? null, RPELeft: ex.RPE ?? null,
  })

  const rpeKey = 'RPE' + s
  const rightDone = !!sideSummary(ex, false, ex.isDuration)
  const leftDone = !!sideSummary(ex, true, ex.isDuration)

  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold text-accent bg-accent/15 px-2.5 py-0.5 rounded-full">בלוק {ex.Block || 1}</span>
          {single && <span className="text-[13px] font-bold text-info bg-info/15 px-2.5 py-0.5 rounded-full">יד אחת</span>}
          <span className="text-[13px] text-muted">תרגיל {position.n} מתוך {position.of}</span>
        </div>
        <h2 className="text-[28px] leading-tight font-extrabold text-balance">{ex.Name}</h2>
        {targets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {targets.map(t => (
              <span key={t} className="text-[15px] font-semibold text-fg-2 bg-raised border border-line px-3 py-1 rounded-[10px]">{t}</span>
            ))}
          </div>
        )}
        {ex.Description && <p className="text-[15px] text-fg-3 leading-relaxed whitespace-pre-wrap">{ex.Description}</p>}
      </div>

      {lastText && (
        <div className="flex items-center justify-between gap-2.5 bg-surface border border-line rounded-2xl px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs text-muted">בפעם הקודמת{last?.date ? ` · ${last.date}` : ''}</p>
            <p className="text-[15px] font-bold">{lastText}</p>
          </div>
          <button
            type="button"
            onClick={copyLast}
            className="shrink-0 h-11 px-3.5 rounded-xl border border-line-strong bg-raised text-fg text-sm font-bold flex items-center gap-1.5"
          >
            <LuCopy aria-hidden className="w-4 h-4" />אותו דבר
          </button>
        </div>
      )}

      {single && (
        <div className="flex gap-2 items-center">
          <div className="flex-1 grid grid-cols-2 gap-1 bg-surface border border-line rounded-2xl p-1" role="group" aria-label="יד">
            {(['R', 'L'] as const).map(k => (
              <button
                key={k}
                type="button"
                aria-pressed={side === k}
                onClick={() => { setSide(k); setNoteOpen(false) }}
                className={`h-11 rounded-xl text-base font-extrabold ${side === k ? 'bg-accent text-on-accent' : 'text-fg-2'}`}
              >
                {k === 'R' ? 'ימין' : 'שמאל'} {(k === 'R' ? rightDone : leftDone) ? '✓' : ''}
              </button>
            ))}
          </div>
          {side === 'L' && rightDone && (
            <button type="button" onClick={sameAsRight} className="h-[52px] px-3 rounded-2xl border border-line-strong bg-raised text-fg text-sm font-bold">
              כמו ימין
            </button>
          )}
        </div>
      )}

      <NumberStepper
        key={primKey}
        id={`ex-${ex.ExerciseID}-${primKey}`}
        label={ex.isDuration ? 'זמן' : 'חזרות'}
        unit={ex.isDuration ? 'שניות' : undefined}
        value={n(ex[primKey])}
        placeholder={n(last?.[primKey as keyof LastValues]) ?? target}
        step={ex.isDuration ? 5 : 1}
        onChange={v => onChange({ [primKey]: v })}
      />
      <NumberStepper
        key={'WeightKG' + s}
        id={`ex-${ex.ExerciseID}-WeightKG${s}`}
        label="משקל"
        unit="ק״ג"
        value={n(ex['WeightKG' + s])}
        placeholder={n(last?.[('WeightKG' + s) as keyof LastValues])}
        step={2.5}
        onChange={v => onChange({ ['WeightKG' + s]: v })}
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-bold text-fg-2">מאמץ <span className="font-normal text-muted">RPE 1–10</span></p>
        <div dir="ltr" className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => {
            const on = n(ex[rpeKey]) === k
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ [rpeKey]: on ? null : k })}
                className={`h-[46px] rounded-xl text-lg font-extrabold ${on ? 'bg-accent text-on-accent' : 'bg-surface border border-line-strong text-fg-2'}`}
              >
                {k}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {!showNote && (
          <button type="button" onClick={() => setNoteOpen(true)} className="flex-1 min-w-[10rem] h-[46px] rounded-xl border border-dashed border-line-strong text-fg-3 text-[15px] font-semibold">
            + הערה לתרגיל
          </button>
        )}
        {ex.VideoURL && (
          <a href={ex.VideoURL} target="_blank" rel="noopener noreferrer" className="h-[46px] px-3.5 rounded-xl border border-line bg-surface text-fg-3 text-[15px] font-semibold flex items-center gap-1.5">
            <LuPlay aria-hidden className="w-4 h-4" />וידאו
          </a>
        )}
        {ex.ImageURL && (
          <a href={ex.ImageURL} target="_blank" rel="noopener noreferrer" className="h-[46px] px-3.5 rounded-xl border border-line bg-surface text-fg-3 text-[15px] font-semibold flex items-center gap-1.5">
            <LuImage aria-hidden className="w-4 h-4" />תמונה
          </a>
        )}
      </div>
      {showNote && (
        <textarea
          aria-label="הערה לתרגיל"
          rows={2}
          value={ex[noteKey] ?? ''}
          onChange={e => onChange({ [noteKey]: e.target.value })}
          placeholder="איך הרגיש? כאב? שינוי?"
          className="w-full rounded-2xl border-2 border-line-strong bg-surface text-fg text-base px-3 py-2.5 resize-none focus:outline-none focus:border-accent"
        />
      )}

      <p className="text-center text-[13px] text-faint">החלק ימינה לתרגיל הבא</p>
    </div>
  )
}
