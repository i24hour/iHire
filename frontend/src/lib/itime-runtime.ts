import ITimeTask from '@/models/ITimeTask';

export const ACTIVE_TASK_RUNTIME_LIMIT_SECONDS = 100 * 60 * 60;
const ACTIVE_TASK_RUNTIME_LIMIT_MS = ACTIVE_TASK_RUNTIME_LIMIT_SECONDS * 1000;

type RuntimeTask = {
    _id?: string;
    startTime?: number;
    pausedElapsed?: number;
    enabled?: boolean;
    completed?: boolean;
    completedAt?: number;
    cancelledAt?: number;
    cancelReason?: string;
    autoResumeAt?: number;
    events?: Array<{
        type: 'start' | 'pause' | 'complete';
        timestamp: number;
    }>;
    save?: () => Promise<unknown>;
};

function applyRuntimeLimitToTask(task: RuntimeTask, now: number): boolean {
    if (!task.enabled || task.completed || task.cancelledAt) {
        return false;
    }

    const pausedElapsedSeconds = task.pausedElapsed || 0;
    let totalMsBeforeCurrentRun = pausedElapsedSeconds * 1000;
    let activeRunStart: number | null = null;

    if (task.events && task.events.length > 0) {
        let isRunning = false;
        let lastStartTime = 0;
        totalMsBeforeCurrentRun = 0;

        for (const ev of task.events) {
            if (ev.type === 'start') {
                if (!isRunning) {
                    isRunning = true;
                    lastStartTime = ev.timestamp;
                }
            } else if ((ev.type === 'pause' || ev.type === 'complete') && isRunning) {
                totalMsBeforeCurrentRun += (ev.timestamp - lastStartTime);
                isRunning = false;
            }
        }

        if (task.events[0]?.type !== 'start') {
            totalMsBeforeCurrentRun += pausedElapsedSeconds * 1000;
        }

        if (isRunning) {
            activeRunStart = lastStartTime;
        }
    } else if (task.startTime) {
        activeRunStart = task.startTime;
    }

    if (!activeRunStart) {
        return false;
    }

    const liveElapsedMs = totalMsBeforeCurrentRun + Math.max(0, now - activeRunStart);
    if (liveElapsedMs < ACTIVE_TASK_RUNTIME_LIMIT_MS) {
        return false;
    }

    const remainingMsBeforeLimit = Math.max(0, ACTIVE_TASK_RUNTIME_LIMIT_MS - totalMsBeforeCurrentRun);
    const cutoffAt = activeRunStart + remainingMsBeforeLimit;

    task.enabled = false;
    task.pausedElapsed = ACTIVE_TASK_RUNTIME_LIMIT_SECONDS;
    task.autoResumeAt = undefined;
    task.cancelledAt = cutoffAt;
    task.cancelReason = 'runtime_limit';

    if (task.events) {
        const lastEvent = task.events[task.events.length - 1];
        if (!lastEvent || lastEvent.type === 'start') {
            task.events.push({ type: 'pause', timestamp: cutoffAt });
        }
    }

    return true;
}

export async function autoCancelExpiredActiveTasks(
    filter: Record<string, unknown> = {}
): Promise<number> {
    const activeTasks = await ITimeTask.find({
        enabled: true,
        completed: false,
        cancelledAt: { $exists: false },
        ...filter,
    });

    const now = Date.now();
    let autoCancelledCount = 0;

    for (const task of activeTasks as unknown as RuntimeTask[]) {
        if (applyRuntimeLimitToTask(task, now)) {
            await (task.save?.() ?? Promise.resolve());
            autoCancelledCount++;
        }
    }

    return autoCancelledCount;
}
