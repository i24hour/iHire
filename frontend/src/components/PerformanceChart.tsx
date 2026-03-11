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

function getWorkloadAtTime(tasks: ChartTask[], t: number): number {
    let totalMs = 0;
    for (const task of tasks) {
        if (!task.events || task.events.length === 0) {
            if (task.startTime && task.startTime <= t) {
                if (task.completed && task.completedAt && task.completedAt <= t) {
                    // completed before time t - no burden
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

        const syntheticEvents = [...task.events];
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
                if (!isRunning) { isRunning = true; lastStartTime = ev.timestamp; }
            } else if (ev.type === 'pause') {
                if (isRunning) { taskActiveMs += (ev.timestamp - lastStartTime); isRunning = false; }
            } else if (ev.type === 'complete') {
                if (isRunning) { taskActiveMs += (ev.timestamp - lastStartTime); isRunning = false; }
                isCompleted = true;
            }
        }

        if (isCompleted) continue;
        if (isRunning && lastStartTime <= t) taskActiveMs += (t - lastStartTime);
        if (task.pausedElapsed > 0 && syntheticEvents.length > 0 && lastStartTime === 0 && !isCompleted) {
            totalMs += (task.pausedElapsed * 1000);
        }
        totalMs += taskActiveMs;
    }

    return -(totalMs / (1000 * 3600)); // Negated so higher workload plots lower on the chart
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

            let open = getWorkloadAtTime(tasks, T_start);
            let close = getWorkloadAtTime(tasks, T_end);
            let high = Math.max(open, close);
            let low = Math.min(open, close);

            // Evaluate at event boundaries for accurate high/low
            for (const task of tasks) {
                if (task.events) {
                    for (const ev of task.events) {
                        if (ev.timestamp > T_start && ev.timestamp <= T_end) {
                            const val = getWorkloadAtTime(tasks, ev.timestamp);
                            const valBefore = getWorkloadAtTime(tasks, ev.timestamp - 1);
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
                    // Hide the mathematical negative sign since the chart drops downward for more workload
                    return Math.abs(price).toFixed(2);
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
            // First value becomes the baseline comparison point
            const startVal = chartData.baselineData.length > 0 ? chartData.baselineData[0].value : 0;

            // Use BaselineSeries for green/red coloring relative to the starting timeline value
            const baselineSeries = chart.addSeries(BaselineSeries, {
                baseValue: { type: 'price' as const, price: startVal },
                topLineColor: '#10b981',
                topFillColor1: 'rgba(16, 185, 129, 0.28)',
                topFillColor2: 'rgba(16, 185, 129, 0.05)',
                bottomLineColor: '#ef4444',
                bottomFillColor1: 'rgba(239, 68, 68, 0.05)',
                bottomFillColor2: 'rgba(239, 68, 68, 0.28)',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 5,
                crosshairMarkerBorderColor: '#000',
                crosshairMarkerBackgroundColor: '#fff',
                priceLineVisible: true, // We restore the default current tracking line here!
                lastValueVisible: true,
            });
            baselineSeries.setData(chartData.baselineData);

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
    }, [chartType, chartData]);

    // Live native update cycle (No React state changes triggered!)
    useEffect(() => {
        const intervalMs = getIntervalMs(interval);

        const liveInterval = setInterval(() => {
            if (!seriesRef.current) return;

            const now = Date.now();
            const currentWorkload = getWorkloadAtTime(tasks, now);
            const snappedNow = snapToInterval(now, interval);
            const timeSeconds = Math.floor(snappedNow / 1000) as Time;

            if (chartType === 'line') {
                const baselineSeries = seriesRef.current as ISeriesApi<'Baseline'>;
                // Live update the right-most point
                baselineSeries.update({
                    time: timeSeconds,
                    value: currentWorkload
                });
            } else {
                const candleSeries = seriesRef.current as ISeriesApi<'Candlestick'>;
                // We need to fetch the last known OHLC from chartData to update its close
                const lastCandle = chartData.candleData[chartData.candleData.length - 1];
                if (lastCandle && lastCandle.time === timeSeconds) {
                    candleSeries.update({
                        time: timeSeconds,
                        open: lastCandle.open,
                        high: Math.max(lastCandle.high, currentWorkload),
                        low: Math.min(lastCandle.low, currentWorkload),
                        close: currentWorkload
                    });
                } else {
                    // It rolled over to a new candle bucket, start a fresh one
                    candleSeries.update({
                        time: timeSeconds,
                        open: currentWorkload,
                        high: currentWorkload,
                        low: currentWorkload,
                        close: currentWorkload
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
                    <h2 className="text-xl font-semibold text-white">Capacity & Performance</h2>
                    <p className="text-sm text-zinc-500 mt-1">Accumulated hours of active tasks</p>
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
