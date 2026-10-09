'use client'

// Full-screen workout flow: one step per screen, swipe between steps.
// Finger to the right = next step (same as the calendar day view).
// While dragging, the track is moved directly (no React re-render per frame).

import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { LuArrowRight, LuX } from 'react-icons/lu'
import { hintCount, setHintCount } from './Hint'

export interface FlowStep {
  key: string
  label: string                 // for the progress bar (aria) and header
  state: 'done' | 'todo' | 'neutral'
  content: ReactNode
}

interface Props {
  title: string
  steps: FlowStep[]
  index: number
  onIndexChange: (i: number) => void
  stepLabel: string
  primaryLabel: ReactNode
  onPrimary: () => void
  primaryDisabled?: boolean
  primaryTone?: 'accent' | 'success'
  onClose: () => void
  // optional switch between sections (e.g. exercises / climbing)
  sections?: { key: string; label: string; active: boolean; onSelect: () => void }[]
}

export default function WorkoutFlow({
  title, steps, index, onIndexChange, stepLabel,
  primaryLabel, onPrimary, primaryDisabled, primaryTone = 'accent', onClose, sections,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLElement | null)[]>([])
  const last = steps.length - 1

  const place = useCallback((dx: number, animate: boolean) => {
    const el = track.current
    if (!el) return
    el.style.transition = animate ? 'transform 0.28s cubic-bezier(.2,.8,.2,1)' : 'none'
    el.style.transform = `translateX(calc(${index * 100}% + ${dx}px))`
  }, [index])

  // snap to the current step whenever it changes
  useLayoutEffect(() => { place(0, true) }, [place])
  useEffect(() => { slideRefs.current[index]?.scrollTo({ top: 0 }) }, [index])

  const go = useCallback((i: number) => {
    const j = Math.max(0, Math.min(last, i))
    if (j === index) { place(0, true); return }
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    onIndexChange(j)
  }, [index, last, onIndexChange, place])

  // gentle swipe cue: the first two times the flow opens, the step peeks right and back
  useEffect(() => {
    if (steps.length < 2 || hintCount('nudge') >= 2) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    setHintCount('nudge', hintCount('nudge') + 1)
    const a = setTimeout(() => place(36, true), 900)
    const b = setTimeout(() => place(0, true), 1350)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // swipe (touch + mouse), locked to the horizontal axis
  useEffect(() => {
    const vp = viewport.current
    if (!vp) return
    let sx = 0, sy = 0, st = 0, dx = 0, axis: 'x' | 'y' | null = null, active = false, swiped = false

    const start = (x: number, y: number) => { active = true; axis = null; dx = 0; sx = x; sy = y; st = performance.now() }
    const move = (x: number, y: number, ev?: Event) => {
      if (!active) return
      const mx = x - sx, my = y - sy
      if (!axis) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
        axis = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y'
        if (axis === 'x') (document.activeElement as HTMLElement | null)?.blur?.()
      }
      if (axis !== 'x') return
      if (ev && ev.cancelable) ev.preventDefault()
      dx = mx
      if ((index === last && dx > 0) || (index === 0 && dx < 0)) dx = dx / 3
      place(dx, false)
    }
    const end = () => {
      if (!active) return
      active = false
      if (axis !== 'x') return
      swiped = true
      setTimeout(() => { swiped = false }, 350)
      const dt = Math.max(1, performance.now() - st)
      const flick = Math.abs(dx) > 30 && Math.abs(dx) / dt > 0.3
      const far = Math.abs(dx) > Math.min(70, vp.clientWidth * 0.18)
      if ((far || flick) && dx > 0 && index < last) go(index + 1)
      else if ((far || flick) && dx < 0 && index > 0) go(index - 1)
      else place(0, true)
      dx = 0
    }

    const ts = (e: TouchEvent) => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY) }
    const tm = (e: TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY, e)
    const md = (e: MouseEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('input,textarea,select')) return
      start(e.clientX, e.clientY)
    }
    const mm = (e: MouseEvent) => move(e.clientX, e.clientY)
    const blockClick = (e: MouseEvent) => { if (swiped) { e.stopPropagation(); e.preventDefault() } }

    vp.addEventListener('touchstart', ts, { passive: true })
    vp.addEventListener('touchmove', tm, { passive: false })
    vp.addEventListener('touchend', end)
    vp.addEventListener('touchcancel', end)
    vp.addEventListener('mousedown', md)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', end)
    vp.addEventListener('click', blockClick, true)
    return () => {
      vp.removeEventListener('touchstart', ts)
      vp.removeEventListener('touchmove', tm)
      vp.removeEventListener('touchend', end)
      vp.removeEventListener('touchcancel', end)
      vp.removeEventListener('mousedown', md)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', end)
      vp.removeEventListener('click', blockClick, true)
    }
  }, [index, last, go, place])

  // keyboard (desktop): → next, ← previous, as in the calendar day view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input,textarea,select,[role="dialog"]')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  // no page scroll behind the flow
  useEffect(() => {
    const html = document.documentElement, body = document.body
    const prev = [html.style.overflow, body.style.overflow]
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    // anything that scrolls the page (focus, scrollIntoView) is undone, so the flow never shifts
    const pin = () => { if (window.scrollY !== 0) window.scrollTo(0, 0) }
    window.addEventListener('scroll', pin)
    return () => {
      window.removeEventListener('scroll', pin)
      html.style.overflow = prev[0]
      body.style.overflow = prev[1]
    }
  }, [])

  return (
    <div
      dir="rtl"
      data-flow
      className="fixed inset-0 z-[70] bg-bg text-fg flex flex-col pt-[env(safe-area-inset-top)]"
    >
      <div className="w-full max-w-[520px] mx-auto flex-1 min-h-0 flex flex-col">
        {/* header */}
        <header className="px-4 pt-3 pb-2 border-b border-line flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold truncate">{title}</h1>
              <p className="text-sm text-muted">{stepLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="סגירה"
              className="shrink-0 w-11 h-11 rounded-xl border border-line bg-surface text-fg-2 grid place-items-center"
            >
              <LuX aria-hidden className="w-5 h-5" />
            </button>
          </div>
          {sections && sections.length > 1 && (
            <div className="grid gap-1 bg-surface border border-line rounded-xl p-1" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }} role="group" aria-label="מעבר בין חלקי האימון">
              {sections.map(sec => (
                <button
                  key={sec.key}
                  type="button"
                  aria-pressed={sec.active}
                  onClick={sec.onSelect}
                  className={`h-10 rounded-lg text-[15px] font-extrabold ${sec.active ? 'bg-accent text-on-accent' : 'text-fg-2'}`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          )}
          <nav className="flex gap-1" aria-label="התקדמות באימון">
            {steps.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => go(i)}
                aria-label={s.label}
                aria-current={i === index ? 'step' : undefined}
                className="flex-1 h-[18px] py-[7px]"
              >
                <span
                  className={`block h-1 rounded-sm transition-colors ${
                    i === index ? 'bg-accent' : s.state === 'done' ? 'bg-success' : 'bg-line'
                  }`}
                />
              </button>
            ))}
          </nav>
        </header>

        {/* steps */}
        <div ref={viewport} className="relative flex-1 min-h-0 overflow-hidden touch-pan-y">
          <div ref={track} className="absolute inset-0 will-change-transform" dir="ltr">
            {steps.map((s, i) => (
              <section
                key={s.key}
                ref={el => { slideRefs.current[i] = el }}
                dir="rtl"
                aria-hidden={i !== index}
                className="absolute inset-y-0 w-full overflow-y-auto overscroll-contain"
                style={{ left: `${-i * 100}%` }}
              >
                {/* render only the current step and its neighbours */}
                {Math.abs(i - index) <= 1 ? s.content : null}
              </section>
            ))}
          </div>
        </div>

        {/* actions */}
        <footer className="px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] border-t border-line flex gap-2.5 bg-bg">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="לשלב הקודם"
            className="w-[60px] h-[58px] rounded-2xl border border-line-strong bg-surface text-fg grid place-items-center disabled:opacity-35"
          >
            <LuArrowRight aria-hidden className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className={`flex-1 h-[58px] rounded-2xl text-lg font-extrabold disabled:opacity-50 ${
              primaryTone === 'success' ? 'bg-success text-bg' : 'bg-accent text-on-accent'
            }`}
          >
            {primaryLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
