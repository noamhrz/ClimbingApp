// components/climbing/ClimbingLogChart.tsx - V2 Stacked (FIXED)
'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// Reads the live design tokens so the chart always matches the current theme
function readToken(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function applyChartTheme() {
  const line = readToken('--color-line', '#2B2722')
  const muted = readToken('--color-muted', '#A39E95')
  Chart.defaults.color = muted
  Chart.defaults.borderColor = line
}

interface ChartData {
  type: 'Lead' | 'BoulderBoard'
  lead?: { gradeLabel: string; count: number }[]
  boulderBoard?: {
    gradeLabel: string
    boulderCount: number
    boardCount: number
  }[]
}

interface Props {
  data: ChartData
}

export default function ClimbingLogChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    applyChartTheme()
    const accent = readToken('--color-accent', '#E0763A')
    const info = readToken('--color-info', '#7FB0C9')

    if (data.type === 'Lead' && data.lead) {
      // Lead chart (simple bar)
      const labels = data.lead.map((d) => d.gradeLabel)
      const counts = data.lead.map((d) => d.count)

      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'הובלה (Lead)',
              data: counts,
              backgroundColor: `${accent}B3`,
              borderColor: accent,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: '🧗 התפלגות מסלולי הובלה לפי דירוג',
              font: {
                size: 18,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${context.parsed.y ?? 0} מסלולים`
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
              title: {
                display: true,
                text: 'כמות מסלולים',
              },
            },
            x: {
              title: {
                display: true,
                text: 'דירוג',
              },
            },
          },
        },
      })
    } else if (data.type === 'BoulderBoard' && data.boulderBoard) {
      // Boulder + Board stacked chart
      const labels = data.boulderBoard.map((d) => d.gradeLabel)
      const boulderCounts = data.boulderBoard.map((d) => d.boulderCount)
      const boardCounts = data.boulderBoard.map((d) => d.boardCount)

      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '🪨 בולדר',
              data: boulderCounts,
              backgroundColor: `${accent}B3`,
              borderColor: accent,
              borderWidth: 1,
            },
            {
              label: '🟡 בורד',
              data: boardCounts,
              backgroundColor: `${info}B3`,
              borderColor: info,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: '🪨 התפלגות מסלולי בולדר + בורד לפי דירוג',
              font: {
                size: 18,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${context.dataset.label}: ${context.parsed.y ?? 0} מסלולים`
                },
                footer: function (items) {
                  // FIX: Handle null values with nullish coalescing
                  const total = items.reduce((sum, item) => sum + (item.parsed.y ?? 0), 0)
                  return `סה"כ: ${total} מסלולים`
                },
              },
            },
          },
          scales: {
            y: {
              stacked: true, // STACKED!
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
              title: {
                display: true,
                text: 'כמות מסלולים',
              },
            },
            x: {
              stacked: true, // STACKED!
              title: {
                display: true,
                text: 'דירוג',
              },
            },
          },
        },
      })
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [data])

  return (
    <div className="bg-surface rounded-lg shadow p-6 mb-6">
      <div style={{ height: '400px' }}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  )
}