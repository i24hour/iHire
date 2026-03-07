'use client';

import React, { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ComposedChart
} from 'recharts';

export interface ChartEvent {
    type: 'start' | 'pause' | 'complete';
    timestamp: number;
}

export interface ChartTask {
    id: string;
    events?: ChartEvent[];
    startTime: number;
    pausedElapsed: number;
    enabled: boolean;
    completed: boolean;
    completedAt?: number;
}

interface PerformanceChartProps {
    tasks: ChartTask[];
}

type TimeRange = '1D' | '1W' | '1M' | '1Y';
type ChartType = 'line' | 'candle';

function getWorkloadAtTime(tasks: ChartTask[], t: number) {
    let totalMs = 0;
    for (const task of tasks) {
        if (!task.events || task.events.length === 0) {
            // Fallback logic for legacy tasks
            if (task.startTime && task.startTime <= t) {
                if (task.completed && task.completedAt && task.completedAt <= t) {
                    // Inactive
                } else if (task.completed && task.completedAt && task.completedAt > t) {
                    totalMs += (t - task.startTime);
                } else if (!task.completed && task.enabled) {
                    totalMs += (t - task.startTime) + (task.pausedElapsed * 1000);
                } else if (!task.completed && !task.enabled) {
                    totalMs += (task.pausedElapsed * 1000);
                }
            }
            continue;
        }

        let syntheticEvents = [...task.events];
        // Handle transitioning tasks that might not have a clean start event
        if (syntheticEvents[0].type !== 'start' && task.startTime && task.startTime < syntheticEvents[0].timestamp) {
            syntheticEvents.unshift({ type: 'start', timestamp: task.startTime });
        }

        let taskActiveMs = 0;
        let isRunning = false;
        let lastStartTime = 0;
        let isCompleted = false;

        for (const ev of syntheticEvents) {
            if (ev.timestamp > t) break;

            if (ev.type === 'start') {
                if (!isRunning) {
                    isRunning = true;
                    lastStartTime = ev.timestamp;
                }
            } else if (ev.type === 'pause') {
                if (isRunning) {
                    taskActiveMs += (ev.timestamp - lastStartTime);
                    isRunning = false;
                }
            } else if (ev.type === 'complete') {
                if (isRunning) {
                    taskActiveMs += (ev.timestamp - lastStartTime);
                    isRunning = false;
                }
                isCompleted = true;
            }
        }

        if (isCompleted) {
            continue; // Burden drops to 0 immediately upon completion
        }

        if (isRunning && lastStartTime <= t) {
            taskActiveMs += (t - lastStartTime);
        }

        // Add existing paused Elapsed if evaluating before start (for migrated tasks)
        if (task.pausedElapsed > 0 && syntheticEvents.length > 0 && lastStartTime === 0 && !isCompleted) {
            totalMs += (task.pausedElapsed * 1000);
        }

        totalMs += taskActiveMs;
    }

    // Returns negative value so graph naturally goes down as workload increases
    return -Math.max(0, totalMs / (1000 * 3600));
}

// Custom SVG Candlestick renderer for Recharts <Bar>
const CandleShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;

    const valueRange = Math.abs(high - low);
    let openY = y;
    let closeY = y;

    if (valueRange !== 0) {
        // Find screen Y positions relative to the bounding box the Bar got
        // Note: Recharts already plots `y` and `height` based on the [low, high] domain passed to <Bar>
        openY = y + height * (Math.abs(high - open) / valueRange);
        closeY = y + height * (Math.abs(high - close) / valueRange);
    } else {
        closeY = openY + 1;
    }

    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    // Green if close is larger than open (closer to 0, meaning less negative, so tasks were completed)
    const isPositive = close >= open;
    const color = isPositive ? '#10b981' : '#ef4444';
    const isDoji = Math.abs(open - close) < 0.05;

    return (
        <g filter={isPositive ? "url(#glowGreen)" : "url(#glowRed)"}>
            {/* Wick (High-Low bounds) */}
            <line
                x1={x + width / 2}
                y1={y}
                x2={x + width / 2}
                y2={y + height}
                stroke={color}
                strokeWidth={1.5}
            />
            {/* Body (Open-Close bounds) */}
            <rect
                x={x}
                y={bodyTop}
                width={width}
                height={isDoji ? 2 : bodyHeight}
                fill={isPositive ? '#000' : color}
                stroke={color}
                strokeWidth={isPositive ? 1.5 : 0}
            />
        </g>
    );
};

export function PerformanceChart({ tasks }: PerformanceChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('1D');
    const [chartType, setChartType] = useState<ChartType>('line');

    const data = useMemo(() => {
        const now = Date.now();
        let startTime = now;
        let dataPointsCount = 0;
        let intervalMs = 0;

        switch (timeRange) {
            case '1D':
                startTime = now - (24 * 60 * 60 * 1000);
                dataPointsCount = 24 * 4; // every 15 mins
                intervalMs = (24 * 60 * 60 * 1000) / dataPointsCount;
                break;
            case '1W':
                startTime = now - (7 * 24 * 60 * 60 * 1000);
                dataPointsCount = 7 * 4; // every 6 hours
                intervalMs = (7 * 24 * 60 * 60 * 1000) / dataPointsCount;
                break;
            case '1M':
                startTime = now - (30 * 24 * 60 * 60 * 1000);
                dataPointsCount = 30 * 2; // twice a day
                intervalMs = (30 * 24 * 60 * 60 * 1000) / dataPointsCount;
                break;
            case '1Y':
                startTime = now - (365 * 24 * 60 * 60 * 1000);
                dataPointsCount = 52; // roughly weekly
                intervalMs = (365 * 24 * 60 * 60 * 1000) / dataPointsCount;
                break;
        }

        const points = [];

        for (let i = 0; i < dataPointsCount; i++) {
            const T_start = startTime + (i * intervalMs);
            const T_end = startTime + ((i + 1) * intervalMs);

            let open = getWorkloadAtTime(tasks, T_start);
            let close = getWorkloadAtTime(tasks, Math.min(now, T_end));

            let high = Math.max(open, close);
            let low = Math.min(open, close);

            const evaluateAt = (time: number) => {
                if (time >= T_start && time <= T_end) {
                    const val = getWorkloadAtTime(tasks, time);
                    if (val > high) high = val;
                    if (val < low) low = val;
                }
            }

            for (const task of tasks) {
                if (task.events) {
                    for (const ev of task.events) {
                        if (ev.timestamp > T_start && ev.timestamp <= T_end) {
                            evaluateAt(ev.timestamp);
                            evaluateAt(ev.timestamp - 1); // just before the step jump
                        }
                    }
                }
            }

            points.push({
                time: T_end, // Timeline marked by end of segment
                open,
                close,
                high,
                low,
                workload: close, // For Line chart
                displayWorkload: Math.abs(close), // Tooltip parsing
                color: close >= open ? '#10b981' : '#ef4444'
            });
        }

        return points;
    }, [tasks, timeRange]);

    const formatXAxis = (timestamp: number) => {
        const date = new Date(timestamp);
        if (timeRange === '1D') {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (timeRange === '1W') {
            return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const formatYAxis = (value: number) => {
        return Math.abs(value).toFixed(1) + 'h';
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-black/95 backdrop-blur-md border border-white/20 p-3 rounded-lg shadow-2xl min-w-[140px] z-50">
                    <p className="text-zinc-500 text-xs mb-2 font-medium">{new Date(label).toLocaleString()}</p>

                    {chartType === 'candle' ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="text-zinc-400">Open</div>
                            <div className="text-white text-right font-mono">{Math.abs(data.open).toFixed(2)}h</div>
                            <div className="text-zinc-400">High</div>
                            <div className="text-white text-right font-mono">{Math.abs(data.low).toFixed(2)}h</div>
                            <div className="text-zinc-400">Low</div>
                            <div className="text-white text-right font-mono">{Math.abs(data.high).toFixed(2)}h</div>
                            <div className="text-zinc-400 font-bold mt-1">Close</div>
                            <div className={`text-right font-mono font-bold mt-1 ${data.close >= data.open ? 'text-emerald-400' : 'text-red-400'}`}>
                                {Math.abs(data.close).toFixed(2)}h
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-white font-mono font-bold text-xl">
                                {data.displayWorkload.toFixed(2)} <span className="text-sm font-normal text-zinc-400">hrs</span>
                            </p>
                            <p className="text-zinc-500 text-[10px] uppercase mt-1">Active Workload</p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    const startValue = data.length > 0 ? data[0].workload : 0;
    const endValue = data.length > 0 ? data[data.length - 1].workload : 0;
    const isPositiveTrend = endValue >= startValue;

    const strokeColor = isPositiveTrend ? "#10b981" : "#ef4444";

    return (
        <div className="bg-black rounded-2xl border border-white/10 p-6 flex flex-col w-full h-[500px]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white">Capacity & Performance</h2>
                    <p className="text-sm text-zinc-500 mt-1">Accumulated time of active tasks (inverted)</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Chart Type Toggle */}
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setChartType('line')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartType === 'line' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-white'
                                }`}
                        >
                            Line
                        </button>
                        <button
                            onClick={() => setChartType('candle')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartType === 'candle' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-white'
                                }`}
                        >
                            Candle
                        </button>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                        {['1D', '1W', '1M', '1Y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range as TimeRange)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${timeRange === range
                                        ? 'bg-white text-black shadow-md'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                    >
                        <defs>
                            <linearGradient id="colorWorkload" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                            </linearGradient>

                            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

                        <XAxis
                            dataKey="time"
                            tickFormatter={formatXAxis}
                            stroke="rgba(255,255,255,0.2)"
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                            tickMargin={12}
                            minTickGap={30}
                        />

                        <YAxis
                            tickFormatter={formatYAxis}
                            stroke="rgba(255,255,255,0.2)"
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                            width={50}
                            domain={['auto', 0]}
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={chartType === 'candle' ? { fill: 'rgba(255,255,255,0.05)' } : { stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                        />

                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />

                        {chartType === 'line' && (
                            <Line
                                type="stepAfter" // Step line perfectly captures jumpy task completions
                                dataKey="workload"
                                stroke={strokeColor}
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, fill: strokeColor, stroke: '#000', strokeWidth: 2 }}
                                filter={isPositiveTrend ? "url(#glowGreen)" : "url(#glowRed)"}
                                animationDuration={1000}
                            />
                        )}

                        {chartType === 'candle' && (
                            <Bar
                                dataKey={['low', 'high']}
                                shape={<CandleShape />}
                                animationDuration={1000}
                                barSize={8}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
