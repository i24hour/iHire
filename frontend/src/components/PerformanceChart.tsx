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
    gamificationPoints?: number;
    gamificationPointsLastUpdatedAt?: Date | string | number | null;
}

type ChartType = 'line' | 'candle';
type CandleInterval = '1m' | '5m' | '10m' | '15m' | '1h' | '1d';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const IDLE_GRACE_SECONDS = 8 * 60;
const IDLE_BASE_PENALTY_RATE_PER_SEC = 0.0002;
const LONG_IDLE_THRESHOLD_SECONDS = 45 * 60;
const LONG_IDLE_PENALTY_RATE_PER_SEC = 0.00035;

function calculateIdlePenalty(idleMs: number): number {
    const idleSeconds = Math.max(0, idleMs / 1000);
    const effectiveIdleSeconds = Math.max(0, idleSeconds - IDLE_GRACE_SECONDS);

    if (effectiveIdleSeconds === 0) return 0;

    const baseBucketSeconds = Math.min(effectiveIdleSeconds, LONG_IDLE_THRESHOLD_SECONDS);
    const longIdleSeconds = Math.max(0, effectiveIdleSeconds - LONG_IDLE_THRESHOLD_SECONDS);

    return (baseBucketSeconds * IDLE_BASE_PENALTY_RATE_PER_SEC)
        + (longIdleSeconds * LONG_IDLE_PENALTY_RATE_PER_SEC);
}

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

function getMostRecent5PmIstTimestamp(referenceTime: number): number {
    const istDate = new Date(referenceTime + IST_OFFSET_MS);
    const todayFivePmIst = Date.UTC(
        istDate.getUTCFullYear(),
        istDate.getUTCMonth(),
        istDate.getUTCDate(),
        17,
        0,
        0,
        0
    ) - IST_OFFSET_MS;

    return referenceTime >= todayFivePmIst ? todayFivePmIst : todayFivePmIst - DAY_MS;
}

function getNext5PmIstTimestamp(referenceTime: number): number {
    return getMostRecent5PmIstTimestamp(referenceTime) + DAY_MS;
}



function getFocusedRange(values: number[], referenceValue?: number): { minValue: number; maxValue: number } | null {
    if (!values.length) return null;

    const focusWindow = Math.max(24, Math.floor(values.length * 0.2));
    const focusValues = values.slice(-focusWindow);
    const latestValue = focusValues[focusValues.length - 1];

    let minValue = Math.min(...focusValues);
    let maxValue = Math.max(...focusValues);

    // Always keep the previous close line in the visible range.
    if (typeof referenceValue === 'number' && Number.isFinite(referenceValue)) {
        minValue = Math.min(minValue, referenceValue);
        maxValue = Math.max(maxValue, referenceValue);
    }

    const span = Math.max(maxValue - minValue, Math.max(Math.abs(latestValue), 1) * 0.05);
    const padding = Math.max(span * 0.2, 1);
    return {
        minValue: minValue - padding,
        maxValue: maxValue + padding,
    };
}

function getFocusedCandleRange(candles: CandlestickData[], referenceValue?: number): { minValue: number; maxValue: number } | null {
    if (!candles.length) return null;

    const focusWindow = Math.max(24, Math.floor(candles.length * 0.2));
    const focusCandles = candles.slice(-focusWindow);

    const lows = focusCandles.map((c) => c.low);
    const highs = focusCandles.map((c) => c.high);

    let minValue = Math.min(...lows);
    let maxValue = Math.max(...highs);
    const latestClose = focusCandles[focusCandles.length - 1]?.close ?? maxValue;
    if (typeof referenceValue === 'number' && Number.isFinite(referenceValue)) {
        minValue = Math.min(minValue, referenceValue);
        maxValue = Math.max(maxValue, referenceValue);
    }

    const anchorValue = typeof referenceValue === 'number' && Number.isFinite(referenceValue)
        ? referenceValue
        : latestClose;
    const span = Math.max(maxValue - minValue, Math.max(Math.abs(anchorValue), 1) * 0.05);
    const padding = Math.max(span * 0.2, 1);

    return {
        minValue: minValue - padding,
        maxValue: maxValue + padding,
    };
}

/**
 * Calculate the performance score at a given point in time.
 * 
 * Formula:
 * Score = Completion_Rate × Speed_Score × Volume_Bonus × 1000
 * Completion_Rate = completed_tasks / total_tasks
 * Avg_Time_Per_Task = total_time_hrs / completed_tasks
 * Speed_Score = 1 / max(Avg_Time_Per_Task, 0.5)
 * Volume_Bonus = log10(completed_tasks + 1) × 2
 * 
 * - Total time includes completed task time plus active running time
 * - Completing a task adds to completed count and completed task hours
 * - Edge cases: no tasks or no completed tasks => score = 0
 */
function computeBaseScore(tasks: ChartTask[], t: number): number {
    let totalTasks = 0;
    let completedTasks = 0;
    let runningTasksHours = 0;
    let completedTasksHours = 0;

    for (const task of tasks) {
        const taskStartTime = task.events?.[0]?.timestamp ?? task.startTime;
        if (!taskStartTime || taskStartTime > t) continue;

        totalTasks++;

        let actualCompletedAt = task.completedAt;
        if (!actualCompletedAt && task.events?.length) {
            const completionEvent = [...task.events].reverse().find((event) => event.type === 'complete');
            if (completionEvent) {
                actualCompletedAt = completionEvent.timestamp;
            }
        }
        if (task.completed && !actualCompletedAt && (!task.events || task.events.length === 0)) {
            actualCompletedAt = task.startTime + (task.pausedElapsed * 1000);
        }

        const isCompletedByT = !!(task.completed && actualCompletedAt && actualCompletedAt <= t);

        let taskHours = 0;
        if (!task.events || task.events.length === 0) {
            if (task.startTime && task.startTime <= t) {
                if (isCompletedByT) {
                    taskHours = (actualCompletedAt! - task.startTime) / (1000 * 3600);
                } else {
                    if (!task.completed && !task.enabled) {
                        taskHours = (task.pausedElapsed * 1000) / (1000 * 3600);
                    } else {
                        taskHours = (t - task.startTime) / (1000 * 3600);
                    }
                }
            }
        } else {
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
                    if (!isRunning) {
                        isRunning = true;
                        lastStartTime = ev.timestamp;
                    }
                } else if (ev.type === 'pause' || ev.type === 'complete') {
                    if (isRunning) {
                        taskActiveMs += (ev.timestamp - lastStartTime);
                        isRunning = false;
                    }
                }
            }

            if (isRunning && !isCompletedByT && lastStartTime <= t) {
                taskActiveMs += (t - lastStartTime);
            }

            if (task.pausedElapsed > 0 && syntheticEvents.length > 0 && lastStartTime === 0) {
                taskActiveMs += (task.pausedElapsed * 1000);
            }

            taskHours = taskActiveMs / (1000 * 3600);
        }

        if (isCompletedByT) {
            completedTasks++;
            completedTasksHours += taskHours;
        } else {
            runningTasksHours += taskHours;
        }
    }

    if (totalTasks === 0 || completedTasks === 0) return 0;

    const completionRate = completedTasks / totalTasks;
    const totalTimeHours = completedTasksHours + runningTasksHours;
    const avgTimePerTask = totalTimeHours / completedTasks;
    const clampedAvgTime = Math.max(avgTimePerTask, 0.5);
    const speedScore = 1 / clampedAvgTime;
    const volumeBonus = Math.log10(completedTasks + 1) * 2;
    return completionRate * speedScore * volumeBonus * 1000;
}

function getAllActiveIntervals(tasks: ChartTask[], t: number) {
    const allIntervals: { start: number; end: number }[] = [];
    for (const task of tasks) {
        const taskStartTime = task.events?.[0]?.timestamp ?? task.startTime;
        if (!taskStartTime || taskStartTime > t) continue;

        let actualCompletedAt = task.completedAt;
        if (!actualCompletedAt && task.events?.length) {
            const completionEvent = [...task.events].reverse().find((event) => event.type === 'complete');
            if (completionEvent) {
                actualCompletedAt = completionEvent.timestamp;
            }
        }
        if (task.completed && !actualCompletedAt && (!task.events || task.events.length === 0)) {
            actualCompletedAt = task.startTime + (task.pausedElapsed * 1000);
        }

        const isCompletedByT = !!(task.completed && actualCompletedAt && actualCompletedAt <= t);

        if (!task.events || task.events.length === 0) {
            if (task.startTime && task.startTime <= t) {
                if (isCompletedByT) {
                    allIntervals.push({ start: task.startTime, end: actualCompletedAt! });
                } else {
                    if (!task.completed && !task.enabled) {
                        allIntervals.push({ start: task.startTime, end: task.startTime + task.pausedElapsed * 1000 });
                    } else {
                        allIntervals.push({ start: task.startTime, end: t });
                    }
                }
            }
        } else {
            const syntheticEvents = [...task.events];
            if (syntheticEvents[0].type !== 'start' && task.startTime && task.startTime < syntheticEvents[0].timestamp) {
                syntheticEvents.unshift({ type: 'start', timestamp: task.startTime });
            }

            let isRunning = false;
            let lastStartTime = 0;

            for (const ev of syntheticEvents) {
                if (ev.timestamp > t) break;
                if (ev.type === 'start') {
                    if (!isRunning) {
                        isRunning = true;
                        lastStartTime = ev.timestamp;
                    }
                } else if (ev.type === 'pause' || ev.type === 'complete') {
                    if (isRunning) {
                        allIntervals.push({ start: lastStartTime, end: ev.timestamp });
                        isRunning = false;
                    }
                }
            }

            if (isRunning && !isCompletedByT && lastStartTime <= t) {
                allIntervals.push({ start: lastStartTime, end: t });
            }
        }
    }
    return allIntervals;
}

function getPointsCheckpointTimestamp(value?: Date | string | number | null): number | null {
    if (value === null || value === undefined) return null;

    const timestamp = value instanceof Date
        ? value.getTime()
        : typeof value === 'number'
            ? value
            : new Date(value).getTime();

    return Number.isNaN(timestamp) ? null : timestamp;
}

export function getScoreAtTime(
    tasks: ChartTask[],
    t: number,
    gamificationPoints: number = 0,
    gamificationPointsLastUpdatedAt?: Date | string | number | null
): number {
    const allIntervals = getAllActiveIntervals(tasks, t);
    allIntervals.sort((a, b) => a.start - b.start);

    // Merge active intervals
    const mergedActive: { start: number; end: number }[] = [];
    for (const iv of allIntervals) {
        if (mergedActive.length === 0) {
            mergedActive.push({ ...iv });
        } else {
            const last = mergedActive[mergedActive.length - 1];
            if (iv.start <= last.end) {
                last.end = Math.max(last.end, iv.end);
            } else {
                mergedActive.push({ ...iv });
            }
        }
    }

    // Fixed Continuous Penalty rule: only applies from April 1, 2026 IST onwards.
    const IST_OFFSET_MS = 5.5 * 3600 * 1000;
    const APRIL_1_2026_IST = Date.UTC(2026, 3, 1, 0, 0, 0, 0) - IST_OFFSET_MS;
    const penaltyWindowStart = APRIL_1_2026_IST; // Constant date window start!

    // Find strictly idle periods within the penalty window (penaltyWindowStart -> t)
    const idleIntervals: { start: number; end: number }[] = [];
    let currentT = penaltyWindowStart;

    for (const active of mergedActive) {
        if (active.end <= penaltyWindowStart) continue;
        if (active.start > currentT) {
            idleIntervals.push({ start: currentT, end: Math.min(active.start, t) });
        }
        currentT = Math.max(currentT, active.end);
        if (currentT >= t) break;
    }
    if (currentT < t) {
        idleIntervals.push({ start: currentT, end: t });
    }

    // Accumulate penalty iteratively, locking penalty if the "visible score" goes to 0
    const pointsCheckpoint = getPointsCheckpointTimestamp(gamificationPointsLastUpdatedAt);
    let p_accum = 0;
    for (const idle of idleIntervals) {
        const segments = pointsCheckpoint && pointsCheckpoint > idle.start && pointsCheckpoint < idle.end
            ? [
                { start: idle.start, end: pointsCheckpoint },
                { start: pointsCheckpoint, end: idle.end }
            ]
            : [idle];

        for (const segment of segments) {
            const includeGithubPoints = gamificationPoints > 0 && (!pointsCheckpoint || segment.start >= pointsCheckpoint);
            const s = computeBaseScore(tasks, segment.start) + (includeGithubPoints ? gamificationPoints : 0);
            const v = Math.max(0, s - p_accum);

            // Slow decay: brief breaks are free, then apply gentle idle drain.
            const rawPenalty = calculateIdlePenalty(segment.end - segment.start);

            // Penalty can only drain existing visible points at this checkpoint.
            const actualPenalty = Math.min(rawPenalty, v);
            p_accum += actualPenalty;
        }
    }

    const activeGithubPoints = gamificationPoints > 0 && (!pointsCheckpoint || t >= pointsCheckpoint)
        ? gamificationPoints
        : 0;
    const finalVisibleScore = computeBaseScore(tasks, t) + activeGithubPoints;
    return Math.round(Math.max(0, finalVisibleScore - p_accum) * 100) / 100;
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

export function PerformanceChart({
    tasks,
    gamificationPoints = 0,
    gamificationPointsLastUpdatedAt = null
}: PerformanceChartProps) {
    const [chartType, setChartType] = useState<ChartType>('line');
    const [interval, setIntervalVal] = useState<CandleInterval>('15m');
    const [isLightTheme, setIsLightTheme] = useState(false);
    const [referenceNow, setReferenceNow] = useState(() => Date.now());
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Baseline'> | null>(null);

    useEffect(() => {
        const root = document.documentElement;
        const syncTheme = () => {
            setIsLightTheme(root.getAttribute('data-theme') === 'light');
        };

        syncTheme();
        const observer = new MutationObserver(syncTheme);
        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let timeoutId: number | undefined;

        const scheduleReferenceRefresh = () => {
            const now = Date.now();
            const nextFivePmIst = getNext5PmIstTimestamp(now);
            timeoutId = window.setTimeout(() => {
                setReferenceNow(Date.now());
                scheduleReferenceRefresh();
            }, Math.max((nextFivePmIst - now) + 1000, 1000));
        };

        scheduleReferenceRefresh();

        return () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

    // Track the most recent 5 PM IST close and refresh it automatically after each daily close.
    const previousCloseTimestamp = useMemo(() => {
        return getMostRecent5PmIstTimestamp(referenceNow);
    }, [referenceNow]);

    const previousCloseValue = useMemo(() => {
        return getScoreAtTime(tasks, previousCloseTimestamp, gamificationPoints, gamificationPointsLastUpdatedAt);
    }, [tasks, previousCloseTimestamp, gamificationPoints, gamificationPointsLastUpdatedAt]);

    // Generate OHLC data
    const chartData = useMemo(() => {
        const now = Date.now();
        let intervalMs = getIntervalMs(interval);
        const snappedNow = snapToInterval(now, interval);

        let startTime = snappedNow - (24 * 60 * 60 * 1000);

        // Show full history by extending to the earliest task timestamp when available.
        const earliestTaskStart = tasks.reduce((earliest, task) => {
            const ts = task.events?.[0]?.timestamp ?? task.startTime;
            return ts && ts < earliest ? ts : earliest;
        }, now);
        if (earliestTaskStart < startTime) {
            startTime = earliestTaskStart;
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

            let open = getScoreAtTime(tasks, T_start, gamificationPoints, gamificationPointsLastUpdatedAt);
            let close = getScoreAtTime(tasks, T_end, gamificationPoints, gamificationPointsLastUpdatedAt);
            let high = Math.max(open, close);
            let low = Math.min(open, close);

            // Evaluate at event boundaries for accurate high/low
            for (const task of tasks) {
                if (task.events) {
                    for (const ev of task.events) {
                        if (ev.timestamp > T_start && ev.timestamp <= T_end) {
                            const val = getScoreAtTime(tasks, ev.timestamp, gamificationPoints, gamificationPointsLastUpdatedAt);
                            const valBefore = getScoreAtTime(tasks, ev.timestamp - 1, gamificationPoints, gamificationPointsLastUpdatedAt);
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
    }, [tasks, interval, gamificationPoints, gamificationPointsLastUpdatedAt]);

    // Create/update chart container and base settings
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
                textColor: isLightTheme ? 'rgba(24, 24, 27, 0.75)' : 'rgba(255, 255, 255, 0.5)',
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: isLightTheme ? 'rgba(24, 24, 27, 0.06)' : 'rgba(255, 255, 255, 0.04)' },
                horzLines: { color: isLightTheme ? 'rgba(24, 24, 27, 0.06)' : 'rgba(255, 255, 255, 0.04)' },
            },
            crosshair: {
                vertLine: {
                    color: isLightTheme ? 'rgba(24, 24, 27, 0.18)' : 'rgba(255, 255, 255, 0.2)',
                    labelBackgroundColor: isLightTheme ? '#f4f4f5' : '#333',
                },
                horzLine: {
                    color: isLightTheme ? 'rgba(24, 24, 27, 0.18)' : 'rgba(255, 255, 255, 0.2)',
                    labelBackgroundColor: isLightTheme ? '#f4f4f5' : '#333',
                },
            },
            rightPriceScale: {
                borderColor: isLightTheme ? 'rgba(24, 24, 27, 0.12)' : 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: isLightTheme ? 'rgba(24, 24, 27, 0.12)' : 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }).format(date);
                },
            },
            localization: {
                priceFormatter: (price: number) => price.toFixed(2),
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
                upColor: '#10b981',
                downColor: '#ef4444',
                borderDownColor: '#ef4444',
                borderUpColor: '#10b981',
                wickDownColor: '#ef4444',
                wickUpColor: '#10b981',
                priceLineVisible: false,
                lastValueVisible: false,
                autoscaleInfoProvider: () => {
                    const range = getFocusedCandleRange(chartData.candleData, previousCloseValue);
                    if (!range) return null;
                    return { priceRange: range };
                },
            });

            candleSeries.createPriceLine({
                price: previousCloseValue,
                color: isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.4)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: false,
            });

            seriesRef.current = candleSeries;
        } else {
            const baselineSeries = chart.addSeries(BaselineSeries, {
                baseValue: { type: 'price' as const, price: previousCloseValue },
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
                priceLineVisible: false,
                lastValueVisible: false,
                autoscaleInfoProvider: () => {
                    const vals = chartData.baselineData.map((d) => d.value);
                    const range = getFocusedRange(vals, previousCloseValue);
                    if (!range) return null;
                    return {
                        priceRange: range,
                    };
                },
            });

            baselineSeries.createPriceLine({
                price: previousCloseValue,
                color: isLightTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.4)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: false,
            });

            seriesRef.current = baselineSeries;
        }

        // Apply initial data immediately so that auto-scaling aligns properly
        let dataLength = 0;
        if (chartType === 'candle') {
            (seriesRef.current as ISeriesApi<'Candlestick'>).setData(chartData.candleData);
            dataLength = chartData.candleData.length;
        } else {
            (seriesRef.current as ISeriesApi<'Baseline'>).setData(chartData.baselineData);
            dataLength = chartData.baselineData.length;
        }
        
        // Instead of fitContent or hardcoded bar counts, we guarantee exactly 1 rolling month of history
        if (dataLength > 0) {
            const nowInSeconds = Math.floor(Date.now() / 1000);
            const thirtyDaysAgo = nowInSeconds - (30 * 24 * 60 * 60);
            
            // Note: time is passed as raw number to satisfy lightweight-charts Time type constraint
            chart.timeScale().setVisibleRange({
                from: thirtyDaysAgo as unknown as import('lightweight-charts').Time,
                to: nowInSeconds as unknown as import('lightweight-charts').Time,
            });
        }

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
    }, [chartType, previousCloseValue, isLightTheme]);

    // Update data invisibly on poll (avoids calling fitContent and resetting pan)
    useEffect(() => {
        if (!seriesRef.current) return;
        
        if (chartType === 'candle') {
            (seriesRef.current as ISeriesApi<'Candlestick'>).setData(chartData.candleData);
        } else {
            (seriesRef.current as ISeriesApi<'Baseline'>).setData(chartData.baselineData);
        }
    }, [chartData, chartType]);

    // Live native update cycle (No React state changes triggered!)
    useEffect(() => {
        const intervalMs = getIntervalMs(interval);

        const liveInterval = setInterval(() => {
            if (!seriesRef.current) return;

            const now = Date.now();
            const currentScore = getScoreAtTime(tasks, now, gamificationPoints, gamificationPointsLastUpdatedAt);
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
    }, [tasks, interval, chartType, chartData, gamificationPoints, gamificationPointsLastUpdatedAt]);

    return (
        <div className="bg-black rounded-2xl border border-white/10 p-6 flex flex-col w-full h-[500px]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white">Performance Score</h2>
                    <p className="text-sm text-zinc-500 mt-1">Score = Completion × Speed × Volume</p>
                    <p className="text-xs text-zinc-600 mt-1">
                        * Dotted line represents the most recent 5 PM IST score
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Chart Type Toggle */}
                    <div className={`flex rounded-lg p-1 border ${isLightTheme ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                        <button
                            onClick={() => setChartType('line')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartType === 'line'
                                ? (isLightTheme ? 'bg-white text-zinc-900 border border-black/10 shadow-sm' : 'bg-zinc-800 text-white shadow-md')
                                : (isLightTheme ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-500 hover:text-white')
                                }`}
                        >
                            Line
                        </button>
                        <button
                            onClick={() => setChartType('candle')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartType === 'candle'
                                ? (isLightTheme ? 'bg-white text-zinc-900 border border-black/10 shadow-sm' : 'bg-zinc-800 text-white shadow-md')
                                : (isLightTheme ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-500 hover:text-white')
                                }`}
                        >
                            Candle
                        </button>
                    </div>

                    {/* Interval Selector (Candle Only) */}
                    {
                        chartType === 'candle' && (
                            <div className={`flex rounded-lg p-1 border ${isLightTheme ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                                {(['1m', '5m', '10m', '15m', '1h', '1d'] as CandleInterval[]).map((int) => (
                                    <button
                                        key={int}
                                        onClick={() => setIntervalVal(int)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${interval === int
                                            ? (isLightTheme ? 'bg-white text-zinc-900 border border-black/10 shadow-sm' : 'bg-zinc-800 text-white shadow-md')
                                            : (isLightTheme ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-500 hover:text-white')
                                            }`}
                                    >
                                        {int}
                                    </button>
                                ))}
                            </div>
                        )
                    }

                </div >
            </div >

            {/* Chart Container */}
            < div ref={chartContainerRef} className="flex-1 w-full" />
        </div >
    );
}
