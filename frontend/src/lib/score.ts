export interface ScoreEvent {
    type: 'start' | 'pause' | 'complete';
    timestamp: number;
}

export interface ScoreTask {
    events?: ScoreEvent[];
    startTime: number;
    pausedElapsed: number;
    enabled: boolean;
    completed: boolean;
    completedAt?: number;
}

function computeBaseScore(tasks: ScoreTask[], t: number): number {
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
                } else if (!task.completed && !task.enabled) {
                    taskHours = task.pausedElapsed / 3600;
                } else {
                    taskHours = (t - task.startTime) / (1000 * 3600);
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

function getAllActiveIntervals(tasks: ScoreTask[], t: number) {
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
                } else if (!task.completed && !task.enabled) {
                    allIntervals.push({ start: task.startTime, end: task.startTime + task.pausedElapsed * 1000 });
                } else {
                    allIntervals.push({ start: task.startTime, end: t });
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
    tasks: ScoreTask[],
    t: number,
    gamificationPoints: number = 0,
    gamificationPointsLastUpdatedAt?: Date | string | number | null
): number {
    const allIntervals = getAllActiveIntervals(tasks, t);
    allIntervals.sort((a, b) => a.start - b.start);

    const mergedActive: { start: number; end: number }[] = [];
    for (const interval of allIntervals) {
        if (mergedActive.length === 0) {
            mergedActive.push({ ...interval });
        } else {
            const last = mergedActive[mergedActive.length - 1];
            if (interval.start <= last.end) {
                last.end = Math.max(last.end, interval.end);
            } else {
                mergedActive.push({ ...interval });
            }
        }
    }

    const IST_OFFSET_MS = 5.5 * 3600 * 1000;
    const APRIL_1_2026_IST = Date.UTC(2026, 3, 1, 0, 0, 0, 0) - IST_OFFSET_MS;

    const idleIntervals: { start: number; end: number }[] = [];
    let currentT = APRIL_1_2026_IST;

    for (const active of mergedActive) {
        if (active.end <= APRIL_1_2026_IST) continue;
        if (active.start > currentT) {
            idleIntervals.push({ start: currentT, end: Math.min(active.start, t) });
        }
        currentT = Math.max(currentT, active.end);
        if (currentT >= t) break;
    }

    if (currentT < t) {
        idleIntervals.push({ start: currentT, end: t });
    }

    const pointsCheckpoint = getPointsCheckpointTimestamp(gamificationPointsLastUpdatedAt);
    let accumulatedPenalty = 0;

    for (const idle of idleIntervals) {
        const segments = pointsCheckpoint && pointsCheckpoint > idle.start && pointsCheckpoint < idle.end
            ? [
                { start: idle.start, end: pointsCheckpoint },
                { start: pointsCheckpoint, end: idle.end }
            ]
            : [idle];

        for (const segment of segments) {
            const includeGithubPoints = gamificationPoints > 0 && (!pointsCheckpoint || segment.start >= pointsCheckpoint);
            const scoreAtSegmentStart = computeBaseScore(tasks, segment.start) + (includeGithubPoints ? gamificationPoints : 0);
            const visibleScore = Math.max(0, scoreAtSegmentStart - accumulatedPenalty);
            const rawPenalty = ((segment.end - segment.start) / 1000) * 0.001;
            accumulatedPenalty += Math.min(rawPenalty, visibleScore);
        }
    }

    const activeGithubPoints = gamificationPoints > 0 && (!pointsCheckpoint || t >= pointsCheckpoint)
        ? gamificationPoints
        : 0;
    const finalVisibleScore = computeBaseScore(tasks, t) + activeGithubPoints;

    return Math.round(Math.max(0, finalVisibleScore - accumulatedPenalty) * 100) / 100;
}
