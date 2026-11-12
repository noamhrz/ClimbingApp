// components/workout-flow/IntervalTimer.tsx
// Full-screen interval timer for repeaters-style exercises (e.g. 6 × 7 s hang / 3 s rest):
// get ready → work / rest alternating to the end of the set → rest between sets → next set,
// one continuous run. Beeps 3-2-1 before every switch and a long beep on the switch itself.
// Time comes from the clock (not from counting ticks), so it stays right even if frames drop.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface IntervalPlan {
  name: string
  reps: number          // hangs per set
  work: number          // seconds
  rest: number          // seconds between hangs
  sets: number          // sets in this run
  firstSet: number      // index of the first set in the run (0-based), for labels
  totalSets: number     // sets of the exercise, for labels
  setRest: number       // seconds between sets (0 = straight on)
}

type StepType = 'prep' | 'work' | 'rest' | 'setrest'
interface Step { type: StepType; dur: number; set: number; rep: number }

const PREP = 5
const NAMES: Record<StepType, string> = { prep: 'מתכוננים', work: 'תלייה', rest: 'שחרור', setrest: 'מנוחה בין סטים' }
const PHASE: Record<StepType | 'done', { fg: string; bg: string }> = {
  prep: { fg: '#E3B341', bg: '#3A2E10' },
  work: { fg: '#4FB477', bg: '#133524' },
  rest: { fg: '#D9534F', bg: '#3A1514' },
  setrest: { fg: '#7FB0C9', bg: '#13293A' },
  done: { fg: '#CFC6BA', bg: '#1C1915' },
}

function buildSteps(p: IntervalPlan): Step[] {
  const s: Step[] = [{ type: 'prep', dur: PREP, set: 0, rep: 0 }]
  for (let set = 0; set < p.sets; set++) {
    for (let r = 0; r < p.reps; r++) {
      s.push({ type: 'work', dur: p.work, set, rep: r })
      if (r < p.reps - 1 && p.rest > 0) s.push({ type: 'rest', dur: p.rest, set, rep: r })
    }
    if (set < p.sets - 1 && p.setRest > 0) s.push({ type: 'setrest', dur: p.setRest, set, rep: p.reps - 1 })
  }
  return s
}

export default function IntervalTimer({ plan, onSetDone, onClose }: {
  plan: IntervalPlan
  /** a set of the run ended: its index within the run and the hangs completed */
  onSetDone: (runSet: number, reps: number) => void
  /** closed: finished = the whole run completed (or stopped by "נפלתי") */
  onClose: (finished: boolean) => void
}) {
  const steps = useRef(buildSteps(plan)).current
  const [, force] = useState(0)
  const st = useRef({ i: 0, t0: 0, running: false, paused: false, pausedAt: 0, lastBeep: -1, setsReported: new Set<number>(), done: false })
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

  const report = useCallback((set: number, reps: number) => {
    const s = st.current
    if (s.setsReported.has(set)) return
    s.setsReported.add(set)
    onSetDone(set, reps)
  }, [onSetDone])

  const finish = useCallback((msg: string) => {
    cancelAnimationFrame(raf.current)
    st.current.done = true
    st.current.running = false
    beep(523, 600)
    releaseWake()
    setDoneMsg(msg)
  }, [beep])

  const loop = useCallback(() => {
    const s = st.current
    if (!s.running || s.paused) return
    const now = performance.now()
    let step = steps[s.i]
    let elapsed = (now - s.t0) / 1000
    while (elapsed >= step.dur) {
      // a hang that ran to the end counts; the last hang of a set closes the set
      if (step.type === 'work' && step.rep === plan.reps - 1) report(step.set, plan.reps)
      s.t0 += step.dur * 1000
      s.i++
      s.lastBeep = -1
      if (s.i >= steps.length) {
        finish(plan.sets > 1 ? `כל ${plan.sets} הסטים נשמרו · ${plan.reps} חזרות בכל סט` : `הסט נשמר · ${plan.reps} חזרות`)
        return
      }
      step = steps[s.i]
      elapsed = (now - s.t0) / 1000
      beep(step.type === 'work' ? 1046 : 660, 420)
    }
    const left = Math.ceil(step.dur - elapsed)
    if (left >= 1 && left <= 3 && left !== s.lastBeep) { s.lastBeep = left; beep(880, 100) }
    force(x => x + 1)
    raf.current = requestAnimationFrame(loop)
  }, [steps, plan.reps, plan.sets, report, finish, beep])

  const start = async () => {
    beep(880, 60) // unlocks audio on iOS (first sound must come from a tap)
    try { wake.current = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch { /* not granted */ }
    Object.assign(st.current, { i: 0, t0: performance.now(), running: true, paused: false, lastBeep: -1 })
    loop()
  }
  const pause = () => { const s = st.current; s.paused = true; s.pausedAt = performance.now(); cancelAnimationFrame(raf.current); force(x => x + 1) }
  const resume = () => { const s = st.current; s.t0 += performance.now() - s.pausedAt; s.paused = false; loop() }
  /** "נפלתי": the set stops here; only the hangs completed in it count */
  const fail = () => {
    const s = st.current
    const step = steps[s.i]
    const reps = step.type === 'work' ? step.rep : step.type === 'prep' ? 0 : step.rep + 1
    if (step.type === 'setrest') { finish('הסטים שהושלמו נשמרו'); return }
    report(step.set, reps)
    finish(`נשמר: סט ${plan.firstSet + step.set + 1} · ${reps} חזרות מתוך ${plan.reps}`)
  }

  useEffect(() => () => { cancelAnimationFrame(raf.current); releaseWake(); void audio.current?.close().catch(() => {}) }, [])
  // a hidden page can't keep time on phones: pause, and let the trainee resume
  useEffect(() => {
    const onVis = () => { if (document.hidden && st.current.running && !st.current.paused) pause() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const s = st.current
  const step = steps[Math.min(s.i, steps.length - 1)]
  const phaseKey: StepType | 'done' = doneMsg ? 'done' : s.running ? step.type : 'prep'
  const colors = PHASE[phaseKey]
  const elapsed = s.running ? ((s.paused ? s.pausedAt : performance.now()) - s.t0) / 1000 : 0
  const left = Math.max(0, Math.ceil(step.dur - elapsed))
  const pct = s.running ? Math.min(100, (elapsed / step.dur) * 100) : 0
  const setLabel = `סט ${plan.firstSet + (s.running ? step.set : 0) + 1} מתוך ${plan.totalSets}`
  const repNow = !s.running ? 0 : step.type === 'work' ? step.rep + 1 : step.type === 'prep' ? 0 : step.rep + 1
  const doneInSet = !s.running ? 0 : step.type === 'work' ? step.rep : step.type === 'prep' ? 0 : step.rep + 1
  const next = steps[s.i + 1]

  return createPortal(
    <div
      data-flow
      role="dialog"
      aria-modal="true"
      aria-label={`טיימר אינטרוול · ${plan.name}`}
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

      {!doneMsg && <>
      <div className="flex justify-center gap-2 flex-wrap px-4 pt-3 tabular-nums">
        <span className="rounded-full bg-black/30 px-3 py-1 font-bold">{setLabel}</span>
        <span className="rounded-full bg-black/30 px-3 py-1 font-bold">חזרה {repNow} מתוך {plan.reps}</span>
      </div>
      <div className="flex justify-center gap-1.5 pt-3" aria-hidden>
        {Array.from({ length: plan.reps }, (_, i) => (
          <i key={i} className="w-6 h-2 rounded"
            style={{ background: i < doneInSet ? colors.fg : i === repNow - 1 && step.type === 'work' && s.running ? '#fff' : 'rgba(255,255,255,.18)' }} />
        ))}
      </div>
      </>}

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
              {s.paused ? 'מושהה' : s.running ? NAMES[step.type] : 'מוכנים?'}
            </div>
            <div className="font-black leading-[.95] tabular-nums text-white" style={{ fontSize: 'clamp(120px, 38vw, 220px)' }}>
              {s.running ? left : `${plan.work}/${plan.rest}`}
            </div>
            <p className="text-fg-2 min-h-6 text-center">
              {s.running
                ? next ? `הבא: ${NAMES[next.type]}${next.type === 'work' ? ` · חזרה ${next.rep + 1}` : ''}` : 'הבא: סיום'
                : `${plan.reps} חזרות · ${plan.work} שנ׳ תלייה · ${plan.rest} שנ׳ שחרור${plan.sets > 1 ? ` · ${plan.sets} סטים` : ''}`}
            </p>
            <div className="w-64 max-w-[70%] h-2.5 rounded-full bg-white/10 overflow-hidden mt-2">
              <div className="h-full" style={{ width: `${pct}%`, background: colors.fg }} />
            </div>
          </>
        )}
      </div>

      {!doneMsg && <p className="text-xs text-muted text-center px-4 pb-2">באייפון: להוריד מצב שקט כדי לשמוע צפצופים</p>}
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-5">
        {doneMsg ? (
          <button type="button" onClick={() => onClose(true)} className="col-span-2 h-16 rounded-2xl bg-white text-on-accent text-lg font-extrabold">המשך באימון</button>
        ) : !s.running ? (
          <button type="button" onClick={start} className="col-span-2 h-16 rounded-2xl bg-white text-on-accent text-lg font-extrabold">▶ התחלה</button>
        ) : s.paused ? (
          <>
            <button type="button" onClick={resume} className="col-span-2 h-16 rounded-2xl bg-white text-on-accent text-lg font-extrabold">▶ המשך</button>
            <button type="button" onClick={fail} className="col-span-2 h-14 rounded-2xl bg-black/30 text-[#FFB3AF] text-lg font-extrabold">נפלתי</button>
          </>
        ) : (
          <>
            <button type="button" onClick={pause} className="h-16 rounded-2xl bg-black/30 text-lg font-extrabold">⏸ השהיה</button>
            <button type="button" onClick={fail} className="h-16 rounded-2xl bg-black/30 text-[#FFB3AF] text-lg font-extrabold">נפלתי</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
