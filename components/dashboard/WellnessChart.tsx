// components/dashboard/WellnessChart.tsx - WITHOUT MOOD
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{
    date: string
    sleep: number
    energy: number
    soreness: number
  }>
}

export default function WellnessChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        אין נתוני Wellness להצגה
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          domain={[0, 10]}
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            direction: 'rtl'
          }}
        />
        <Legend 
          wrapperStyle={{ direction: 'rtl' }}
        />
        <Line 
          type="monotone" 
          dataKey="sleep" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="😴 שינה"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="energy" 
          stroke="#10b981" 
          strokeWidth={2}
          name="⚡ אנרגיה"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="soreness" 
          stroke="#ef4444" 
          strokeWidth={2}
          name="💪 כאב"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}