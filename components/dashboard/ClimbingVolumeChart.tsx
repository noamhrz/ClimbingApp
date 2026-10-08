// components/dashboard/ClimbingVolumeChart.tsx - STACKED BARS
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{
    date: string
    lead: number      // סגול
    board: number     // צהוב
    boulder: number   // חום
  }>
}

export default function ClimbingVolumeChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-faint">
        אין נתוני טיפוס להצגה
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip 
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              lead: 'הובלה',
              board: 'בורד',
              boulder: 'בולדר'
            }
            return [value, labels[name] || name]
          }}
          contentStyle={{ 
            backgroundColor: '#1C1915', 
            border: '1px solid #2B2722',
            borderRadius: '8px'
          }}
        />
        <Legend 
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              lead: 'הובלה',
              board: 'בורד',
              boulder: 'בולדר'
            }
            return labels[value] || value
          }}
        />
        
        {/* Lead - סגול */}
        <Bar 
          dataKey="lead" 
          stackId="a"
          fill="#7FB0C9" 
          name="lead"
        />
        
        {/* Board - צהוב */}
        <Bar 
          dataKey="board" 
          stackId="a"
          fill="#E3B341" 
          name="board"
        />
        
        {/* Boulder - חום */}
        <Bar 
          dataKey="boulder" 
          stackId="a"
          fill="#E0763A" 
          name="boulder"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}