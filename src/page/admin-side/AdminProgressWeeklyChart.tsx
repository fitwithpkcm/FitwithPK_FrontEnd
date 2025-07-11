import React, { useEffect, useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getProgressGraph } from '../../services/UpdateServices'
import { format } from 'date-fns'

interface GRAPH_PROPS {
  selectedDate: Date,
  userId?: number
}

type PeriodKey = 'week' | 'month' | '6month' | 'year'

export default function GraphDataChart({ selectedDate: propDate, userId }: GRAPH_PROPS) {
  const [selectedDate, setSelectedDate] = useState<Date>(propDate ?? new Date())
  const [timePeriod, setTimePeriod] = useState<PeriodKey>('6month')
  const [selectedMeasurement, setSelectedMeasurement] = useState<string>('')
  const queryClient = useQueryClient()

  /* --------------------------------------------------
   *  Helper: map UI period selector ⇒ API label
   * ------------------------------------------------*/
  const periodLabel: Record<PeriodKey, string> = {
    week: '1W',
    month: '1M',
    '6month': '6M',
    year: '1Y',
  }

  const payload = useMemo(
    () => ({
      CurrentDate: selectedDate,
      Label: periodLabel[timePeriod],
      IdUser: userId
    }),
    [selectedDate, timePeriod],
  )

  // Keep local date in sync with parent
  useEffect(() => setSelectedDate(propDate), [propDate])

  /* --------------------------------------------------
   *  Data fetching via React‑Query
   * ------------------------------------------------*/
  const {
    data: metrics = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['daily-updates', payload],
    queryFn: () => getProgressGraph(payload).then(res => res.data.data),
  })

  // Manual refresh
  const refreshMutation = useMutation({
    mutationFn: () => getProgressGraph(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['daily-updates', payload] }),
  })

  /* --------------------------------------------------
   *  Build measurement list dynamically from API
   * ------------------------------------------------*/
  const measurementKeys: string[] = useMemo(
    () => metrics.map((m: any) => m.label),
    [metrics],
  )

  // Ensure selectedMeasurement is always valid
  useEffect(() => {
    if (!selectedMeasurement && measurementKeys.length) {
      setSelectedMeasurement(measurementKeys[0])
    } else if (
      selectedMeasurement &&
      measurementKeys.length &&
      !measurementKeys.includes(selectedMeasurement)
    ) {
      setSelectedMeasurement(measurementKeys[0])
    }
  }, [measurementKeys, selectedMeasurement])

  /* --------------------------------------------------
   *  Convert API response → Recharts shape
   *  Each row: { date: string | number, <metricLabel>: value, ... }
   * ------------------------------------------------*/
  const chartData = useMemo(() => {
    if (!metrics.length) return []

    // Use length of the first metric as baseline. If others are longer, include their extra points too.
    const maxLen = Math.max(...metrics.map((m: any) => m.data.length))

    return Array.from({ length: maxLen }).map((_, idx) => {
      const row: Record<string, any> = {}
      metrics.forEach((metric: any) => {
        const labelArray: string[] = metric.labels || []
        // Fallback label: point index (1‑based) if label is missing
        if (!row.date) row.date = labelArray[idx] ?? `${idx + 1}`
        row[metric.label] = metric.data[idx]
      })
      return row
    })
  }, [metrics])

  /* --------------------------------------------------
   *  Helpers for current / average value display
   * ------------------------------------------------*/
  const getCurrentValue = () => {
    if (!chartData.length || !selectedMeasurement) return '-'
    const last = chartData[chartData.length - 1]
    const v = last[selectedMeasurement]
    return typeof v === 'number' ? v : '-'
  }

  const getAverageValue = () => {
    if (!chartData.length || !selectedMeasurement) return '-'
    const { sum, count } = chartData.reduce(
      (acc: { sum: number; count: number }, row: any) => {
        const v = row[selectedMeasurement]
        if (typeof v === 'number') {
          acc.sum += v
          acc.count += 1
        }
        return acc
      },
      { sum: 0, count: 0 },
    )
    if (!count) return '-'
    return (sum / count).toFixed(1)
  }

  const prettifyMeasurement = (key: string) =>
    key.replace(/([A-Z])/g, ' $1').trim()

  /* --------------------------------------------------
   *  Early‑return loading / error states
   * ------------------------------------------------*/
  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading chart…</div>
  }
  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading data.</div>
  }
  if (!chartData.length) {
    return <div className="p-4 text-center text-gray-500">No data to display.</div>
  }

  /* --------------------------------------------------
   *  MAIN UI
   * ------------------------------------------------*/
  return (
    <div className="bg-white mb-4 overflow-hidden border w-full rounded-lg shadow-sm">
      <div className="p-2 pb-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-3xl font-bold">{getCurrentValue()}</div>
            <div className="text-xs text-gray-500">
              {format(selectedDate, 'dd MMM yy')}
            </div>
          </div>

          {/* Time‑period buttons */}
          <div className="flex gap-1 text-xs">
            {[
              { key: 'week', label: 'Week' },
              { key: 'month', label: 'Month' },
              { key: '6month', label: '6 Mo' },
              { key: 'year', label: 'Year' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimePeriod(key as PeriodKey)}
                className={`px-2 py-1 rounded ${timePeriod === key ? 'bg-blue-600 text-white' : 'bg-gray-100'
                  }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => refreshMutation.mutate()}
              className="px-2 py-1 rounded bg-gray-100"
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[250px] mb-4 w-full overflow-visible">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 8, fill: '#9CA3AF' }}
                height={30}
                interval="preserveEnd"
                minTickGap={15}
              />
              <YAxis
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: '#9CA3AF' }}
                width={25}
                tickCount={5}
              />
              <Tooltip />
              {selectedMeasurement && (
                <Line
                  type="monotone"
                  dataKey={selectedMeasurement}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3B82F6' }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="text-xs text-gray-500 mb-2 pl-2">
          Average: {getAverageValue()}
        </div>
      </div>

      {/* Measurement selector */}
      {measurementKeys.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
          {measurementKeys.map(key => (
            <button
              key={key}
              className={`py-2 px-2 rounded-full text-xs sm:text-sm truncate ${selectedMeasurement === key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
                }`}
              onClick={() => setSelectedMeasurement(key)}
            >
              {prettifyMeasurement(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
