'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{
    date: string
    count: number
  }>
}

function WorkoutsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-right text-sm" dir="rtl">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-green-600">{val} אימונים בוצעו</p>
    </div>
  )
}

export default function ExerciseAmountChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-gray-400">
        אין נתוני אימונים להצגה
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" style={{ fontSize: '11px' }} />
        <YAxis
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          allowDecimals={false}
          style={{ fontSize: '11px' }}
          width={24}
        />
        <Tooltip content={<WorkoutsTooltip />} />
        <Bar
          dataKey="count"
          fill="#22c55e"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
