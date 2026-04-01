'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import {
  getAnalysis, upsertAnalysis, deleteAnalysis,
  ClimbingAnalysis, ThirdByMoves, ThirdByTime, RestPeriod,
} from '@/lib/climbing-analysis-api'
import MediaComments from '@/components/media/MediaComments'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Move { hand: 'L' | 'R'; time: number }
interface Clip { startTime: number; endTime: number; duration: number }

interface MediaFile {
  FileID: number
  Email: string
  FileName: string
  MimeType: string
}

interface Metrics {
  TotalMoves: number
  LeftMoves: number
  RightMoves: number
  ClimbDuration: number
  ActiveTime: number
  RestTime: number
  AvgPaceOverall: number
  AvgPaceLeft: number
  AvgPaceRight: number
  StallsShort: number
  StallsLong: number
  ThirdsByMoves: ThirdByMoves[]
  ThirdsByTime: ThirdByTime[]
  TotalClips: number
  AvgClipDuration: number
  LongestClip: number
  LongestClipStartTime: number | null
  ClippingTime: number
  MovementTime: number
  StallTime: number
  restPeriods: RestPeriod[]
}

type ScoreKey = 'ScorePrecision' | 'ScoreClipping' | 'ScoreTension' | 'ScoreFlow' |
  'ScoreMomentum' | 'ScoreHips' | 'ScoreSolid' | 'ScoreCommitment'

const SCORE_LABELS: [ScoreKey, string][] = [
  ['ScorePrecision', 'דיוק'],
  ['ScoreClipping', 'הקלפה'],
  ['ScoreTension', 'מתח גוף'],
  ['ScoreFlow', 'זרימה'],
  ['ScoreMomentum', 'אינרציה'],
  ['ScoreHips', 'אגן'],
  ['ScoreSolid', 'סולידיות'],
  ['ScoreCommitment', 'ביטחון ומחויבות'],
]

const STALL_THRESHOLD = 7
const LONG_STALL = 15
const INEFFICIENT_CLIP = 10
const THIRDS_COLORS = ['bg-green-400', 'bg-yellow-400', 'bg-red-500']
const THIRDS_TEXT = ['text-green-700', 'text-yellow-700', 'text-red-700']
const THIRDS_LABELS = ['שליש א׳', 'שליש ב׳', 'שליש ג׳']

// ── Pure helpers ───────────────────────────────────────────────────────────────

function fmtSec(s: number): string {
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const r = (s % 60).toFixed(0).padStart(2, '0')
  return `${m}:${r}`
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

// startTime = when ↑ was pressed, endTime = when ↓ was pressed.
// lastGap (from last L/R to endTime) is included in active/rest and stall counts.
function calculateMetrics(moves: Move[], startTime: number, endTime: number, clips: Clip[]): Metrics {
  const T0 = startTime
  const Tn = endTime
  const ClimbDuration = Tn - T0
  const N = moves.length

  // Raw gaps (used for ThirdsByMoves time-span calculations)
  const midGaps = N > 1 ? moves.slice(1).map((m, i) => m.time - moves[i].time) : []
  const lastGap = N > 0 ? Tn - moves[N - 1].time : 0

  // Clip overlap within a time window — so a clip that occurred during a rest
  // doesn't inflate the rest classification or duration.
  const clipOverlapInWindow = (ws: number, we: number) =>
    clips.reduce((sum, c) => sum + Math.max(0, Math.min(c.endTime, we) - Math.max(c.startTime, ws)), 0)

  // One entry per inter-move gap, carrying the net (clip-adjusted) duration.
  const gapWindows: Array<{
    netGap: number; windowStart: number; windowEnd: number; afterMoveIndex: number
  }> = []
  for (let i = 0; i < N - 1; i++) {
    const ws = moves[i].time, we = moves[i + 1].time
    gapWindows.push({ netGap: Math.max(0, (we - ws) - clipOverlapInWindow(ws, we)), windowStart: ws, windowEnd: we, afterMoveIndex: i })
  }
  if (N > 0) {
    const ws = moves[N - 1].time
    gapWindows.push({ netGap: Math.max(0, lastGap - clipOverlapInWindow(ws, Tn)), windowStart: ws, windowEnd: Tn, afterMoveIndex: N - 1 })
  }

  // ActiveTime / RestTime now reflect net non-clipping time only
  const ActiveTime = gapWindows.filter(g => g.netGap < STALL_THRESHOLD).reduce((s, g) => s + g.netGap, 0)
  const RestTime   = gapWindows.filter(g => g.netGap >= STALL_THRESHOLD).reduce((s, g) => s + g.netGap, 0)

  // Build rest periods classified by net gap
  const restPeriods: RestPeriod[] = gapWindows
    .filter(g => g.netGap >= STALL_THRESHOLD)
    .map((g, idx) => ({
      index: idx,
      afterMoveIndex: g.afterMoveIndex,
      startTime: g.windowStart,
      endTime: g.windowEnd,
      duration: g.netGap,
      type: (g.netGap >= LONG_STALL ? 'rest' : 'tactical') as RestPeriod['type'],
    }))
  const StallTime = restPeriods.filter(r => r.type === 'tactical').reduce((s, r) => s + r.duration, 0)

  const leftTimes = moves.filter(m => m.hand === 'L').map(m => m.time)
  const rightTimes = moves.filter(m => m.hand === 'R').map(m => m.time)
  const leftGaps = leftTimes.slice(1).map((t, i) => t - leftTimes[i])
  const rightGaps = rightTimes.slice(1).map((t, i) => t - rightTimes[i])

  const thirdSize = Math.ceil(N / 3)
  const moveGroups = N > 0 ? [
    moves.slice(0, thirdSize),
    moves.slice(thirdSize, 2 * thirdSize),
    moves.slice(2 * thirdSize),
  ].filter(g => g.length > 0) : []

  const ThirdsByMoves: ThirdByMoves[] = moveGroups.map((group, gi) => {
    const isLast = gi === moveGroups.length - 1
    const gGaps = group.slice(1).map((m, i) => m.time - group[i].time)
    // Extend the last group's analysis to include the final hold time
    const groupGaps = isLast ? [...gGaps, lastGap] : gGaps
    const active = groupGaps.filter(g => g < STALL_THRESHOLD).reduce((a, b) => a + b, 0)
    const rest = groupGaps.filter(g => g >= STALL_THRESHOLD).reduce((a, b) => a + b, 0)
    const groupEnd = isLast ? Tn : group[group.length - 1].time
    const duration = group.length > 0 ? groupEnd - group[0].time : 0
    return {
      move_count: group.length,
      avg_pace: group.length > 0 ? duration / group.length : 0,
      climb_to_rest_ratio: rest > 0 ? parseFloat((active / rest).toFixed(2)) : null,
      duration,
    }
  })

  const thirdDur = ClimbDuration / 3
  const ThirdsByTime: ThirdByTime[] = [0, 1, 2].map(i => {
    const start = T0 + i * thirdDur
    const end = i === 2 ? Tn + 0.001 : T0 + (i + 1) * thirdDur
    const group = moves.filter(m => m.time >= start && m.time < end)
    const gGaps = group.slice(1).map((m, j) => m.time - group[j].time)
    // For last time-third, include gap from last move to window end
    const lastInThird = i === 2 && group.length > 0 ? Tn - group[group.length - 1].time : 0
    const active = [...gGaps, ...(lastInThird > 0 ? [lastInThird] : [])].filter(g => g < STALL_THRESHOLD).reduce((a, b) => a + b, 0)
    const dur = end - start
    const gDur = group.length > 1 ? group[group.length - 1].time - group[0].time : 0
    return {
      move_count: group.length,
      avg_pace: group.length > 1 ? gDur / group.length : null,
      efficiency_score: parseFloat((dur > 0 ? active / dur : 0).toFixed(3)),
    }
  })

  const ClippingTime = clips.reduce((s, c) => s + c.duration, 0)
  const longestClipObj = clips.length > 0 ? clips.reduce((a, b) => a.duration > b.duration ? a : b) : null

  return {
    TotalMoves: N,
    LeftMoves: leftTimes.length,
    RightMoves: rightTimes.length,
    ClimbDuration,
    ActiveTime,
    RestTime,
    AvgPaceOverall: N > 0 ? ClimbDuration / N : 0,
    AvgPaceLeft: avg(leftGaps),
    AvgPaceRight: avg(rightGaps),
    StallsShort: gapWindows.filter(g => g.netGap >= STALL_THRESHOLD && g.netGap < LONG_STALL).length,
    StallsLong: gapWindows.filter(g => g.netGap >= LONG_STALL).length,
    ThirdsByMoves,
    ThirdsByTime,
    TotalClips: clips.length,
    AvgClipDuration: clips.length > 0 ? avg(clips.map(c => c.duration)) : 0,
    LongestClip: longestClipObj?.duration ?? 0,
    LongestClipStartTime: longestClipObj?.startTime ?? null,
    ClippingTime,
    // Remainder ensures ClippingTime + MovementTime + RestTime = ClimbDuration exactly,
    // regardless of clips that fall outside gap windows (e.g. before first move).
    MovementTime: Math.max(0, ClimbDuration - ClippingTime - RestTime),
    StallTime,
    restPeriods,
  }
}

function analysisToMetrics(a: ClimbingAnalysis): Metrics | null {
  if (!a.TotalMoves || !a.ClimbDuration) return null
  const leftMoves = a.RawLogJson?.filter(m => m.hand === 'L').length ?? Math.round(a.TotalMoves / 2)
  const rightMoves = a.RawLogJson?.filter(m => m.hand === 'R').length ?? (a.TotalMoves - Math.round(a.TotalMoves / 2))
  return {
    TotalMoves: a.TotalMoves,
    LeftMoves: leftMoves,
    RightMoves: rightMoves,
    ClimbDuration: a.ClimbDuration,
    ActiveTime: a.ActiveTime ?? 0,
    RestTime: a.RestTime ?? 0,
    AvgPaceOverall: a.AvgPaceOverall ?? 0,
    AvgPaceLeft: a.AvgPaceLeft ?? 0,
    AvgPaceRight: a.AvgPaceRight ?? 0,
    StallsShort: a.StallsShort ?? 0,
    StallsLong: a.StallsLong ?? 0,
    ThirdsByMoves: a.ThirdsByMoves ?? [],
    ThirdsByTime: a.ThirdsByTime ?? [],
    TotalClips: a.TotalClips ?? 0,
    AvgClipDuration: a.AvgClipDuration ?? 0,
    LongestClip: a.LongestClip ?? 0,
    LongestClipStartTime: null,
    ClippingTime: a.ClippingTime ?? 0,
    MovementTime: Math.max(0, (a.ClimbDuration ?? 0) - (a.ClippingTime ?? 0) - (a.RestTime ?? 0)),
    StallTime: a.StallTime ?? 0,
    restPeriods: a.RestPeriodsJson ?? [],
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TimeBreakdownBar({
  metrics,
  classifiedRests,
}: {
  metrics: Metrics
  classifiedRests: RestPeriod[]
}) {
  const { ClimbDuration, MovementTime, ClippingTime, RestTime, StallTime } = metrics
  if (ClimbDuration <= 0) return null

  const stallTime = classifiedRests.length > 0
    ? classifiedRests.filter(r => r.type === 'tactical').reduce((s, r) => s + r.duration, 0)
    : StallTime
  const hesitationTime = classifiedRests.filter(r => r.type === 'hesitation').reduce((s, r) => s + r.duration, 0)
  const footworkTime = classifiedRests.filter(r => r.type === 'footwork').reduce((s, r) => s + r.duration, 0)
  // Physical rest = all classified rest periods minus tactical, hesitation, and footwork
  const physicalRestTime = Math.max(0, RestTime - stallTime - hesitationTime - footworkTime)
  // Footwork pauses count as movement (climber is actively adjusting feet)
  const displayMovementTime = MovementTime + footworkTime

  const pct = (v: number) => `${Math.max(0, (v / ClimbDuration) * 100).toFixed(1)}%`

  const segments = [
    { label: 'הקלפה', value: ClippingTime, color: 'bg-yellow-400', text: 'text-yellow-700' },
    { label: 'תנועה', value: displayMovementTime, color: 'bg-emerald-400', text: 'text-emerald-700' },
    { label: 'עצירה', value: stallTime, color: 'bg-orange-400', text: 'text-orange-700' },
    { label: 'מנוחה', value: physicalRestTime, color: 'bg-red-400', text: 'text-red-700' },
    { label: 'היסוס', value: hesitationTime, color: 'bg-purple-400', text: 'text-purple-700' },
  ].filter(s => s.value > 0.01)

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden">
        {segments.map((s, i) => (
          <div key={i} className={`${s.color} transition-all`} style={{ width: pct(s.value) }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
        {segments.map((s, i) => (
          <span key={i} className={`text-[10px] ${s.text}`}>
            {s.label}: {fmtSec(s.value)} ({(s.value / ClimbDuration * 100).toFixed(0)}%)
          </span>
        ))}
      </div>
    </div>
  )
}

function RestPeriodsList({
  classifiedRests,
  onToggle,
  onSeek,
}: {
  classifiedRests: RestPeriod[]
  onToggle: (idx: number, targetType: 'rest' | 'hesitation' | 'footwork' | 'tactical') => void
  onSeek?: (t: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  if (classifiedRests.length === 0) return null

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
        <span>פירוט מנוחות ({classifiedRests.length})</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {classifiedRests.map(r => (
            <div key={r.index} className="flex items-center gap-2 text-xs">
              <button
                onClick={() => onSeek?.(r.startTime)}
                className="text-blue-500 hover:text-blue-700 underline shrink-0 font-mono"
                title="קפוץ לנקודה זו בסרטון"
              >
                {fmtSec(r.startTime)}
              </button>
              <span className="text-gray-400 shrink-0">↔ {r.afterMoveIndex + 1}</span>
              <span className={`shrink-0 font-semibold ${
                r.type === 'tactical' ? 'text-orange-500' :
                r.type === 'hesitation' ? 'text-purple-600' :
                r.type === 'footwork' ? 'text-emerald-600' : 'text-red-500'
              }`}>{fmtSec(r.duration)}</span>
              <div className="flex gap-1 mr-auto flex-wrap">
                {(
                  [
                    { key: 'rest',      label: 'מנוחה',        active: 'bg-red-100 border-red-300 text-red-700',         idle: 'hover:border-red-300 hover:text-red-500' },
                    { key: 'hesitation',label: 'היסוס',        active: 'bg-purple-100 border-purple-300 text-purple-700', idle: 'hover:border-purple-300 hover:text-purple-500' },
                    { key: 'footwork',  label: 'רגליים',       active: 'bg-emerald-100 border-emerald-300 text-emerald-700', idle: 'hover:border-emerald-300 hover:text-emerald-500' },
                    { key: 'tactical',  label: 'עצירה טקטית', active: 'bg-orange-100 border-orange-300 text-orange-700', idle: 'hover:border-orange-300 hover:text-orange-500' },
                  ] as const
                ).map(btn => (
                  <button
                    key={btn.key}
                    onClick={() => onToggle(r.index, btn.key)}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      r.type === btn.key
                        ? `${btn.active} font-semibold`
                        : `bg-white border-gray-200 text-gray-400 ${btn.idle}`
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OverallSummary({
  metrics, isTop, classifiedRests, onSeek, onToggleRest,
}: {
  metrics: Metrics
  isTop?: boolean
  classifiedRests: RestPeriod[]
  onSeek?: (t: number) => void
  onToggleRest?: (idx: number, targetType: 'rest' | 'hesitation' | 'footwork' | 'tactical') => void
}) {
  const leftPct = metrics.TotalMoves > 0 ? (metrics.LeftMoves / metrics.TotalMoves) * 100 : 50

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {/* Total moves + L/R bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-gray-500">סה״כ מהלכים</span>
          <span className="text-2xl font-black text-gray-900">{metrics.TotalMoves}</span>
        </div>
        <div className="flex h-5 rounded-full overflow-hidden">
          <div
            className="bg-blue-400 flex items-center justify-center text-[11px] text-white font-bold"
            style={{ width: `${leftPct}%` }}
          >
            {metrics.LeftMoves > 2 && metrics.LeftMoves}
          </div>
          <div
            className="bg-red-400 flex items-center justify-center text-[11px] text-white font-bold"
            style={{ width: `${100 - leftPct}%` }}
          >
            {metrics.RightMoves > 2 && metrics.RightMoves}
          </div>
        </div>
        <div className="flex justify-between text-[11px] mt-0.5 text-gray-500">
          <span className="text-blue-600">שמאל: {metrics.LeftMoves}</span>
          <span className="text-red-500">ימין: {metrics.RightMoves}</span>
        </div>
      </div>

      {/* Duration + 5-segment breakdown bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-gray-500">משך טיפוס</span>
          <span className="text-lg font-bold text-gray-800">{fmtSec(metrics.ClimbDuration)}</span>
        </div>
        <TimeBreakdownBar metrics={metrics} classifiedRests={classifiedRests} />
      </div>

      {/* Pace */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-gray-800">{fmtSec(metrics.AvgPaceOverall)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">קצב כולל</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-blue-700">
            {metrics.AvgPaceLeft > 0 ? fmtSec(metrics.AvgPaceLeft) : '—'}
          </div>
          <div className="text-[10px] text-blue-500 mt-0.5">קצב שמאל</div>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-red-600">
            {metrics.AvgPaceRight > 0 ? fmtSec(metrics.AvgPaceRight) : '—'}
          </div>
          <div className="text-[10px] text-red-400 mt-0.5">קצב ימין</div>
        </div>
      </div>

      {/* Stalls + IsTop */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-gray-600">
          <span>עצירות קצרות: <strong>{metrics.StallsShort}</strong></span>
          <span>
            ארוכות: <strong className={metrics.StallsLong > 0 ? 'text-red-600' : ''}>{metrics.StallsLong}</strong>
          </span>
        </div>
        {isTop !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isTop ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {isTop ? '✓ הגיע לראש' : '✗ לא הגיע לראש'}
          </span>
        )}
      </div>

      {/* Clips */}
      {metrics.TotalClips > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 font-medium">הקלפות</span>
            <span className="text-sm font-bold text-yellow-700">{metrics.TotalClips}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-yellow-700">{fmtSec(metrics.AvgClipDuration)}</div>
              <div className="text-[10px] text-yellow-600 mt-0.5">ממוצע</div>
            </div>
            <div
              className={`rounded-lg p-2 text-center ${metrics.LongestClipStartTime !== null ? 'cursor-pointer hover:ring-1 hover:ring-blue-200' : ''} ${metrics.LongestClip > INEFFICIENT_CLIP ? 'bg-red-50' : 'bg-yellow-50'}`}
              onClick={() => metrics.LongestClipStartTime !== null && onSeek?.(metrics.LongestClipStartTime)}
              title={metrics.LongestClipStartTime !== null ? 'לחץ לדילוג לנקודה זו' : undefined}
            >
              <div className={`text-sm font-bold ${metrics.LongestClip > INEFFICIENT_CLIP ? 'text-red-600' : 'text-yellow-700'}`}>
                {fmtSec(metrics.LongestClip)}
                {metrics.LongestClip > INEFFICIENT_CLIP && ' ⚠'}
              </div>
              {metrics.LongestClipStartTime !== null && (
                <div className="text-[10px] text-blue-500">@ {fmtSec(metrics.LongestClipStartTime)}</div>
              )}
              <div className="text-[10px] text-gray-500 mt-0.5">ארוכה ביותר</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-yellow-700">{fmtSec(metrics.ClippingTime)}</div>
              <div className="text-[10px] text-yellow-600 mt-0.5">סה״כ זמן</div>
            </div>
          </div>
          {metrics.MovementTime > 0 && (
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">
              זמן תנועה טהור: <strong className="text-gray-600">{fmtSec(metrics.MovementTime)}</strong>
            </p>
          )}
        </div>
      )}

      {/* Rest periods list — Tasks 5 & 7 */}
      <RestPeriodsList
        classifiedRests={classifiedRests}
        onToggle={onToggleRest ?? (() => {})}
        onSeek={onSeek}
      />
    </div>
  )
}

function ScoreSlider({ label, value, onChange, disabled }: {
  label: string; value: number; onChange: (v: number) => void; disabled?: boolean
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-gray-700">{label}</label>
        <span className={`text-sm font-bold px-2 py-0.5 rounded-md min-w-[2rem] text-center ${
          value >= 4 ? 'bg-green-100 text-green-700' :
          value <= 2 ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>{value}</span>
      </div>
      <input
        type="range" min={1} max={5} step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-blue-600 disabled:opacity-50 h-2 cursor-pointer"
      />
    </div>
  )
}

function ThirdsViz({ metrics }: { metrics: Metrics }) {
  const { ThirdsByMoves: byMoves, ThirdsByTime: byTime, ClimbDuration } = metrics
  if (!byMoves.length && !byTime.length) return null

  const totalDur = byMoves.reduce((s, t) => s + t.duration, 0) || ClimbDuration

  return (
    <div className="mt-4 space-y-5">
      <h4 className="text-sm font-semibold text-gray-700">ניתוח שלבי טיפוס</h4>

      {/* By moves */}
      {byMoves.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">לפי מהלכים</p>
          <div className="flex h-8 rounded-lg overflow-hidden gap-px">
            {byMoves.map((t, i) => (
              <div
                key={i}
                className={`${THIRDS_COLORS[i]} flex items-center justify-center text-xs text-white font-bold`}
                style={{ width: `${(t.duration / totalDur) * 100}%` }}
              >
                {t.move_count}
              </div>
            ))}
          </div>
          <div className="flex mt-1">
            {byMoves.map((t, i) => (
              <div
                key={i}
                className="text-center text-xs"
                style={{ width: `${(t.duration / totalDur) * 100}%` }}
              >
                <div className={`font-medium text-[11px] ${THIRDS_TEXT[i]}`}>{THIRDS_LABELS[i]}</div>
                <div className="text-gray-600">{t.move_count} מהלכים</div>
                <div className="text-gray-500">{fmtSec(t.avg_pace)}/מהלך</div>
                {t.climb_to_rest_ratio !== null
                  ? <div className="text-gray-400">פעילות: {t.climb_to_rest_ratio}x</div>
                  : <div className="text-gray-400">ללא עצירות</div>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By time */}
      {byTime.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">לפי זמן (שליש שווים)</p>
          <div className="flex h-8 rounded-lg overflow-hidden gap-px">
            {byTime.map((t, i) => (
              <div
                key={i}
                className={`${THIRDS_COLORS[i]} flex-1 flex items-center justify-center text-xs text-white font-bold`}
              >
                {t.move_count}
              </div>
            ))}
          </div>
          <div className="flex mt-1">
            {byTime.map((t, i) => (
              <div key={i} className="flex-1 text-center text-xs">
                <div className={`font-medium text-[11px] ${THIRDS_TEXT[i]}`}>{THIRDS_LABELS[i]}</div>
                <div className="text-gray-600">{t.move_count} מהלכים</div>
                {t.avg_pace !== null && <div className="text-gray-500">{fmtSec(t.avg_pace)}/מהלך</div>}
                <div className="text-gray-400">יעילות: {(t.efficiency_score * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricsDisplay({
  metrics, isTop, classifiedRests, onSeek, onToggleRest,
}: {
  metrics: Metrics
  isTop?: boolean
  classifiedRests: RestPeriod[]
  onSeek?: (t: number) => void
  onToggleRest?: (idx: number, targetType: 'rest' | 'hesitation' | 'footwork' | 'tactical') => void
}) {
  return (
    <div>
      <OverallSummary
        metrics={metrics}
        isTop={isTop}
        classifiedRests={classifiedRests}
        onSeek={onSeek}
        onToggleRest={onToggleRest}
      />
      <ThirdsViz metrics={metrics} />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const { currentUser } = useAuth()
  const fileId = Number(params.fileId)

  // ── Data ──────────────────────────────────────────────────────
  const [fileRecord, setFileRecord] = useState<MediaFile | null>(null)
  const [analysis, setAnalysis] = useState<ClimbingAnalysis | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)

  // ── Session ───────────────────────────────────────────────────
  // States: idle → (↑) → active → (L/R/C moves) → active → (↓) → ended
  const [moves, setMoves] = useState<Move[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'ended'>('idle')
  const [liveMetrics, setLiveMetrics] = useState<Metrics | null>(null)
  const [flashSide, setFlashSide] = useState<'L' | 'R' | null>(null)
  const [flashClip, setFlashClip] = useState(false)
  const [clipInProgress, setClipInProgress] = useState(false)
  const sessionStateRef = useRef<'idle' | 'active' | 'ended'>('idle')
  useEffect(() => { sessionStateRef.current = sessionState }, [sessionState])
  const movesRef = useRef<Move[]>([])
  useEffect(() => { movesRef.current = moves }, [moves])
  const clipsRef = useRef<Clip[]>([])
  useEffect(() => { clipsRef.current = clips }, [clips])
  const startTimeRef = useRef<number>(0)
  const clipStartRef = useRef<number | null>(null) // null = not clipping, number = clip in progress
  const [classifiedRests, setClassifiedRests] = useState<RestPeriod[]>([])

  // ── Qualitative ───────────────────────────────────────────────
  const [tab, setTab] = useState<'quantitative' | 'qualitative'>('quantitative')
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    ScorePrecision: 3, ScoreClipping: 3, ScoreTension: 3, ScoreFlow: 3,
    ScoreMomentum: 3, ScoreHips: 3, ScoreSolid: 3, ScoreCommitment: 3,
  })
  const [isTop, setIsTop] = useState(false)
  const [coachComment, setCoachComment] = useState('')
  const [climberComment, setClimberComment] = useState('')

  // ── Save / Delete ─────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const seekTo = useCallback((t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t
  }, [])

  const isCoachOrAdmin = currentUser?.Role === 'coach' || currentUser?.Role === 'admin'
  const canCapture = !!isCoachOrAdmin
  const storedMetrics = analysis ? analysisToMetrics(analysis) : null
  const activeMetrics = liveMetrics ?? storedMetrics
  const canShowQualitative = activeMetrics !== null || analysis !== null

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!fileId || isNaN(fileId)) return

    async function load() {
      const [{ data: file }, analysisData, { data: { session } }] = await Promise.all([
        supabase.from('MediaFiles').select('FileID, Email, FileName, MimeType').eq('FileID', fileId).single(),
        getAnalysis(fileId),
        supabase.auth.getSession(),
      ])

      if (!file) { router.push('/media'); return }
      setFileRecord(file)
      setToken(session?.access_token ?? '')

      if (analysisData) {
        setAnalysis(analysisData)
        setScores({
          ScorePrecision: analysisData.ScorePrecision ?? 3,
          ScoreClipping: analysisData.ScoreClipping ?? 3,
          ScoreTension: analysisData.ScoreTension ?? 3,
          ScoreFlow: analysisData.ScoreFlow ?? 3,
          ScoreMomentum: analysisData.ScoreMomentum ?? 3,
          ScoreHips: analysisData.ScoreHips ?? 3,
          ScoreSolid: analysisData.ScoreSolid ?? 3,
          ScoreCommitment: analysisData.ScoreCommitment ?? 3,
        })
        setIsTop(analysisData.IsTop ?? false)
        setCoachComment(analysisData.CoachComment ?? '')
        setClimberComment(analysisData.ClimberComment ?? '')
        setClassifiedRests(analysisData.RestPeriodsJson ?? [])
      }

      setLoading(false)
    }

    load()
  }, [fileId, router])

  // Keep token up to date on refresh
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setToken(session?.access_token ?? '')
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Session actions ───────────────────────────────────────────
  const recordMove = useCallback((hand: 'L' | 'R') => {
    const video = videoRef.current
    if (!video || video.paused || video.ended) return
    if (sessionStateRef.current !== 'active') return

    setMoves(prev => [...prev, { hand, time: video.currentTime }])
    setFlashSide(hand)
    setTimeout(() => setFlashSide(null), 300)
  }, [])

  const endSession = useCallback(() => {
    if (sessionStateRef.current !== 'active') return
    const video = videoRef.current
    if (!video) return
    const current = movesRef.current
    if (current.length < 1) return
    // Close any in-progress clip
    const currentClips = clipsRef.current
    if (clipStartRef.current !== null) {
      const duration = video.currentTime - clipStartRef.current
      currentClips.push({ startTime: clipStartRef.current, endTime: video.currentTime, duration })
      clipStartRef.current = null
      setClipInProgress(false)
      clipsRef.current = [...currentClips]
      setClips([...currentClips])
    }
    try {
      const m = calculateMetrics(current, startTimeRef.current, video.currentTime, clipsRef.current)
      setLiveMetrics(m)
      setClassifiedRests(m.restPeriods)
      setSessionState('ended')
    } catch {
      // not enough data
    }
  }, [])

  const handleClip = useCallback(() => {
    if (sessionStateRef.current !== 'active') return
    const video = videoRef.current
    if (!video || video.paused || video.ended) return

    setFlashClip(true)
    setTimeout(() => setFlashClip(false), 300)

    if (clipStartRef.current === null) {
      // Start clip
      clipStartRef.current = video.currentTime
      setClipInProgress(true)
    } else {
      // End clip
      const duration = video.currentTime - clipStartRef.current
      const clip: Clip = { startTime: clipStartRef.current, endTime: video.currentTime, duration }
      clipStartRef.current = null
      setClipInProgress(false)
      setClips(prev => [...prev, clip])
    }
  }, [])

  // ↑/↓: start on first press, end on second press
  const handleSpace = useCallback(() => {
    const video = videoRef.current
    if (!video || video.paused || video.ended) return
    if (sessionStateRef.current === 'idle') {
      startTimeRef.current = video.currentTime
      setSessionState('active')
    } else if (sessionStateRef.current === 'active') {
      endSession()
    }
  }, [endSession])

  function handleReset() {
    setMoves([])
    setClips([])
    setSessionState('idle')
    setLiveMetrics(null)
    startTimeRef.current = 0
    clipStartRef.current = null
    setClipInProgress(false)
  }

  const handleToggleRest = useCallback((idx: number, targetType: 'rest' | 'hesitation' | 'footwork' | 'tactical') => {
    setClassifiedRests(prev => [...prev.map(r =>
      r.index === idx ? { ...r, type: targetType } : r
    )])
  }, [])

  // ── Keyboard ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!canCapture) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'ArrowLeft' || e.code === 'KeyL') { e.preventDefault(); recordMove('L') }
      else if (e.code === 'ArrowRight' || e.code === 'KeyR') { e.preventDefault(); recordMove('R') }
      else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { e.preventDefault(); handleSpace() }
      else if (e.code === 'KeyC') { e.preventDefault(); handleClip() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canCapture, recordMove, handleSpace, handleClip])

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!fileRecord || !currentUser) return
    setSaving(true)

    // Qualitative scores + comments
    const qualPayload = {
      ...scores,
      IsTop: isTop,
      CoachComment: coachComment || null,
      ClimberComment: climberComment || null,
    }

    // Rest classification data — always derived from current classifiedRests state
    const restPayload = {
      StallTime: classifiedRests.filter(r => r.type === 'tactical').reduce((s, r) => s + r.duration, 0) || null,
      HesitationTime: classifiedRests.filter(r => r.type === 'hesitation').reduce((s, r) => s + r.duration, 0) || null,
      RestPeriodsJson: classifiedRests.length > 0 ? classifiedRests : null,
    }

    // Quantitative metrics — only included when a live recording session exists
    const quantPayload = liveMetrics ? {
      TotalMoves: liveMetrics.TotalMoves,
      ClimbDuration: liveMetrics.ClimbDuration,
      ActiveTime: liveMetrics.ActiveTime,
      RestTime: liveMetrics.RestTime,
      AvgPaceOverall: liveMetrics.AvgPaceOverall,
      AvgPaceLeft: liveMetrics.AvgPaceLeft,
      AvgPaceRight: liveMetrics.AvgPaceRight,
      StallsShort: liveMetrics.StallsShort,
      StallsLong: liveMetrics.StallsLong,
      RawLogJson: moves,
      ThirdsByMoves: liveMetrics.ThirdsByMoves,
      ThirdsByTime: liveMetrics.ThirdsByTime,
      TotalClips: liveMetrics.TotalClips,
      AvgClipDuration: liveMetrics.AvgClipDuration,
      LongestClip: liveMetrics.LongestClip,
      ClippingTime: liveMetrics.ClippingTime,
      MovementTime: liveMetrics.MovementTime,
    } : {}

    const payload = {
      FileID: fileRecord.FileID,
      Email: fileRecord.Email,
      CoachEmail: currentUser.Email,
      ...quantPayload,
      ...restPayload,
      ...qualPayload,
    }

    const result = await upsertAnalysis(payload)

    if (result) {
      setAnalysis(result)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function handleSaveComment() {
    if (!analysis || !fileRecord) return
    setSaving(true)
    const result = await upsertAnalysis({ FileID: fileRecord.FileID, ClimberComment: climberComment || null })
    if (result) { setAnalysis(result); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!analysis) return
    if (!window.confirm('האם למחוק את הניתוח הנוכחי ולהתחיל מחדש?')) return
    setDeleting(true)
    await deleteAnalysis(analysis.AnalysisID)
    setAnalysis(null)
    setMoves([])
    setClips([])
    setSessionState('idle')
    setLiveMetrics(null)
    clipStartRef.current = null
    setScores({
      ScorePrecision: 3, ScoreClipping: 3, ScoreTension: 3, ScoreFlow: 3,
      ScoreMomentum: 3, ScoreHips: 3, ScoreSolid: 3, ScoreCommitment: 3,
    })
    setIsTop(false)
    setCoachComment('')
    setClimberComment('')
    setClassifiedRests([])
    setDeleting(false)
  }

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <p className="text-gray-400">טוען...</p>
      </div>
    )
  }

  if (!fileRecord) return null

  const streamUrl = token ? `/api/media/stream/${fileId}?token=${encodeURIComponent(token)}` : ''
  const leftCount = moves.filter(m => m.hand === 'L').length
  const rightCount = moves.filter(m => m.hand === 'R').length

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 pb-24" dir="rtl">
      {/* Page header */}
      <div className="mb-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-blue-600 mb-2 flex items-center gap-1">
          ← חזור
        </button>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900 truncate">{fileRecord.FileName}</h1>
          {analysis && isCoachOrAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-40 border border-red-200 hover:border-red-400 rounded-lg px-2 py-1 transition-colors"
            >
              {deleting ? 'מוחק...' : 'מחק ניתוח'}
            </button>
          )}
        </div>
        {analysis && (
          <p className="text-xs text-gray-400 mt-0.5">
            ניתוח קיים · {new Date(analysis.CreatedAt).toLocaleDateString('he-IL')}
          </p>
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── LEFT: Video + capture controls ── */}
        <div className="lg:w-1/2 lg:sticky lg:top-20 lg:self-start">
          {/* Video */}
          <div className="relative bg-black rounded-xl overflow-hidden">
            {streamUrl ? (
              <video
                ref={videoRef}
                src={streamUrl}
                controls
                preload="metadata"
                className="w-full max-h-[55vh] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <p className="text-sm">טוען סרטון...</p>
              </div>
            )}
            {/* Flash overlays — L=blue left, R=red right, C=yellow full */}
            <div
              className="absolute inset-y-0 left-0 w-1/2 pointer-events-none transition-opacity duration-200"
              style={{ opacity: flashSide === 'L' ? 1 : 0, background: 'rgba(59,130,246,0.35)' }}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/2 pointer-events-none transition-opacity duration-200"
              style={{ opacity: flashSide === 'R' ? 1 : 0, background: 'rgba(239,68,68,0.35)' }}
            />
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-200"
              style={{ opacity: flashClip ? 1 : 0, background: 'rgba(234,179,8,0.3)' }}
            />
            {/* Pulsing sun — visible while a clip is recording */}
            {clipInProgress && (
              <div className="absolute top-3 right-3 pointer-events-none" style={{ zIndex: 10 }}>
                <div
                  className="absolute animate-ping"
                  style={{
                    width: 45, height: 45, borderRadius: '50%',
                    background: 'rgba(255,215,0,0.5)',
                  }}
                />
                <div
                  style={{
                    width: 45, height: 45, borderRadius: '50%',
                    background: '#FFD700',
                    boxShadow: '0 0 18px 6px rgba(255,165,0,0.65)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Capture buttons — coach/admin, session not ended */}
          {canCapture && sessionState !== 'ended' && (
            <div className="flex gap-1.5 mt-3" dir="ltr">
              <button
                onPointerDown={e => { e.preventDefault(); recordMove('L') }}
                disabled={sessionState === 'idle'}
                className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-25 disabled:pointer-events-none text-white rounded-xl font-bold text-sm shadow select-none touch-none"
              >
                יד שמאל
                <span className="block text-xs opacity-60 font-normal">←</span>
              </button>
              <button
                onPointerDown={e => { e.preventDefault(); handleClip() }}
                disabled={sessionState === 'idle'}
                className={`px-3 py-4 text-white rounded-xl font-bold shadow select-none touch-none transition-colors disabled:opacity-25 disabled:pointer-events-none ${
                  clipInProgress
                    ? 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 ring-2 ring-yellow-300'
                    : 'bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600'
                }`}
              >
                קליפ
                <span className="block text-xs opacity-70 font-normal">[C]</span>
              </button>
              <button
                onPointerDown={e => { e.preventDefault(); handleSpace() }}
                className={`px-3 py-4 text-white rounded-xl font-bold shadow select-none touch-none transition-colors ${
                  sessionState === 'idle'
                    ? 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                    : 'bg-gray-400 hover:bg-gray-500 active:bg-gray-600'
                }`}
              >
                {sessionState === 'idle' ? 'התחל' : 'סיום'}
                <span className="block text-xs opacity-60 font-normal">{sessionState === 'idle' ? '↑' : '↓'}</span>
              </button>
              <button
                onPointerDown={e => { e.preventDefault(); recordMove('R') }}
                disabled={sessionState === 'idle'}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:opacity-25 disabled:pointer-events-none text-white rounded-xl font-bold text-sm shadow select-none touch-none"
              >
                יד ימין
                <span className="block text-xs opacity-60 font-normal">→</span>
              </button>
            </div>
          )}

          {/* Live counter during active session */}
          {sessionState === 'active' && moves.length > 0 && (
            <div className="flex justify-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
              <span>שמאל: <strong>{leftCount}</strong></span>
              <span className="font-bold text-blue-600 text-base">{moves.length}</span>
              <span>ימין: <strong>{rightCount}</strong></span>
              {clips.length > 0 && (
                <span className="text-yellow-600">קליפים: <strong>{clips.length}</strong></span>
              )}
            </div>
          )}

          {/* Reset button */}
          {canCapture && sessionState !== 'idle' && (
            <button
              onClick={handleReset}
              className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg transition-colors"
            >
              ↺ איפוס סשן
            </button>
          )}

          {/* Keyboard hint */}
          {canCapture && sessionState === 'idle' && (
            <p className="text-[11px] text-gray-400 text-center mt-2 hidden lg:block">
              ↑ התחל · ← יד שמאל · → יד ימין · C הקלפה · ↓ סיום
            </p>
          )}
        </div>

        {/* ── RIGHT: Analysis panel ── */}
        <div className="lg:w-1/2">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setTab('quantitative')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === 'quantitative'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              כמותי
            </button>
            <button
              onClick={() => canShowQualitative && setTab('qualitative')}
              disabled={!canShowQualitative}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                tab === 'qualitative'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              איכותי
            </button>
          </div>

          {/* Quantitative tab */}
          {tab === 'quantitative' && (
            <div>
              {sessionState === 'idle' && !activeMetrics && (
                <div className="text-center py-14 text-gray-400">
                  {canCapture ? (
                    <>
                      <p className="text-4xl mb-3">🎬</p>
                      <p className="text-sm font-medium text-gray-600">לחץ חץ למעלה להתחלה</p>
                      <p className="text-xs mt-1">הפעל את הסרטון, לחץ ↑ בתחילת הטיפוס</p>
                    </>
                  ) : (
                    <>
                      <p className="text-4xl mb-3">📊</p>
                      <p className="text-sm">ניתוח כמותי עדיין לא בוצע לסרטון זה</p>
                    </>
                  )}
                </div>
              )}

              {sessionState === 'active' && (
                <div className="text-center py-10">
                  {moves.length === 0 ? (
                    <>
                      <div className="text-3xl mb-2">⏱</div>
                      <p className="text-sm font-medium text-green-600">מקליט...</p>
                      <p className="text-xs text-gray-400 mt-1">לחץ ← / → לתיעוד מהלכים</p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl font-black text-blue-600">{moves.length}</div>
                      <div className="text-gray-500 text-sm mt-1">מהלכים מתועדים</div>
                      <div className="flex justify-center gap-8 mt-4 text-sm text-gray-600">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-500">{leftCount}</div>
                          <div className="text-xs">יד שמאל</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-500">{rightCount}</div>
                          <div className="text-xs">יד ימין</div>
                        </div>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-gray-400 mt-4">לחץ ↓ / כפתור "סיום" לסיום הטיפוס</p>
                </div>
              )}

              {activeMetrics && (sessionState === 'ended' || sessionState === 'idle') && (
                <MetricsDisplay
                  metrics={activeMetrics}
                  isTop={isTop}
                  classifiedRests={classifiedRests}
                  onSeek={seekTo}
                  onToggleRest={handleToggleRest}
                />
              )}
            </div>
          )}

          {/* Qualitative tab */}
          {tab === 'qualitative' && (
            <div className="space-y-4">
              {/* Scores */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">ציוני טיפוס (1–5)</h3>
                {SCORE_LABELS.map(([key, label]) => (
                  <ScoreSlider
                    key={key}
                    label={label}
                    value={scores[key]}
                    onChange={v => setScores(prev => ({ ...prev, [key]: v }))}
                    disabled={!isCoachOrAdmin}
                  />
                ))}
              </div>

              {/* IsTop toggle */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">הגיע לראש?</span>
                <button
                  onClick={() => isCoachOrAdmin && setIsTop(v => !v)}
                  disabled={!isCoachOrAdmin}
                  className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${isTop ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isTop ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Coach comment */}
              {isCoachOrAdmin && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <label className="text-sm font-semibold text-gray-700 block mb-2">הערת מאמן</label>
                  <textarea
                    value={coachComment}
                    onChange={e => setCoachComment(e.target.value)}
                    rows={3}
                    placeholder="הערות, תצפיות, המלצות..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {/* Climber comment */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <label className="text-sm font-semibold text-gray-700 block mb-2">הערת מטפס</label>
                <textarea
                  value={climberComment}
                  onChange={e => setClimberComment(e.target.value)}
                  rows={3}
                  placeholder="איך הרגשת? מה היה קשה?"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                {!isCoachOrAdmin && analysis && (
                  <button
                    onClick={handleSaveComment}
                    disabled={saving}
                    className="mt-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors"
                  >
                    {saving ? 'שומר...' : 'שמור הערה'}
                  </button>
                )}
              </div>

              {/* Save button (coach/admin) */}
              {isCoachOrAdmin && (liveMetrics !== null || analysis !== null) && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors shadow"
                >
                  {saving ? 'שומר...' : saved ? '✓ נשמר!' : analysis ? 'עדכן ניתוח' : 'שמור ניתוח'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Comments ── */}
      {currentUser && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 pt-4 pb-1">
            <h3 className="text-sm font-semibold text-gray-700">תגובות על הסרטון</h3>
          </div>
          <MediaComments fileId={fileId} currentUser={currentUser} />
        </div>
      )}
    </div>
  )
}
