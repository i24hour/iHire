'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, BaselineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LineData, type BaselineData, type Time, LineStyle } from 'lightweight-charts';

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
type CandleInterval = '1m' | '5m' | '10m' | '15m' | '1h' | '1d';

const getIntervalMs = (interval: CandleInterval) => {
    switch (interval) {
        case '1m': return 60 * 1000;
        case '5m': return 5 * 60 * 1000;
        case '10m': return 10 * 60 * 1000;
        case '15m': return 15 * 60 * 1000;
        case '1h': return 60 * 60 * 1000;
        case '1d': return 24 * 60 * 60 * 1000;
        default: return 15 * 60 * 1000;
    }
};

/**
 * Calculate the performance score at a given point in time (matching Claude's formula).
 * 
 * Formula: Score = (Completed / Total) × (1 / AvgTime) × log(Total + 1) × 1000
 * Where AvgTime = Total Time of Running Tasks / Completed Tasks
 * 
 * - Running tasks' time ticks → avg time grows → score drops every second
 * - Completing a task → it exits running pool → score spikes up
 * - Edge cases: 0 tasks, 0 completed, or 0 running → score = 0
 */
function getScoreAtTime(tasks: ChartTask[], t: number): number {
    let totalTasks = 0;
    let completedTasks = 0;
    let runningTaskCount = 0;
    let runningTasksHours = 0;

    for (const task of tasks) {
        // Only count tasks that existed at time t
        const taskStartTime = task.events?.[0]?.timestamp ?? task.startTime;
        if (!taskStartTime || taskStartTime > t) continue;

        totalTasks++;

        // Check if completed by time t
        // Legacy tasks might miss completedAt, so we fall back to task.completed
        let isCompletedByT = false;
        if (task.completed) {
            if (task.completedAt) {
                if (task.completedAt <= t) isCompletedByT = true;
            } else {
                // Fallback for legacy tasks: assume completed if started before t
                if (t >= task.startTime) isCompletedByT = true;
            }
        }

        if (isCompletedByT) {
            completedTasks++;
            continue; // Completed tasks don't contribute to running avg
        }

        // This task is NOT completed at time t — it's "running" (active or paused)
        // Calculate its accumulated active time up to t
        let taskHours = 0;

        if (!task.events || task.events.length === 0) {
            if (task.startTime && task.startTime <= t) {
                if (!task.completed && task.enabled) {
                    taskHours = ((t - task.startTime) + (task.pausedElapsed * 1000)) / (1000 * 3600);
                } else if (!task.completed && !task.enabled) {
                    taskHours = (task.pausedElapsed * 1000) / (1000 * 3600);
                }
            }
        } else {
            // Event-based calculation
            const syntheticEvents = [...task.events];
            if (syntheticEvents[0].type !== 'start' && task.startTime && task.startTime < syntheticEvents[0].timestamp) {
                syntheticEvents.unshift({ type: 'start', timestamp: task.startTime });
            }

            let taskActiveMs = 0;
            let isRunning = false;
            let lastStartTime = 0;

            for (const ev of syntheticEvents) {
                if (ev.timestamp > t) break;
                if (ev.type === 'start') {
                    if (!isRunning) { isRunning = true; lastStartTime = ev.timestamp; }
                } else if (ev.type === 'pause') {
                    if (isRunning) { taskActiveMs += (ev.timestamp - lastStartTime); isRunning = false; }
                } else if (ev.type === 'complete') {
                    if (isRunning) { taskActiveMs += (ev.timestamp - lastStartTime); isRunning = false; }
                }
            }

            if (isRunning && lastStartTime <= t) {
                taskActiveMs += (t - lastStartTime);
            }

            if (task.pausedElapsed > 0 && syntheticEvents.length > 0 && lastStartTime === 0) {
                taskActiveMs += (task.pausedElapsed * 1000);
            }

            taskHours = taskActiveMs / (1000 * 3600);
        }

        runningTaskCount++;
        runningTasksHours += taskHours;
    }

    // Edge cases
    if (totalTasks === 0 || completedTasks === 0) return 0;
    if (runningTaskCount === 0 || runningTasksHours <= 0) {
        // All tasks completed — use a high score based purely on completion & volume
        const volumeMultiplier = Math.log(totalTasks + 1);
        return 1 * 1 * volumeMultiplier * 1000; // Perfect completion, infinite speed
    }

    // Claude's specific Formula from user screenshot:
    // Avg time = Total Time (Running Tasks) / Completed Tasks
    const avgTimePerCompletedTask = runningTasksHours / completedTasks;

    // Score = (Completed/Total) × (1/AvgTime) × log(Total+1) × 1000
    const completionRate = completedTasks / totalTasks;
    const speedFactor = 1 / avgTimePerCompletedTask;
    const volumeMultiplier = Math.log(totalTasks + 1);

    return completionRate * speedFactor * volumeMultiplier * 1000;
}

function snapToInterval(timestamp: number, interval: CandleInterval): number {
    const d = new Date(timestamp);
    if (interval === '1m') {
        d.setSeconds(0, 0);
    } else if (interval === '5m') {
        d.setSeconds(0, 0);
        d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
    } else if (interval === '10m') {
        d.setSeconds(0, 0);
        d.setMinutes(Math.floor(d.getMinutes() / 10) * 10);
    } else if (interval === '15m') {
        d.setSeconds(0, 0);
        d.setMinutes(Math.floor(d.getMinutes() / 15) * 15);
    } else if (interval === '1h') {
        d.setMinutes(0, 0, 0);
    } else if (interval === '1d') {
        d.setHours(0, 0, 0, 0);
    }
    return d.getTime();
}

export function PerformanceChart({ tasks }: PerformanceChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('1D');
    const [chartType, setChartType] = useState<ChartType>('line');
    const [interval, setIntervalVal] = useState<CandleInterval>('15m');
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Baseline'> | null>(null);

    const handleTimeRangeChange = (range: TimeRange) => {
        setTimeRange(range);
        if (range === '1D') setIntervalVal('15m');
        else if (range === '1W') setIntervalVal('1h');
        else if (range === '1M') setIntervalVal('1d');
        else if (range === '1Y') setIntervalVal('1d');
    };

    // Compute previous close reference timestamp (5 PM Local Time)
    const previousCloseTimestamp = useMemo(() => {
        const d = new Date();
        // Set to 5 PM local time of the current day first
        d.setHours(17, 0, 0, 0);

        // Always target the previous day's 5 PM as the reference
        d.setDate(d.getDate() - 1);

        switch (timeRange) {
            case '1D': return d.getTime();
            case '1W': {
                d.setDate(d.getDate() - 6); // 1 week prior to yesterday
                return d.getTime();
            }
            case '1M': {
                d.setMonth(d.getMonth() - 1);
                return d.getTime();
            }
            case '1Y': {
                d.setFullYear(d.getFullYear() - 1);
                return d.getTime();
            }
            default: return d.getTime();
        }
    }, [timeRange]);

    const previousCloseValue = useMemo(() => {
        return getScoreAtTime(tasks, previousCloseTimestamp);
    }, [tasks, previousCloseTimestamp]);

    // Generate OHLC data
    const chartData = useMemo(() => {
        const now = Date.now();
        let intervalMs = getIntervalMs(interval);
        const snappedNow = snapToInterval(now, interval);

        let startTime = snappedNow;
        switch (timeRange) {
            case '1D': startTime = snappedNow - (24 * 60 * 60 * 1000); break;
            case '1W': startTime = snappedNow - (7 * 24 * 60 * 60 * 1000); break;
            case '1M': startTime = snappedNow - (30 * 24 * 60 * 60 * 1000); break;
            case '1Y': startTime = snappedNow - (365 * 24 * 60 * 60 * 1000); break;
        }

        let dataPointsCount = Math.floor((now - startTime) / intervalMs);
        if (dataPointsCount > 500) {
            dataPointsCount = 500;
            intervalMs = (now - startTime) / 500;
        }

        const candleData: CandlestickData[] = [];
        const lineData: LineData[] = [];
        const baselineData: BaselineData[] = [];

        for (let i = 0; i <= dataPointsCount; i++) {
            const T_start = startTime + (i * intervalMs);
            const T_end = Math.min(now, startTime + ((i + 1) * intervalMs));
            if (T_start >= now) break;

            let open = getScoreAtTime(tasks, T_start);
            let close = getScoreAtTime(tasks, T_end);
            let high = Math.max(open, close);
            let low = Math.min(open, close);

            // Evaluate at event boundaries for accurate high/low
            for (const task of tasks) {
                if (task.events) {
                    for (const ev of task.events) {
                        if (ev.timestamp > T_start && ev.timestamp <= T_end) {
                            const val = getScoreAtTime(tasks, ev.timestamp);
                            const valBefore = getScoreAtTime(tasks, ev.timestamp - 1);
                            high = Math.max(high, val, valBefore);
                            low = Math.min(low, val, valBefore);
                        }
                    }
                }
            }

            // lightweight-charts uses seconds as timestamp
            const timeSeconds = Math.floor(T_end / 1000) as Time;

            candleData.push({
                time: timeSeconds,
                open,
                high,
                low,
                close,
            });

            lineData.push({
                time: timeSeconds,
                value: close,
            });

            baselineData.push({
                time: timeSeconds,
                value: close,
            });
        }

        return { candleData, lineData, baselineData };
    }, [tasks, timeRange, interval]);

    // Create/update chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Clear previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
            seriesRef.current = null;
        }

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: 'rgba(255, 255, 255, 0.5)',
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
            },
            crosshair: {
                vertLine: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    labelBackgroundColor: '#333',
                },
                horzLine: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    labelBackgroundColor: '#333',
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).format(date);
                },
            },
            localization: {
                priceFormatter: (price: number) => {
                    return price.toFixed(2);
                },
                timeFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).format(date);
                }
            },
            handleScroll: true,
            handleScale: true,
        });

        chartRef.current = chart;

        if (chartType === 'candle') {
            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#10b981', // Green for workload decrease (task completed, chart goes UP towards zero)
                downColor: '#ef4444', // Red for workload increase (more tasks running, chart goes DOWN into negatives)
                borderDownColor: '#ef4444',
                borderUpColor: '#10b981',
                wickDownColor: '#ef4444',
                wickUpColor: '#10b981',
                priceLineVisible: false,
                lastValueVisible: false,
            });
            candleSeries.setData(chartData.candleData);
            seriesRef.current = candleSeries;
        } else {
            // Use BaselineSeries for green/red coloring relative to the 5PM close value
            // Since our Y-axis visually drops as workload increases, we invert the top/bottom colors
            // so visually dropping below the current line is Red, visually rising is Green.
            const baselineSeries = chart.addSeries(BaselineSeries, {
                baseValue: { type: 'price' as const, price: previousCloseValue },
                topLineColor: '#10b981', // Green for above the baseline
                topFillColor1: 'rgba(16, 185, 129, 0.28)',
                topFillColor2: 'rgba(16, 185, 129, 0.05)',
                bottomLineColor: '#ef4444', // Red for below the baseline
                bottomFillColor1: 'rgba(239, 68, 68, 0.05)',
                bottomFillColor2: 'rgba(239, 68, 68, 0.28)',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 5,
                crosshairMarkerBorderColor: '#000',
                crosshairMarkerBackgroundColor: '#fff',
                priceLineVisible: false,
                lastValueVisible: false,
                autoscaleInfoProvider: () => {
                    if (!chartData.baselineData.length) return null;
                    const vals = chartData.baselineData.map(d => d.value);
                    return {
                        priceRange: {
                            minValue: Math.min(...vals, previousCloseValue),
                            maxValue: Math.max(...vals, previousCloseValue),
                        },
                    };
                },
            });
            baselineSeries.setData(chartData.baselineData);

            // Add the dotted "Previous Close" horizontal price line
            baselineSeries.createPriceLine({
                price: previousCloseValue,
                color: 'rgba(255, 255, 255, 0.4)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: false,
            });

            seriesRef.current = baselineSeries;
        }

        chart.timeScale().fitContent();

        // Handle resize
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                chart.applyOptions({ width, height });
            }
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, [chartType, chartData, previousCloseValue]);

    // Live native update cycle (No React state changes triggered!)
    useEffect(() => {
        const intervalMs = getIntervalMs(interval);

        const liveInterval = setInterval(() => {
            if (!seriesRef.current) return;

            const now = Date.now();
            const currentScore = getScoreAtTime(tasks, now);
            const snappedNow = snapToInterval(now, interval);
            const timeSeconds = Math.floor(snappedNow / 1000) as Time;

            if (chartType === 'line') {
                const baselineSeries = seriesRef.current as ISeriesApi<'Baseline'>;
                // Live update the right-most point
                baselineSeries.update({
                    time: timeSeconds,
                    value: currentScore
                });
            } else {
                const candleSeries = seriesRef.current as ISeriesApi<'Candlestick'>;
                // We need to fetch the last known OHLC from chartData to update its close
                const lastCandle = chartData.candleData[chartData.candleData.length - 1];
                if (lastCandle && lastCandle.time === timeSeconds) {
                    candleSeries.update({
                        time: timeSeconds,
                        open: lastCandle.open,
                        high: Math.max(lastCandle.high, currentScore),
                        low: Math.min(lastCandle.low, currentScore),
                        close: currentScore
                    });
                } else {
                    // It rolled over to a new candle bucket, start a fresh one
                    candleSeries.update({
                        time: timeSeconds,
                        open: currentScore,
                        high: currentScore,
                        low: currentScore,
                        close: currentScore
                    });
                }
            }
        }, 1000);

        return () => clearInterval(liveInterval);
    }, [tasks, interval, chartType, chartData]);

    return (
        <div className="bg-black rounded-2xl border border-white/10 p-6 flex flex-col w-full h-[500px]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white">Performance Score</h2>
                    <p className="text-sm text-zinc-500 mt-1">Score = Completion × Speed × Volume</p>
                    {chartType === 'line' && (
                        <p className="text-xs text-zinc-600 mt-1">
                            * Dotted line represents your previous {
                                timeRange === '1D' ? 'day\'s' :
                                    timeRange === '1W' ? 'week\'s' :
                                        timeRange === '1M' ? 'month\'s' : 'year\'s'
                            } 5 PM score
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
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

                    {/* Interval Selector (Candle Only) */}
                    {chartType === 'candle' && (
                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                            {(['1m', '5m', '10m', '15m', '1h', '1d'] as CandleInterval[]).map((int) => (
                                <button
                                    key={int}
                                    onClick={() => setIntervalVal(int)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${interval === int
                                        ? 'bg-zinc-800 text-white shadow-md'
                                        : 'text-zinc-500 hover:text-white'
                                        }`}
                                >
                                    {int}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Time Range Selector */}
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                        {(['1D', '1W', '1M', '1Y'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => handleTimeRangeChange(range)}
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

            {/* Chart Container */}
            <div ref={chartContainerRef} className="flex-1 w-full" />
        </div>
    );
}
