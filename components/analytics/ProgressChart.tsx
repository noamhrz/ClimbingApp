// components/analytics/ProgressChart.tsx
// Weight chart with reps labels and full tooltip

'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, ReferenceLine, LabelList } from 'recharts'
import { ChartDataPoint } from '@/types/analytics'

interface ProgressChartProps {
  data: ChartDataPoint[]
  isSingleHand: boolean
  bodyWeight: number | null
}

// Custom label for reps on bars - Both Hands
const BarRepsLabel = (props: any) => {
  const { x, y, width, payload } = props
  
  // Get reps from the data point
  const reps = payload?.reps
  
  if (!reps) return null
  
  return (
    <text 
      x={x + width / 2} 
      y={y - 8} 
      fill="#10b981" 
      fontSize="12" 
      fontWeight="bold"
      textAnchor="middle"
    >
      ({Math.round(reps)})
    </text>
  )
}

// Custom label for Right hand bars
const RightHandRepsLabel = (props: any) => {
  const { x, y, width, payload } = props
  
  const reps = payload?.rightReps
  if (!reps || !payload?.right) return null
  
  return (
    <text 
      x={x + width / 2} 
      y={y - 8} 
      fill="#1e40af" 
      fontSize="11" 
      fontWeight="bold"
      textAnchor="middle"
    >
      ({Math.round(reps)})
    </text>
  )
}

// Custom label for Left hand bars
const LeftHandRepsLabel = (props: any) => {
  const { x, y, width, payload } = props
  
  const reps = payload?.leftReps
  if (!reps || !payload?.left) return null
  
  return (
    <text 
      x={x + width / 2} 
      y={y - 8} 
      fill="#065f46" 
      fontSize="11" 
      fontWeight="bold"
      textAnchor="middle"
    >
      ({Math.round(reps)})
    </text>
  )
}

// Custom label showing percentage of body weight
const PercentageBWLabel = ({ x, y, width, value, bodyWeight }: any) => {
  if (!bodyWeight || !value) return null
  
  const percentage = ((value / bodyWeight) * 100).toFixed(0)
  
  return (
    <text 
      x={x + width / 2} 
      y={y - 24}  // Above reps
      fill="#6b7280" 
      fontSize="10" 
      fontWeight="600"
      textAnchor="middle"
    >
      {percentage}%
    </text>
  )
}

export default function ProgressChart({ data, isSingleHand, bodyWeight }: ProgressChartProps) {
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📈</div>
          <div>אין נתונים להצגה</div>
        </div>
      </div>
    )
  }

  // Custom tooltip - shows ALL data
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-gray-300">
          <p className="font-bold text-gray-900 mb-3 text-base border-b pb-2">📅 {label}</p>
          <div className="space-y-2">
            {data.weight !== null && data.weight !== undefined && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-700">⚖️ משקל:</span>
                  <span className="text-sm font-bold text-blue-600">{data.weight.toFixed(1)} ק״ג</span>
                </div>
                {bodyWeight && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-gray-700">📊 % ממשקל גוף:</span>
                    <span className="text-sm font-bold text-purple-600">{((data.weight / bodyWeight) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </>
            )}
            {data.reps !== null && data.reps !== undefined && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-700">🔁 חזרות:</span>
                <span className="text-sm font-bold text-green-600">{Math.round(data.reps)}</span>
              </div>
            )}
            {data.rpe !== null && data.rpe !== undefined && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-700">🔥 RPE:</span>
                <span className="text-sm font-bold text-amber-600">{data.rpe}</span>
              </div>
            )}
            {/* Single hand data */}
            {data.right !== null && data.right !== undefined && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-700">🫱 ימין:</span>
                  <span className="text-sm font-bold text-blue-600">{data.right.toFixed(1)} ק״ג</span>
                </div>
                {bodyWeight && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-gray-700">📊 % ממשקל גוף:</span>
                    <span className="text-sm font-bold text-purple-600">{((data.right / bodyWeight) * 100).toFixed(1)}%</span>
                  </div>
                )}
                {data.rightReps && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-gray-700">🔁 חזרות:</span>
                    <span className="text-sm font-bold text-blue-600">{data.rightReps}</span>
                  </div>
                )}
              </>
            )}
            {data.left !== null && data.left !== undefined && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-700">🫲 שמאל:</span>
                  <span className="text-sm font-bold text-green-600">{data.left.toFixed(1)} ק״ג</span>
                </div>
                {bodyWeight && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-gray-700">📊 % ממשקל גוף:</span>
                    <span className="text-sm font-bold text-purple-600">{((data.left / bodyWeight) * 100).toFixed(1)}%</span>
                  </div>
                )}
                {data.leftReps && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-gray-700">🔁 חזרות:</span>
                    <span className="text-sm font-bold text-green-600">{data.leftReps}</span>
                  </div>
                )}
              </>
            )}
          </div>
          {bodyWeight && (
            <div className="mt-3 pt-2 border-t text-xs text-gray-500 text-center">
              משקל גוף: {bodyWeight} ק״ג
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Custom label - shows reps next to weight dot
  const CustomLabel = (props: any) => {
    const { x, y, value, index } = props
    const point = data[index]
    
    if (!point || !point.reps) return null
    
    return (
      <text 
        x={x + 12} 
        y={y - 8} 
        fill="#10b981" 
        fontSize="12" 
        fontWeight="bold"
        textAnchor="start"
      >
        ({point.reps})
      </text>
    )
  }

  if (isSingleHand) {
    // Single hand - Right vs Left with grouped bars
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">📈 התקדמות משקל - ימין vs שמאל</h3>
          <div className="text-sm text-gray-500">
            💡 לחץ על עמודה לפרטים מלאים
          </div>
        </div>
        
        <div className="flex gap-4 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-blue-500 border-2 border-white shadow"></div>
            <span className="font-medium">🫱 יד ימין</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 border-2 border-white shadow"></div>
            <span className="font-medium">🫲 יד שמאל</span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={data} margin={{ top: 20, right: 40, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              style={{ fontSize: '13px', fontWeight: 500 }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '13px', fontWeight: 600 }}
              tick={{ fill: '#6b7280' }}
              label={{ 
                value: 'משקל (ק״ג)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: '14px', fontWeight: 700, fill: '#6b7280' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Body weight reference line */}
            {bodyWeight && (
              <ReferenceLine 
                y={bodyWeight} 
                stroke="#ef4444" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ 
                  value: `BW: ${bodyWeight}kg`, 
                  position: 'right',
                  fill: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}
            
            {/* Right hand bar */}
            <Bar 
              dataKey="right" 
              fill="#3b82f6" 
              name="יד ימין"
              radius={[8, 8, 0, 0]}
              maxBarSize={30}
              label={<RightHandRepsLabel />}
            >
              <LabelList dataKey="right" content={(props) => <PercentageBWLabel {...props} bodyWeight={bodyWeight} />} />
            </Bar>
            
            {/* Left hand bar */}
            <Bar 
              dataKey="left" 
              fill="#10b981" 
              name="יד שמאל"
              radius={[8, 8, 0, 0]}
              maxBarSize={30}
              label={<LeftHandRepsLabel />}
            >
              <LabelList dataKey="left" content={(props) => <PercentageBWLabel {...props} bodyWeight={bodyWeight} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Both hands - Weight with vertical bars
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">📈 התקדמות משקל</h3>
        <div className="text-sm text-gray-500">
          💡 לחץ על עמודה לפרטים מלאים
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm mb-4 bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-blue-500 border-2 border-white shadow"></div>
          <span className="font-medium">⚖️ משקל (ק״ג)</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={data} margin={{ top: 25, right: 40, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '13px', fontWeight: 500 }}
            tick={{ fill: '#6b7280' }}
          />
          
          <YAxis 
            stroke="#3b82f6"
            style={{ fontSize: '13px', fontWeight: 600 }}
            tick={{ fill: '#3b82f6' }}
            label={{ 
              value: 'משקל (ק״ג)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: '14px', fontWeight: 700, fill: '#3b82f6' }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Body weight reference line */}
          {bodyWeight && (
            <ReferenceLine 
              y={bodyWeight} 
              stroke="#ef4444" 
              strokeDasharray="5 5" 
              strokeWidth={2}
              label={{ 
                value: `BW: ${bodyWeight}kg`, 
                position: 'right',
                fill: '#ef4444',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            />
          )}
          
          {/* Weight bars */}
          <Bar 
            dataKey="weight" 
            fill="#3b82f6" 
            name="משקל"
            radius={[8, 8, 0, 0]}
            maxBarSize={40}
            label={<BarRepsLabel />}
          >
            <LabelList dataKey="weight" content={(props) => <PercentageBWLabel {...props} bodyWeight={bodyWeight} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-center text-sm bg-gray-50 p-3 rounded-lg">
        <div className="font-medium text-gray-700 mb-1">📊 איך לקרוא את הגרף:</div>
        <div className="text-gray-600">
          כל עמודה = משקל באותו יום • לחץ על עמודה לפרטים מלאים (חזרות, RPE וכו')
        </div>
      </div>
    </div>
  )
}