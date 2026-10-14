// components/dashboard/ClimbingVolumeChart.tsx
// Stacked volume bars per day/week, with the average grade per type as lines on top:
// V average (boulder, board) and French average (lead). Each line has its own hidden scale;
// the value is written next to each point (V4.3 / 6b+), and each line can be toggled.
'use client'

import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface ClimbingChartRow {
  date: string
  lead: number
  board: number
  boulder: number
  boulderAvg?: number | null
  boardAvg?: number | null
  leadAvg?: number | null
  boulderAvgText?: string
  boardAvgText?: string
  leadAvgText?: string
  boulderCount?: number
  boardCount?: number
  leadCount?: number
}

interface Props { data: ClimbingChartRow[] }

const COLORS = { lead: '#7FB0C9', board: '#E3B341', boulder: '#E0763A' }
const LINES = [
  { key: 'boulder', label: 'V avg בולדר', dash: undefined },
  { key: 'board', label: 'V avg בורד', dash: '7 5' },
  { key: 'lead', label: 'French avg הובלה', dash: '2 5' },
] as const
const COUNTS = [
  { key: 'boulder', label: 'מסלולים בולדר' },
  { key: 'board', label: 'מסלולים בורד' },
  { key: 'lead', label: 'מסלולים הובלה' },
] as const
type K = 'boulder' | 'board' | 'lead'
const VOL_LABEL: Record<string, string> = { lead: 'הובלה', board: 'בורד', boulder: 'בולדר' }

export default function ClimbingVolumeChart({ data }: Props) {
  const [show, setShow] = useState({ boulder: true, board: true, lead: true })
  // route counts: off by default
  const [showCount, setShowCount] = useState({ boulder: false, board: false, lead: false })

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-faint">
        אין נתוני טיפוס להצגה
      </div>
    )
  }

  const hasAvg = (k: 'boulder' | 'board' | 'lead') => data.some(d => d[`${k}Avg`] != null)
  // each average gets its own horizontal band of the plot (fractions of the height, bottom→top),
  // so the three lines and their labels never sit on top of each other
  const BANDS = { boulder: [0.8, 0.95], board: [0.62, 0.76], lead: [0.44, 0.58] } as const
  const band = (k: 'boulder' | 'board' | 'lead'): [number, number] => {
    const vals = data.map(d => d[`${k}Avg`]).filter((v): v is number => v != null)
    const lo = Math.min(...vals), hi = Math.max(...vals)
    const span = Math.max(1, hi - lo)
    const [f0, f1] = BANDS[k]
    const unit = span / (f1 - f0)
    return [lo - f0 * unit, hi + (1 - f1) * unit]
  }

  const hasCount = (k: K) => data.some(d => (d[`${k}Count`] ?? 0) > 0)
  // counts share one scale (so types compare) in the lower part of the plot
  const maxCount = Math.max(1, ...data.flatMap(d => [d.boulderCount ?? 0, d.boardCount ?? 0, d.leadCount ?? 0]))
  const chip = (on: boolean) => `h-8 px-3 rounded-full border border-line-strong bg-raised text-[13px] font-bold inline-flex items-center gap-1.5 ${on ? 'text-fg-2' : 'opacity-45 text-fg-3'}`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 flex-wrap" role="group" aria-label="קווי ממוצע דירוג">
        {LINES.filter(l => hasAvg(l.key)).map(l => (
          <button key={l.key} type="button" aria-pressed={show[l.key]} onClick={() => setShow(s => ({ ...s, [l.key]: !s[l.key] }))}
            className={chip(show[l.key])}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[l.key] }} />{l.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 flex-wrap" role="group" aria-label="כמות מסלולים">
        {COUNTS.filter(c => hasCount(c.key)).map(c => (
          <button key={c.key} type="button" aria-pressed={showCount[c.key]} onClick={() => setShowCount(s => ({ ...s, [c.key]: !s[c.key] }))}
            className={chip(showCount[c.key])}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[c.key] }} />{c.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="vol" />
              {LINES.map(l => hasAvg(l.key) && (
                <YAxis key={l.key} yAxisId={l.key} hide domain={band(l.key)} />
              ))}
              <YAxis yAxisId="cnt" hide domain={[0, maxCount / 0.4]} />
              <Tooltip
                formatter={(value: number, name: string, item: { payload?: ClimbingChartRow }) => {
                  if (name.endsWith('Count')) {
                    const k = name.replace('Count', '') as K
                    return [value, COUNTS.find(c => c.key === k)!.label]
                  }
                  if (name.endsWith('Avg')) {
                    const k = name.replace('Avg', '') as 'boulder' | 'board' | 'lead'
                    return [item.payload?.[`${k}AvgText`] ?? '', LINES.find(l => l.key === k)!.label]
                  }
                  return [value, VOL_LABEL[name] || name]
                }}
                contentStyle={{ backgroundColor: '#1C1915', border: '1px solid #2B2722', borderRadius: '8px' }}
              />
              <Bar yAxisId="vol" dataKey="lead" stackId="a" fill={COLORS.lead} name="lead" fillOpacity={0.55} />
              <Bar yAxisId="vol" dataKey="board" stackId="a" fill={COLORS.board} name="board" fillOpacity={0.55} />
              <Bar yAxisId="vol" dataKey="boulder" stackId="a" fill={COLORS.boulder} name="boulder" fillOpacity={0.55} />
              {LINES.map(l => hasAvg(l.key) && show[l.key] && (
                <Line key={l.key} yAxisId={l.key} type="monotone" dataKey={`${l.key}Avg`} name={`${l.key}Avg`}
                  stroke={COLORS[l.key]} strokeWidth={2.5} strokeDasharray={l.dash}
                  dot={{ r: 3.5, fill: '#0F0E0C', stroke: COLORS[l.key], strokeWidth: 2 }}
                  activeDot={{ r: 5 }} connectNulls isAnimationActive={false}>
                  <LabelList dataKey={`${l.key}AvgText`} formatter={(v: unknown) => (v ? `\u200E${v}\u200E` : '')} position="top" fill={COLORS[l.key]} fontSize={11} fontWeight={800} />
                </Line>
              ))}
              {COUNTS.map(c => hasCount(c.key) && showCount[c.key] && (
                <Line key={`c-${c.key}`} yAxisId="cnt" type="monotone" dataKey={`${c.key}Count`} name={`${c.key}Count`}
                  stroke={COLORS[c.key]} strokeWidth={1.5} strokeOpacity={0.9}
                  dot={{ r: 3, fill: COLORS[c.key], stroke: COLORS[c.key] }} activeDot={{ r: 4.5 }} isAnimationActive={false}>
                  <LabelList dataKey={`${c.key}Count`} formatter={(v: unknown) => (v ? String(v) : '')} position="top" fill={COLORS[c.key]} fontSize={10} fontWeight={700} />
                </Line>
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-xs text-muted text-center">עמודות = נפח · קווים עבים = ממוצע דירוג · קווים דקים = כמות מסלולים</p>
    </div>
  )
}
