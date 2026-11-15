// components/workout-flow/DurationTimer.tsx
// Full-screen timer for exercises measured in time (plank, static hang, stretch, ARC…), in the
// interval timer's look: get ready → hold → rest between sets → next set, one continuous run.
// Two ways to run a hold:
//   • "עד היעד"  – ends by itself at the target and records it (hands-free: hangboard, plank)
//   • "עד כשל"   – after the target it keeps counting "+0:08" until "עצרתי", which records the real time
// "עצרתי" also ends a hold early and records what was done. No target → a stopwatch.
// One hand: right, switch, left — each side recorded separately. Rests can be skipped.
// Time comes from the clock, so it stays right with dropped frames or a locked phone.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface DurationPlan {
  name: string
  target: number        // seconds per hold (0 = stopwatch)
  single?: boolean      // one hand: right then left in every set
  sets: number          // sets in this run
  firstSet: number      // index of the first set in the run (0-based), for labels
  totalSets: number     // sets of the exercise, for labels
  setRest: number       // seconds between sets (0 = straight on)
}

type StepType = 'prep' | 'work' | 'switch' | 'setrest'
interface Step { type: StepType; dur: number; set: number; hand?: 'R' | 'L' }
const HAND = { R: 'ימין', L: 'שמאל' } as const
const PREP = 5
const SWITCH = 10
const NAMES: Record<StepType, string> = { prep: 'מתכוננים', work: 'עבודה', switch: 'החלפת יד', setrest: 'מנוחה בין סטים' }
const PHASE: Record<StepType | 'over' | 'done', { fg: string; bg: string }> = {
  prep: { fg: '#E3B341', bg: '#3A2E10' },
  work: { fg: '#4FB477', bg: '#133524' },
  over: { fg: '#F2C94C', bg: '#2E2A0E' },
  switch: { fg: '#7FB0C9', bg: '#13293A' },
  setrest: { fg: '#7FB0C9', bg: '#13293A' },
  done: { fg: '#CFC6BA', bg: '#1C1915' },
}
const MODE_KEY = 'duration-timer-mode'

/** 45 → "45", 75 → "1:15" */
export const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s)
}
const secText = (sec: number) => (sec >= 60 ? `${clock(sec)} דק׳` : `${sec} שנ׳`)

function buildSteps(p: DurationPlan): Step[] {
  const s: Step[] = [{ type: 'prep', dur: PREP, set: 0 }]
  for (let set = 0; set < p.sets; set++) {
    if (p.single) {
      s.push({ type: 'work', dur: p.target, set, hand: 'R' }, { type: 'switch', dur: SWITCH, set }, { type: 'work', dur: p.target, set, hand: 'L' })
    } else s.push({ type: 'work', dur: p.target, set })
    if (set < p.sets - 1 && p.setRest > 0) s.push({ type: 'setrest', dur: p.setRest, set })
  }
  return s
}

export default function DurationTimer({ plan, onSetDone, onClose }: {
  plan: DurationPlan
  /** a set of the run ended: its index within the run and the seconds held (one-hand: right, left) */
  onSetDone: (runSet: number, sec: number, secLeft?: number) => void
  onClose: (finished: boolean) => void
}) {
  const stopwatch = plan.target <= 0
  const steps = useRef(buildSteps(plan)).current
  const [, force] = useState(0)
  const [extra, setExtra] = useState(() => {
    if (stopwatch) return true
    try { return localStorage.getItem(MODE_KEY) === 'extra' } catch { return false }
  })
  const st = useRef({ i: 0, t0: 0, running: false, paused: false, pausedAt: 0, lastBeep: -1, overBeeped: false, right: null as number | null, held: [] as string[] })
  const [doneMsg, setDoneMsg] = useState<string | null>(null)
  const raf = useRef(0)
  const audio = useRef<AudioContext | null>(null)
  const wake = useRef<{ release: () => Promise<void> } | null>(null)

  const beep = useCallback((freq: number, ms: number) => {
    try {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
      audio.current ??= new (W.AudioContext || W.webkitAudioContext)!()
      const ctx = audio.current
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000)
      o.connect(g).connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + ms / 1000 + 0.02)
    } catch { /* no audio */ }
    try { navigator.vibrate?.(ms > 200 ? 250 : 60) } catch { /* no vibration */ }
  }, [])
  const releaseWake = () => { try { void wake.current?.release() } catch { /* ignore */ } wake.current = null }
  const requestWake = async () => {
    try { wake.current = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch { /* not granted */ }
  }

  const finish = useCallback(() => {
    cancelAnimationFrame(raf.current)
    const s = st.current
    s.running = false
    beep(523, 600)
    releaseWake()
    setDoneMsg(s.held.length ? s.held.join(' · ') : 'לא נשמר זמן')
  }, [beep])

  /** a hold ended after `sec` seconds: record it (one hand: the set is recorded after the left side) */
  const recordHold = useCallback((step: Step, sec: number) => {
    const s = st.current
    const v = Math.max(0, Math.round(sec))
    const label = `סט ${plan.firstSet + step.set + 1}`
    if (step.hand === 'R') { s.right = v; return }
    if (step.hand === 'L') {
      onSetDone(step.set, s.right ?? 0, v)
      s.held.push(`${label}: ימין ${secText(s.right ?? 0)}, שמאל ${secText(v)}`)
      s.right = null
      return
    }
    onSetDone(step.set, v)
    s.held.push(`${label}: ${secText(v)}`)
  }, [onSetDone, plan.firstSet])

  /** move on to step i+1 at time `at` */
  const advance = useCallback((at: number) => {
    const s = st.current
    s.i++
    s.t0 = at
    s.lastBeep = -1
    s.overBeeped = false
    if (s.i >= steps.length) { finish(); return false }
    beep(steps[s.i].type === 'work' ? 1046 : 660, 420)
    return true
  }, [steps, beep, finish])

  const loop = useCallback(() => {
    const s = st.current
    if (!s.running || s.paused) return
    const now = performance.now()
    let step = steps[s.i]
    let elapsed = (now - s.t0) / 1000
    // steps that end by themselves (catches up after a locked phone)
    while (elapsed >= step.dur && !(step.type === 'work' && (extra || stopwatch))) {
      if (step.type === 'work') recordHold(step, step.dur)
      if (!advance(s.t0 + step.dur * 1000)) return
      step = steps[s.i]
      elapsed = (now - s.t0) / 1000
    }
    if (step.type === 'work' && !stopwatch && elapsed >= step.dur && !s.overBeeped) {
      s.overBeeped = true
      beep(1046, 600) // target reached: the extra time starts
    }
    const left = Math.ceil(step.dur - elapsed)
    if (!(step.type === 'work' && stopwatch) && left >= 1 && left <= 3 && left !== s.lastBeep) { s.lastBeep = left; beep(880, 100) }
    force(x => x + 1)
    raf.current = requestAnimationFrame(loop)
  }, [steps, extra, stopwatch, recordHold, advance, beep])

  const start = async () => {
    beep(880, 60) // unlocks audio on iOS (first sound must come from a tap)
    try { localStorage.setItem(MODE_KEY, extra ? 'extra' : 'target') } catch { /* ignore */ }
    await requestWake()
    Object.assign(st.current, { i: 0, t0: performance.now(), running: true, paused: false, lastBeep: -1, overBeeped: false, right: null, held: [] })
    loop()
  }
  const pause = () => { const s = st.current; s.paused = true; s.pausedAt = performance.now(); cancelAnimationFrame(raf.current); force(x => x + 1) }
  const resume = () => { const s = st.current; s.t0 += performance.now() - s.pausedAt; s.paused = false; loop() }
  /** "עצרתי": the hold on screen ends now and records the real time */
  const stopHold = () => {
    const s = st.current
    const step = steps[s.i]
    if (step.type !== 'work') return
    const now = s.paused ? s.pausedAt : performance.now()
    recordHold(step, (now - s.t0) / 1000)
    if (s.paused) s.paused = false
    if (advance(performance.now())) loop()
  }
  /** skip the rest on screen */
  const skip = () => {
    const s = st.current
    if (s.paused) s.paused = false
    cancelAnimationFrame(raf.current)
    if (advance(performance.now())) loop()
  }

  useEffect(() => () => { cancelAnimationFrame(raf.current); releaseWake(); void audio.current?.close().catch(() => {}) }, [])
  // the clock keeps running while the phone is locked; back on screen: catch up and keep the screen on
  useEffect(() => {
    const onVis = () => {
      if (document.hidden || !st.current.running) return
      void requestWake()
      cancelAnimationFrame(raf.current)
      loop()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [loop])

  const s = st.current
  const step = steps[Math.min(s.i, steps.length - 1)]
  const elapsed = s.running ? ((s.paused ? s.pausedAt : performance.now()) - s.t0) / 1000 : 0
  const isWork = s.running && step.type === 'work'
  const over = isWork && !stopwatch && elapsed >= step.dur
  const phaseKey = doneMsg ? 'done' : !s.running ? 'prep' : over ? 'over' : step.type
  const colors = PHASE[phaseKey]
  const big = !s.running
    ? (stopwatch ? '0' : clock(plan.target))
    : isWork && stopwatch ? clock(elapsed)
    : over ? `+${clock(elapsed - step.dur)}`
    : clock(Math.ceil(step.dur - elapsed))
  const pct = !s.running ? 0 : isWork && stopwatch ? 0 : Math.min(100, (elapsed / step.dur) * 100)
  const setLabel = `סט ${plan.firstSet + (s.running ? step.set : 0) + 1} מתוך ${plan.totalSets}`
  const phaseName = (t: Step) => (t.type === 'work' ? (t.hand ? `עבודה · ${HAND[t.hand]}` : NAMES.work) : NAMES[t.type])
  const next = steps[s.i + 1]
  const restNow = s.running && (step.type === 'switch' || step.type === 'setrest')

  return createPortal(
    <div
      data-flow
      role="dialog"
      aria-modal="true"
      aria-label={`טיימר · ${plan.name}`}
      dir="rtl"
      className="fixed inset-0 z-[90] flex flex-col text-fg transition-colors duration-200"
      style={{ background: colors.bg, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-extrabold truncate">{plan.name}</span>
        <button
          type="button"
          onClick={() => { cancelAnimationFrame(raf.current); releaseWake(); onClose(!!doneMsg) }}
          className="h-11 px-3 rounded-xl bg-black/25 font-bold"
        >
          {doneMsg ? 'המשך' : '✕ יציאה'}
        </button>
      </div>

      {!doneMsg && (
        <div className="flex justify-center gap-2 flex-wrap px-4 pt-3 tabular-nums">
          <span className="rounded-full bg-black/30 px-3 py-1 font-bold">{setLabel}</span>
          {!stopwatch && <span className="rounded-full bg-black/30 px-3 py-1 font-bold">יעד {secText(plan.target)}{plan.single ? ' בכל יד' : ''}</span>}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-1 px-4" aria-live="polite">
        {doneMsg ? (
          <>
            <div className="text-[34px] font-black" style={{ color: colors.fg }}>סיום</div>
            <div className="text-[120px] leading-none font-black">✓</div>
            <p className="text-lg font-bold text-center">{doneMsg}</p>
          </>
        ) : (
          <>
            <div className="text-[32px] font-black" style={{ color: colors.fg }}>
              {s.paused ? 'מושהה' : !s.running ? 'מוכנים?' : over ? 'אקסטרה!' : phaseName(step)}
            </div>
            <div dir="ltr" className="font-black leading-[.95] tabular-nums text-white" style={{ fontSize: 'clamp(110px, 34vw, 210px)', color: over ? colors.fg : undefined }}>
              {big}
            </div>
            <p className="text-fg-2 min-h-6 text-center">
              {!s.running
                ? (stopwatch ? 'סטופר: עוצרים מתי שרוצים והזמן נשמר' : `${plan.sets > 1 ? `${plan.sets} סטים · ` : ''}${secText(plan.target)}${plan.single ? ' ימין ואז שמאל' : ''}${plan.setRest ? ` · ${secText(plan.setRest)} מנוחה` : ''}`)
                : over ? `יעד ${secText(step.dur)} הושג · ממשיכים עד "עצרתי"`
                : next ? `הבא: ${phaseName(next)}` : 'הבא: סיום'}
            </p>
            {!(isWork && stopwatch) && (
              <div className="w-64 max-w-[70%] h-2.5 rounded-full bg-white/10 overflow-hidden mt-2">
                <div className="h-full" style={{ width: `${pct}%`, background: colors.fg }} />
              </div>
            )}
          </>
        )}
      </div>

      {!s.running && !doneMsg && !stopwatch && (
        <div className="px-4 pb-3">
          <div role="radiogroup" aria-label="סוג ריצה" className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/30">
            {([false, true] as const).map(v => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={extra === v}
                onClick={() => setExtra(v)}
                className={`min-h-14 rounded-xl px-2 text-center leading-tight ${extra === v ? 'bg-white text-on-accent' : 'text-fg-2'}`}
              >
                <span className="block font-extrabold">{v ? 'עד כשל' : 'עד היעד'}</span>
                <span className="block text-xs font-semibold opacity-80">{v ? 'ממשיך אחרי היעד עד "עצרתי"' : 'נעצר לבד ביעד'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!doneMsg && <p className="text-xs text-muted text-center px-4 pb-2">באייפון: להוריד מצב שקט כדי לשמוע צפצופים</p>}
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-5">
        {doneMsg ? (
          <button type="button" onClick={() => onClose(true)} className="col-span-2 h-16 rounded-2xl bg-white text-on-accent text-lg font-extrabold">המשך באימון</button>
        ) : !s.running ? (
          <button type="button" onClick={start} className="col-span-2 h-16 rounded-2xl bg-white text-on-accent text-lg font-extrabold">▶ התחלה</button>
        ) : s.paused ? (
          <>
            <button type="button" onClick={resume} className="h-16 rounded-2xl bg-white text-on-accent text-lg font-extrabold">▶ המשך</button>
            {isWork
              ? <button type="button" onClick={stopHold} className="h-16 rounded-2xl bg-black/30 text-lg font-extrabold">■ עצרתי</button>
              : <button type="button" onClick={skip} className="h-16 rounded-2xl bg-black/30 text-lg font-extrabold">דלג ←</button>}
          </>
        ) : restNow ? (
          <>
            <button type="button" onClick={pause} className="h-16 rounded-2xl bg-black/30 text-lg font-extrabold">⏸ השהיה</button>
            <button type="button" onClick={skip} className="h-16 rounded-2xl bg-white text-on-accent text-lg font-extrabold">דלג על המנוחה ←</button>
          </>
        ) : (
          <>
            <button type="button" onClick={pause} className="h-16 rounded-2xl bg-black/30 text-lg font-extrabold">⏸ השהיה</button>
            <button
              type="button"
              onClick={stopHold}
              disabled={step.type === 'prep'}
              className={`h-16 rounded-2xl text-lg font-extrabold disabled:opacity-40 ${over || stopwatch ? 'bg-white text-on-accent' : 'bg-black/30'}`}
            >
              ■ עצרתי
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
