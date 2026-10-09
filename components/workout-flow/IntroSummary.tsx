'use client'

// First step (coach note + workout info) and last step (summary + notes) of the workout flow.

import { ReactNode } from 'react'
import LocationPicker from './LocationPicker'
import { LuCopy, LuMapPin, LuTrophy, LuAlarmClock, LuCalendarDays, LuInfo, LuMessageSquare, LuMountain, LuNotebookPen, LuRefreshCw, LuTriangleAlert, LuVideo } from 'react-icons/lu'

/* eslint-disable @typescript-eslint/no-explicit-any */

export function IntroStep({ workout, personalNote, dateLine, dateBadge, onMoveToToday, counts, fillFromLast }: {
  workout: any
  fillFromLast?: { count: number; total: number; date: string | null; onFill: () => void }
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

      {fillFromLast && fillFromLast.count > 0 && (
        <div className="rounded-2xl border border-line-strong bg-raised p-4 flex flex-col gap-3">
          <div>
            <h3 className="text-base font-extrabold">כמו בפעם הקודמת?</h3>
            <p className="text-sm text-fg-3 mt-0.5">
              ממלא את {fillFromLast.count === fillFromLast.total ? 'כל התרגילים' : `${fillFromLast.count} מתוך ${fillFromLast.total} התרגילים`} בערכים
              {fillFromLast.date ? ` מ-${fillFromLast.date}` : ' מהפעם הקודמת'}, ומעביר לסיכום. משם נכנסים רק למה שהשתנה.
            </p>
          </div>
          <button type="button" onClick={fillFromLast.onFill} className="h-12 rounded-xl bg-accent text-on-accent font-extrabold flex items-center justify-center gap-2">
            <LuCopy aria-hidden className="w-5 h-5" />מלא הכל כמו בפעם הקודמת
          </button>
        </div>
      )}

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
      <p className="text-center text-[13px] text-faint">״התחל״ למטה, או החלקה ימינה</p>
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

export interface ClimbGroup { key: string; type: 'Boulder' | 'Board' | 'Lead'; grade: string; count: number; attempts: number }
export interface ClimbDetail {
  total: number; sent: number; attempts: number
  sentGroups: ClimbGroup[]; failedGroups: ClimbGroup[]
  onOpen: () => void
}

const TYPE_STYLE: Record<ClimbGroup['type'], { label: string; pill: string }> = {
  Boulder: { label: 'בולדר', pill: 'bg-accent/15 text-accent border-accent/40' },
  Board: { label: 'בורד', pill: 'bg-warning/15 text-warning border-warning/40' },
  Lead: { label: 'הובלה', pill: 'bg-info/15 text-info border-info/40' },
}

function ClimbCard({ c }: { c: ClimbDetail }) {
  const manyTypes = new Set([...c.sentGroups, ...c.failedGroups].map(g => g.type)).size > 1
  const row = (g: ClimbGroup) => (
    <li key={g.key} className="flex items-center gap-2.5 py-1.5">
      <span className={`shrink-0 min-w-[52px] h-8 px-2 rounded-lg border text-[15px] font-extrabold grid place-items-center tabular-nums ${TYPE_STYLE[g.type].pill}`}>
        {g.grade}
      </span>
      <span className="flex-1 text-[15px] text-fg">
        <b className="font-extrabold tabular-nums">{g.count}</b> {g.count === 1 ? 'מסלול' : 'מסלולים'}
        {manyTypes && <span className="text-muted text-[13px]"> · {TYPE_STYLE[g.type].label}</span>}
      </span>
      <span className="text-sm text-muted tabular-nums">{g.attempts} {g.attempts === 1 ? 'ניסיון' : 'ניסיונות'}</span>
    </li>
  )
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <LuMountain aria-hidden className="w-5 h-5 text-info shrink-0" />
        <h3 className="flex-1 text-base font-extrabold">טיפוס</h3>
        <button type="button" onClick={c.onOpen} className="h-9 px-3 -my-1 rounded-lg text-[13px] text-accent font-bold">עריכה</button>
      </div>

      {c.total === 0 ? (
        <p className="text-sm text-muted">עוד לא נרשמו מסלולים.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { n: c.total, l: 'מסלולים' },
              { n: c.sent, l: 'נסגרו', cls: 'text-success' },
              { n: c.attempts, l: 'ניסיונות' },
            ].map(x => (
              <div key={x.l} className="rounded-xl bg-raised py-2">
                <div className={`text-2xl font-extrabold tabular-nums ${x.cls ?? ''}`}>{x.n}</div>
                <div className="text-xs text-muted">{x.l}</div>
              </div>
            ))}
          </div>

          {c.sentGroups.length > 0 && (
            <div>
              <h4 className="text-[13px] font-bold text-success flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" />נסגרו</h4>
              <ul className="divide-y divide-line">{c.sentGroups.map(row)}</ul>
            </div>
          )}
          {c.failedGroups.length > 0 && (
            <div>
              <h4 className="text-[13px] font-bold text-danger flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" />לא נסגרו</h4>
              <ul className="divide-y divide-line">{c.failedGroups.map(row)}</ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export interface SummaryRow { key: string; title: string; text: string | null; pr?: boolean; onOpen: () => void }

export function SummaryStep({ rows, climbing, climberNotes, onClimberNotes, warning, location }: {
  rows: SummaryRow[]
  // shown when climbing routes were logged without a location
  location?: { locations: { LocationID: number; LocationName: string }[]; onChange: (id: number | null) => void; onAdd: (name?: string) => void } | null
  climbing: ClimbDetail | null
  climberNotes: string
  onClimberNotes: (v: string) => void
  warning: string | null
}) {
  const filled = rows.filter(r => r.text).length
  const prs = rows.filter(r => r.pr).length
  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-3.5">
      <h2 className="text-[28px] font-extrabold">סיכום האימון</h2>
      {rows.length > 0 && (
        <p className="text-[15px] text-muted">{filled} מתוך {rows.length} תרגילים מולאו. לחיצה על תרגיל חוזרת אליו.</p>
      )}
      {prs > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-success/12 border border-success/40 text-success font-extrabold px-3.5 py-2.5">
          <LuTrophy aria-hidden className="w-5 h-5" />{prs === 1 ? 'שיא חדש אחד באימון הזה!' : `${prs} שיאים חדשים באימון הזה!`}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <button key={r.key} type="button" onClick={r.onOpen} className="flex items-center gap-3 text-right min-h-[60px] px-3.5 py-2.5 rounded-2xl border border-line bg-surface">
            <span className={`w-3 h-3 rounded-full shrink-0 ${r.text ? 'bg-success' : 'bg-line-strong'}`} />
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-base font-bold flex items-center gap-1.5 flex-wrap">
                {r.title}
                {r.pr && <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success text-xs font-extrabold px-2 py-0.5"><LuTrophy aria-hidden className="w-3.5 h-3.5" />שיא חדש</span>}
              </span>
              <span className="text-sm text-muted">{r.text ?? 'לא מולא'}</span>
            </span>
            <span className="text-[13px] text-accent font-bold">עריכה</span>
          </button>
        ))}
      </div>
      {location && (
        <section className="rounded-2xl border-2 border-danger/70 bg-danger/10 p-4 flex flex-col gap-2.5">
          <p className="font-extrabold text-fg flex items-center gap-2">
            <LuMapPin aria-hidden className="w-5 h-5 text-danger" />איפה טיפסת?
          </p>
          <p className="text-sm text-fg-3 -mt-1">צריך לבחור מיקום כדי לשמור את המסלולים.</p>
          <LocationPicker
            id="summary-location"
            locations={location.locations}
            value={null}
            onChange={location.onChange}
            onAddNew={location.onAdd}
            tone="large"
          />
        </section>
      )}
      {climbing && <ClimbCard c={climbing} />}
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
