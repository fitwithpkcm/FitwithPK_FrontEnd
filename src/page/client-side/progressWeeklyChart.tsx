import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getProgressGraph } from '@/services/UpdateServices'


interface GRAPH_PROPS {
    selectedDate: Date
}

export default function GraphDataChart(props: GRAPH_PROPS) {
    const [selectedIdx, setSelectedIdx] = useState(0)
    const [range, setRange] = useState('3M')
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const queryClient = useQueryClient()

    useEffect(() => {
        if (props.selectedDate) {
            setSelectedDate(props.selectedDate);
        }
    }, [props]);

    // payload for fetching
    
    const payload = { CurrentDate: selectedDate, Label: range }

    // fetch metrics using v5 object syntax
    const { data: metrics = [], isLoading, error } = useQuery({
        queryKey: ['daily-updates', payload],
        queryFn: () => getProgressGraph(payload).then(res => res.data.data)
    })

    // mutation to manually refresh
    const refreshMutation = useMutation({
        mutationFn: () => getProgressGraph(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-updates', payload] })
        },
    })

    if (isLoading) {
        return (
            <Card className="shadow-sm border-gray-100 dark:border-gray-800 dark:bg-gray-900 mb-6">
                <CardContent className="p-5 text-center text-gray-500 dark:text-gray-400">
                    Loading chart…
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="shadow-sm border-gray-100 dark:border-gray-800 dark:bg-gray-900 mb-6">
                <CardContent className="p-5 text-center text-red-500 dark:text-red-400">
                    Error loading data.
                </CardContent>
            </Card>
        )
    }

    if (!metrics.length) {
        return (
            <Card className="shadow-sm border-gray-100 dark:border-gray-800 dark:bg-gray-900 mb-6">
                <CardContent className="p-5 text-center text-gray-500 dark:text-gray-400">
                    No data to display.
                </CardContent>
            </Card>
        )
    }

    // current metric
    let { label = '', data = [], labels = [], untis = '' } = metrics[selectedIdx] || {}

    // SVG setup
    const SVG_W = 400
    const SVG_H = 150
    const PAD = { top: 10, bottom: 20, left: 30, right: 10 }
    
    const maxVal = Math.max(...data)
    const minVal = Math.min(...data)
    const xStep = (SVG_W - PAD.left - PAD.right) / (data.length - 1)
    const yScale = (SVG_H - PAD.top - PAD.bottom) / (maxVal - minVal || 1)

    const points = data.map((v, i) => ({
        x: PAD.left + i * xStep,
        y: PAD.top + (maxVal - v) * yScale,
        v,
        tick: labels[i],
    }))

    const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

    return (
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900 mb-6">
            <CardContent className="p-5">
                {/* header with range and refresh */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">{label} Progress</h3>
                    <div className="flex items-center space-x-2 text-xs">
                        {['1W', '1M', '3M', '1Y'].map(btn => (
                            <button
                                key={btn}
                                className={`py-1 px-2 ${btn === range ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                onClick={() => setRange(btn)}
                            >{btn}</button>
                        ))}
                        <button
                            className="py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300"
                            onClick={() => refreshMutation.mutate()}
                        >↻ Refresh</button>
                    </div>
                </div>

                {/* chart */}
                <div className="relative h-48 mb-4">
                    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={lineD} fill="none" stroke="#3B82F6" strokeWidth="3" />
                        <path d={`${lineD} L${points[points.length - 1].x},${SVG_H - PAD.bottom} L${points[0].x},${SVG_H - PAD.bottom} Z`} fill="url(#grad)" />
                        {points.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r={5} fill="#3B82F6" stroke="#fff" strokeWidth={2} className="cursor-pointer hover:r-6" onClick={() => { }} />
                        ))}
                    </svg>
                    <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400" style={{ padding: `${PAD.top}px 0 ${PAD.bottom}px` }}>
                        <span>{maxVal}{untis}</span>
                        <span>{((maxVal + minVal) / 2).toFixed(1)}{untis}</span>
                        <span>{minVal}{untis}</span>
                    </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 ml-3 mt-3">
                    {points.map((p, i) => (
                        <span key={i} className="cursor-pointer hover:text-primary-600" onClick={() => { }}>{p.tick}</span>
                    ))}
                </div>

                {/* metric tabs */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {metrics.map((m, idx) => (
                        <button key={m.label} className={`px-3 py-1 rounded-full text-sm ${idx === selectedIdx ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`} onClick={() => setSelectedIdx(idx)}>{m.label}</button>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
