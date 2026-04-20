'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{
    date: string
    sleep: number
    energy: number | null
    soreness: number | null
  }>
}

const PAIN_LABELS: Record<number, string> = {
  0: 'ללא כאב 🟢',
  1: 'כאב קל, אפשר להתאמן 🟡',
  2: 'כאב בינוני, אימון מכוון התאוששות 🟠',
  3: 'כאב חזק, לטפל ולנוח 🔴',
}

const ENERGY_LABELS: Record<number, string> = {
  0: 'אין כוח לכלום 😴',
  1: 'כוח לתנועה קלה 🐢',
  2: 'מוכן לאימון משמעותי 💪',
  3: 'בא לפרק את הקיר! 🔥',
}

function PainEnergyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-right text-sm" dir="rtl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry: any) => {
        const val = entry.value
        if (val === null || val === undefined) return null
        const description =
          entry.dataKey === 'soreness'
            ? PAIN_LABELS[val] ?? val
            : ENERGY_LABELS[val] ?? val
        return (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {description}
          </p>
        )
      })}
    </div>
  )
}

function SleepTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  if (val === null || val === undefined) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-right text-sm" dir="rtl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p style={{ color: '#3b82f6' }}>😴 שינה: {val} שעות</p>
    </div>
  )
}

export default function WellnessChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        אין נתוני Wellness להצגה
      </div>
    )
  }

  const processedData = data.map(d => ({
    date: d.date,
    sleep: d.sleep > 0 ? d.sleep : null,
    energy: d.energy !== null && d.energy !== undefined ? d.energy : null,
    soreness: d.soreness !== null && d.soreness !== undefined ? d.soreness : null,
  }))

  return (
    <div className="space-y-6">
      {/* Chart 1: Pain & Energy */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2 text-right">🔴 כאב  •  🟡 אנרגיה</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" style={{ fontSize: '11px' }} />
            <YAxis
              domain={[0, 3]}
              ticks={[0, 1, 2, 3]}
              style={{ fontSize: '11px' }}
              width={24}
            />
            <Tooltip content={<PainEnergyTooltip />} />
            <Legend wrapperStyle={{ direction: 'rtl', fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="energy"
              stroke="#f59e0b"
              strokeWidth={2}
              name="⚡ אנרגיה"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="soreness"
              stroke="#ef4444"
              strokeWidth={2}
              name="🤕 כאב"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Sleep */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2 text-right">🔵 שינה</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" style={{ fontSize: '11px' }} />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              style={{ fontSize: '11px' }}
              width={24}
            />
            <Tooltip content={<SleepTooltip />} />
            <Legend wrapperStyle={{ direction: 'rtl', fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="sleep"
              stroke="#3b82f6"
              strokeWidth={2}
              name="😴 שינה"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
