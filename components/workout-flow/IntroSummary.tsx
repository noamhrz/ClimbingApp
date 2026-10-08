'use client'

// First step (coach note + workout info) and last step (summary + notes) of the workout flow.

import { ReactNode } from 'react'
import { LuAlarmClock, LuCalendarDays, LuInfo, LuMessageSquare, LuMountain, LuNotebookPen, LuRefreshCw, LuTriangleAlert, LuVideo } from 'react-icons/lu'

/* eslint-disable @typescript-eslint/no-explicit-any */

export function IntroStep({ workout, personalNote, dateLine, dateBadge, onMoveToToday, counts }: {
  workout: any
  personalNote: string
  dateLine: string | null
  dateBadge: { text: string; tone: 'past' | 'future' | 'today' } | null
  onMoveToToday?: () => void
  counts: { exercises: number; climbing: boolean }
}) {
  const badgeCls = dateBadge?.tone === 'past' ? 'bg-danger/15 text-danger' : dateBadge?.tone === 'future' ? 'bg-accent/15 text-accent' : 'bg-success/15 text-success'
  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] leading-tight font-extrabold text-balance">{workout.Name}</h2>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {dateLine && <span className="text-fg-3 flex items-center gap-1.5"><LuCalendarDays aria-hidden className="w-4 h-4" />{dateLine}</span>}
          {dateBadge && <span className={`px-3 py-0.5 rounded-full font-semibold ${badgeCls}`}>{dateBadge.text}</span>}
        </div>
        <p className="text-fg-3 text-[15px]">
          {counts.exercises > 0 && `${counts.exercises} תרגילים`}
          {counts.exercises > 0 && counts.climbing && ' · '}
          {counts.climbing && 'רישום טיפוס'}
        </p>
        {onMoveToToday && (
          <button type="button" onClick={onMoveToToday} className="self-start h-11 px-4 rounded-xl bg-accent/15 text-accent font-bold text-sm flex items-center gap-1.5">
            <LuRefreshCw aria-hidden className="w-4 h-4" />העבר להיום
          </button>
        )}
      </div>

      {personalNote && (
        <div className="rounded-2xl border-2 border-accent bg-accent/10 p-4">
          <h3 className="text-lg font-bold text-accent mb-1.5 flex items-center gap-2"><LuMessageSquare aria-hidden className="w-5 h-5" />הערת המאמן אליך</h3>
          <p className="text-fg text-base leading-relaxed whitespace-pre-wrap">{personalNote}</p>
        </div>
      )}
      {workout.Description && (
        <InfoBox icon={<LuNotebookPen aria-hidden className="w-4 h-4" />} title="תיאור האימון">{workout.Description}</InfoBox>
      )}
      {workout.WorkoutNotes && (
        <InfoBox icon={<LuInfo aria-hidden className="w-4 h-4" />} title="הערות כלליות" tone="warning">{workout.WorkoutNotes}</InfoBox>
      )}
      {workout.WhenToPractice && (
        <InfoBox icon={<LuAlarmClock aria-hidden className="w-4 h-4" />} title="מתי להתאמן" tone="success">{workout.WhenToPractice}</InfoBox>
      )}
      {workout.VideoURL && (
        <a href={workout.VideoURL} target="_blank" rel="noopener noreferrer" className="h-12 rounded-xl border border-line bg-surface text-fg-2 font-bold flex items-center justify-center gap-2">
          <LuVideo aria-hidden className="w-5 h-5" />וידאו הדרכה
        </a>
      )}
      <p className="text-center text-[13px] text-faint">החלק ימינה כדי להתחיל</p>
    </div>
  )
}

function InfoBox({ icon, title, tone, children }: { icon: ReactNode; title: string; tone?: 'warning' | 'success'; children: ReactNode }) {
  const cls = tone === 'warning' ? 'border-warning/50 text-warning' : tone === 'success' ? 'border-success/50 text-success' : 'border-line text-fg'
  return (
    <div className={`rounded-2xl border bg-surface p-4 ${cls}`}>
      <h3 className="font-bold mb-1.5 flex items-center gap-2">{icon}{title}</h3>
      <p className="text-fg-2 whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  )
}

export interface SummaryRow { key: string; title: string; text: string | null; onOpen: () => void }

export function SummaryStep({ rows, climbing, climberNotes, onClimberNotes, warning }: {
  rows: SummaryRow[]
  climbing: { text: string; onOpen: () => void } | null
  climberNotes: string
  onClimberNotes: (v: string) => void
  warning: string | null
}) {
  const filled = rows.filter(r => r.text).length
  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-3.5">
      <h2 className="text-[28px] font-extrabold">סיכום האימון</h2>
      {rows.length > 0 && (
        <p className="text-[15px] text-muted">{filled} מתוך {rows.length} תרגילים מולאו. לחיצה על תרגיל חוזרת אליו.</p>
      )}
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <button key={r.key} type="button" onClick={r.onOpen} className="flex items-center gap-3 text-right min-h-[60px] px-3.5 py-2.5 rounded-2xl border border-line bg-surface">
            <span className={`w-3 h-3 rounded-full shrink-0 ${r.text ? 'bg-success' : 'bg-line-strong'}`} />
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-base font-bold">{r.title}</span>
              <span className="text-sm text-muted">{r.text ?? 'לא מולא'}</span>
            </span>
            <span className="text-[13px] text-accent font-bold">עריכה</span>
          </button>
        ))}
        {climbing && (
          <button type="button" onClick={climbing.onOpen} className="flex items-center gap-3 text-right min-h-[60px] px-3.5 py-2.5 rounded-2xl border border-line bg-surface">
            <LuMountain aria-hidden className="w-5 h-5 text-info shrink-0" />
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-base font-bold">טיפוס</span>
              <span className="text-sm text-muted">{climbing.text}</span>
            </span>
            <span className="text-[13px] text-accent font-bold">עריכה</span>
          </button>
        )}
      </div>
      <label htmlFor="climberNotes" className="text-[15px] font-bold text-fg-2 pt-1">איך היה האימון?</label>
      <textarea
        id="climberNotes"
        rows={3}
        value={climberNotes}
        onChange={e => onClimberNotes(e.target.value)}
        placeholder="תחושות, הישגים, כאבים…"
        className="w-full rounded-2xl border-2 border-line-strong bg-surface text-fg text-base px-3 py-2.5 resize-none focus:outline-none focus:border-accent"
      />
      {warning && (
        <p className="text-danger text-sm flex items-center gap-1.5"><LuTriangleAlert aria-hidden className="w-4 h-4" />{warning}</p>
      )}
    </div>
  )
}
