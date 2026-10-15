'use client'

// One exercise per screen: targets, last time, sets, big steppers, RPE buttons, note.
// Works on the same exercise form fields the workout page saves
// (RepsDone / DurationSec / WeightKG / RPE / Notes, and the *Left fields for single-hand).
// Set 1 lives in those fields, sets 2+ in MoreSets (see lib/exercise-log-writes.ts).

import { useState } from 'react'
import { LuCopy, LuImage, LuPlay, LuPlus, LuTimer, LuTrash2, LuTrophy } from 'react-icons/lu'
import NumberStepper from './NumberStepper'
import Hint from './Hint'
import { SET_KEYS, allSets, setHasValues, type SetVals } from '@/lib/exercise-log-writes'

export interface LastValues {
  date: string | null
  RepsDone?: number | null; DurationSec?: number | null; WeightKG?: number | null; RPE?: number | null
  RepsDoneLeft?: number | null; DurationSecLeft?: number | null; WeightKGLeft?: number | null; RPELeft?: number | null
  MoreSets?: SetVals[]   // sets 2+ of that time
}

/** Best ever for one side: heaviest weight, the most reps/time at that weight, and the most reps/time overall. */
export interface Best { w: number | null; atW: number | null; prim: number | null }
export type Bests = { R?: Best; L?: Best }

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  exercise: any
  position: { n: number; of: number }
  last?: LastValues
  bests?: Bests
  onChange: (data: Record<string, any>) => void
  onRest?: (seconds: number) => void
}

/** Personal record: heavier than ever, or the same top weight with more reps/time; without weight, more reps/time. */
export function isPR(primary: number | null, weight: number | null, best?: Best): boolean {
  if (primary == null || primary <= 0 || !best) return false
  const w = weight ?? 0, bw = best.w ?? 0
  if (bw !== 0 || w !== 0) {
    if (w > bw) return true
    return w === bw && best.atW != null && primary > best.atW
  }
  return best.prim != null && primary > best.prim
}

export function exercisePR(o: any, bests?: Bests): boolean {
  if (!bests) return false
  const k = o.isDuration ? 'DurationSec' : 'RepsDone'
  return allSets(o).some((st: any) =>
    isPR(n(st[k]), n(st.WeightKG), bests.R) || (!!o.IsSingleHand && isPR(n(st[k + 'Left']), n(st.WeightKGLeft), bests.L)))
}

const n = (v: unknown) => (v == null || v === '' ? null : Number(v))

/** Long efforts (2 min and up) are shown and entered in minutes, short ones in seconds. */
export const LONG_DURATION = 120
export function fmtDuration(sec: number): string {
  if (sec < LONG_DURATION) return `${sec} שנ׳`
  const m = Math.floor(sec / 60), r = Math.round(sec % 60)
  return r ? `${m}:${String(r).padStart(2, '0')} דק׳` : `${m} דק׳`
}

export function sideSummary(o: any, left: boolean, isDuration: boolean): string | null {
  const s = left ? 'Left' : ''
  const p = n(o[(isDuration ? 'DurationSec' : 'RepsDone') + s])
  if (p == null) return null
  const w = n(o['WeightKG' + s]), r = n(o['RPE' + s])
  return (isDuration ? fmtDuration(p) : `${p} חזרות`) + (w ? ` · ${w} ק״ג` : '') + (r ? ` · RPE ${r}` : '')
}

/** One side over all sets: "8 חזרות · 20 ק״ג" for one set, "3 סטים · 8/8/6 חזרות · 20 ק״ג", or "3 סטים · 8×20 · 8×20 · 6×22.5". */
function sideSetsSummary(o: any, left: boolean, isDuration: boolean): string | null {
  const s = left ? 'Left' : ''
  const done = allSets(o).filter(st => n((st as any)[(isDuration ? 'DurationSec' : 'RepsDone') + s]) != null)
  if (done.length <= 1) return done.length ? sideSummary({ ...o, ...done[0] }, left, isDuration) : null
  const p = done.map(st => n((st as any)[(isDuration ? 'DurationSec' : 'RepsDone') + s]))
  const w = done.map(st => n((st as any)['WeightKG' + s]))
  const unit = isDuration ? 'שנ׳' : 'חזרות'
  if (isDuration && w.every(x => x === w[0])) return `${done.length} סטים · ${p.map(x => fmtDuration(x ?? 0)).join(' / ')}` + (w[0] ? ` · ${w[0]} ק״ג` : '')
  if (w.every(x => x === w[0])) return `${done.length} סטים · ${p.join('/')} ${unit}` + (w[0] ? ` · ${w[0]} ק״ג` : '')
  return `${done.length} סטים · ` + p.map((x, i) => (w[i] ? `${x}×${w[i]}` : `${x}`)).join(' · ') + ` (${unit}×ק״ג)`
}

export function exerciseSummary(o: any): string | null {
  if (o.IsSingleHand) {
    const a = sideSetsSummary(o, false, o.isDuration), b = sideSetsSummary(o, true, o.isDuration)
    return a || b ? `ימין ${a ?? '–'}  |  שמאל ${b ?? '–'}` : null
  }
  return sideSetsSummary(o, false, o.isDuration)
}

export default function ExerciseStep({ exercise: ex, position, last, bests, onChange: onChangeExercise, onRest }: Props) {
  const [side, setSide] = useState<'R' | 'L'>('R')
  const [setIdx, setSetIdx] = useState(0)

  // sets: as many as the plan says, or as were logged
  const sets = allSets(ex)
  const planned = Math.max(1, Number(ex.Sets) || 1)
  const setCount = Math.max(planned, sets.length)
  const cur: any = setIdx === 0 ? ex : { ...ex, ...(sets[setIdx] ?? {}) }   // the exercise as seen on this set
  // edits of set values go to the current set; notes and anything else stay on the exercise
  const onChange = (data: Record<string, any>) => {
    if (setIdx === 0) return onChangeExercise(data)
    const more = [...((ex.MoreSets as SetVals[] | undefined) ?? [])]
    while (more.length < setIdx) more.push({})
    const setPart: SetVals = {}, rest: Record<string, any> = {}
    for (const [k, v] of Object.entries(data)) {
      if ((SET_KEYS as readonly string[]).includes(k)) (setPart as any)[k] = v
      else rest[k] = v
    }
    more[setIdx - 1] = { ...more[setIdx - 1], ...setPart }
    onChangeExercise({ ...rest, MoreSets: more })
  }
  const writeSets = (all: SetVals[]) => {
    const [first, ...more] = all
    const top: Record<string, any> = {}
    for (const k of SET_KEYS) top[k] = first?.[k] ?? null
    onChangeExercise({ ...top, MoreSets: more })
  }
  const copyPrevSet = () => {
    const all = [...sets]; while (all.length <= setIdx) all.push({})
    all[setIdx] = { ...all[setIdx - 1] }
    writeSets(all)
  }
  const fillAllLikeFirst = () => {
    const all = [...sets]; while (all.length < setCount) all.push({})
    writeSets(all.map((st, i) => (i === 0 || setHasValues(st) ? st : { ...all[0] })))
  }
  const addSet = () => {
    const all = [...sets]; while (all.length < setCount) all.push({})
    all.push({})
    writeSets(all)
    setSetIdx(all.length - 1)
  }
  const removeSet = () => {
    const all = sets.slice(0, setIdx)
    writeSets(all.length ? all : [{}])
    setSetIdx(Math.max(0, setIdx - 1))
  }
  const canRemove = setIdx > 0 && setIdx === setCount - 1 && setIdx >= planned
  const lastSets = last ? allSets(last) : []
  const lastSet: any = lastSets[setIdx] ?? lastSets[lastSets.length - 1]
  const emptyLater = sets.length < setCount || sets.slice(1).some(st => !setHasValues(st))
  const [noteOpen, setNoteOpen] = useState(false)
  const [descOpen, setDescOpen] = useState(false)
  const desc = String(ex.Description ?? '')
  const longDesc = desc.length > 110 || desc.split('\n').length > 2
  const single = !!ex.IsSingleHand
  const s = single && side === 'L' ? 'Left' : ''
  const primKey = (ex.isDuration ? 'DurationSec' : 'RepsDone') + s
  const target = ex.isDuration ? n(ex.Duration) : n(ex.Reps)
  const setKey = setCount > 1 ? `-s${setIdx + 1}` : ''
  // long efforts (target or last time 2+ minutes) are entered in minutes; stored in seconds
  const inMinutes = !!ex.isDuration && Math.max(target ?? 0, n(lastSet?.[primKey]) ?? 0) >= LONG_DURATION
  const toMin = (sec: number | null) => (sec == null ? null : Math.round((sec / 60) * 100) / 100)

  const lastText = last ? exerciseSummary({ ...last, IsSingleHand: single, isDuration: ex.isDuration }) : null
  const noteKey = 'Notes' + s
  const showNote = noteOpen || !!ex[noteKey]

  const targets: string[] = []
  if (ex.Sets) targets.push(`${ex.Sets} סטים`)
  if (ex.Reps) targets.push(`${ex.Reps} חזרות`)
  if (ex.Duration) targets.push(fmtDuration(Number(ex.Duration)))
  if (ex.Rest) targets.push(`מנוחה ${ex.Rest} שנ׳`)

  // "same as last time": every set of last time
  const copyLast = () => {
    if (!last) return
    writeSets(allSets(last).map(st => {
      const o: SetVals = {}
      for (const k of SET_KEYS) if (st[k] != null) o[k] = st[k]
      return o
    }))
  }
  const sameAsRight = () => onChange({
    RepsDoneLeft: cur.RepsDone ?? null, DurationSecLeft: cur.DurationSec ?? null,
    WeightKGLeft: cur.WeightKG ?? null, RPELeft: cur.RPE ?? null,
  })

  const rpeKey = 'RPE' + s
  const pr = isPR(n(cur[primKey]), n(cur['WeightKG' + s]), s ? bests?.L : bests?.R)
  const rest = n(ex.Rest)
  const restLabel = rest ? (rest >= 60 ? `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}` : `${rest} שנ׳`) : ''
  const rightDone = !!sideSummary(cur, false, ex.isDuration)
  const leftDone = !!sideSummary(cur, true, ex.isDuration)

  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold text-accent bg-accent/15 px-2.5 py-0.5 rounded-full">בלוק {ex.Block || 1}</span>
          {single && <span className="text-[13px] font-bold text-info bg-info/15 px-2.5 py-0.5 rounded-full">יד אחת</span>}
          <span className="text-[13px] text-muted">תרגיל {position.n} מתוך {position.of}</span>
        </div>
        <h2 className="text-[28px] leading-tight font-extrabold text-balance">{ex.Name}</h2>
        {pr && (
          <p role="status" className="self-start flex items-center gap-1.5 rounded-full bg-success/15 border border-success/50 text-success text-sm font-extrabold px-3 py-1 animate-[pulse_1.2s_ease-in-out_2]">
            <LuTrophy aria-hidden className="w-4 h-4" />שיא חדש{single ? (s ? ' ביד שמאל' : ' ביד ימין') : ''}!
          </p>
        )}
        {targets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {targets.map(t => (
              <span key={t} className="text-[15px] font-semibold text-fg-2 bg-raised border border-line px-3 py-1 rounded-[10px]">{t}</span>
            ))}
          </div>
        )}
        {ex.Description && (
          <div className="text-[15px] text-fg-3 leading-relaxed">
            {/* long descriptions start folded so the inputs stay on screen */}
            <p className={`whitespace-pre-wrap ${descOpen ? '' : 'line-clamp-2'}`}>{ex.Description}</p>
            {longDesc && (
              <button type="button" onClick={() => setDescOpen(o => !o)} aria-expanded={descOpen} className="mt-0.5 -my-1 py-1 text-accent text-sm font-bold">
                {descOpen ? 'הצג פחות' : 'הצג את כל התיאור'}
              </button>
            )}
          </div>
        )}
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

      {lastText && position.n === 2 && (
        <Hint id="same-again">״אותו דבר״ ממלא בלחיצה אחת את כל הערכים מהפעם הקודמת.</Hint>
      )}

      {setCount > 1 ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="סט">
            {Array.from({ length: setCount }, (_, i) => {
              const done = setHasValues(sets[i])
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={setIdx === i}
                  onClick={() => setSetIdx(i)}
                  className={`h-11 min-w-[4.25rem] px-3 rounded-xl text-[15px] font-extrabold border ${setIdx === i ? 'bg-accent text-on-accent border-accent' : done ? 'bg-success/15 text-success border-success/40' : 'bg-surface text-fg-2 border-line-strong'}`}
                >
                  סט {i + 1}{done ? ' ✓' : ''}
                </button>
              )
            })}
            <button type="button" onClick={addSet} aria-label="הוסף סט" className="h-11 w-11 rounded-xl border border-dashed border-line-strong text-fg-3 flex items-center justify-center">
              <LuPlus aria-hidden className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {setIdx > 0 && setHasValues(sets[setIdx - 1]) && (
              <button type="button" onClick={copyPrevSet} className="h-11 px-3.5 rounded-xl border border-line-strong bg-raised text-fg text-sm font-bold flex items-center gap-1.5">
                <LuCopy aria-hidden className="w-4 h-4" />כמו סט {setIdx}
              </button>
            )}
            {setIdx === 0 && setHasValues(sets[0]) && emptyLater && (
              <button type="button" onClick={fillAllLikeFirst} className="h-11 px-3.5 rounded-xl border border-line-strong bg-raised text-fg text-sm font-bold flex items-center gap-1.5">
                <LuCopy aria-hidden className="w-4 h-4" />כל הסטים כמו סט 1
              </button>
            )}
            {canRemove && (
              <button type="button" onClick={removeSet} className="h-11 px-3.5 rounded-xl border border-line text-fg-3 text-sm font-semibold flex items-center gap-1.5">
                <LuTrash2 aria-hidden className="w-4 h-4" />הסר סט {setIdx + 1}
              </button>
            )}
          </div>
          <Hint id="sets">ממלאים כל סט בנפרד. ״כמו סט קודם״ מעתיק את הערכים, ואז משנים רק מה שהיה שונה.</Hint>
        </div>
      ) : (
        <button type="button" onClick={addSet} className="self-start -mb-1 h-9 px-1 text-accent text-sm font-bold flex items-center gap-1">
          <LuPlus aria-hidden className="w-4 h-4" />פירוט לפי סטים
        </button>
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
      {single && <Hint id="sides">ממלאים כל יד בנפרד. אחרי ימין, ״כמו ימין״ מעתיק את הערכים לשמאל.</Hint>}

      <NumberStepper
        key={primKey + setKey + (inMinutes ? 'm' : '')}
        id={`ex-${position.n}-${ex.ExerciseID}-${primKey}${setKey}`}
        label={ex.isDuration ? 'זמן' : 'חזרות'}
        unit={ex.isDuration ? (inMinutes ? 'דקות' : 'שניות') : undefined}
        value={inMinutes ? toMin(n(cur[primKey])) : n(cur[primKey])}
        placeholder={inMinutes ? toMin(n(lastSet?.[primKey]) ?? target) : n(lastSet?.[primKey]) ?? target}
        step={inMinutes ? 1 : ex.isDuration ? 5 : 1}
        onChange={v => onChange({ [primKey]: inMinutes && v != null ? Math.round(v * 60) : v })}
      />
      <NumberStepper
        key={'WeightKG' + s + setKey}
        id={`ex-${position.n}-${ex.ExerciseID}-WeightKG${s}${setKey}`}
        label="משקל"
        unit="ק״ג"
        value={n(cur['WeightKG' + s])}
        placeholder={n(lastSet?.['WeightKG' + s])}
        step={2.5}
        onChange={v => onChange({ ['WeightKG' + s]: v })}
      />
      {position.n === 1 && (
        <Hint id="tap-number">לחיצה על המספר מסמנת אותו, ואז פשוט מקלידים את המספר החדש. ה־+ וה־− מתחילים מהערך של הפעם הקודמת.</Hint>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-bold text-fg-2">מאמץ <span className="font-normal text-muted">RPE 1–10</span></p>
        <div dir="ltr" className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => {
            const on = n(cur[rpeKey]) === k
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
        {rest && onRest ? (
          <button type="button" onClick={() => onRest(rest)} className="h-[46px] px-3.5 rounded-xl border border-line-strong bg-raised text-fg-2 text-[15px] font-bold flex items-center gap-1.5">
            <LuTimer aria-hidden className="w-4 h-4" />מנוחה {restLabel}
          </button>
        ) : null}
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

      {position.n === 1 && position.of > 1 && (
        <Hint id="swipe">מחליקים ימינה לתרגיל הבא ושמאלה לקודם. אפשר גם ללחוץ על הפסים למעלה כדי לקפוץ לתרגיל.</Hint>
      )}
    </div>
  )
}
