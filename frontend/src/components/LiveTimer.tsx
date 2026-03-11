'use client';

import { useState, useEffect } from 'react';

interface ITimeTask {
    id: string;
    _id?: string;
    title: string;
    description: string;
    startTime: number;
    pausedElapsed: number;
    enabled: boolean;
    completed: boolean;
    completedAt?: number;
    targetTime?: number;
    events?: Array<{
        type: 'start' | 'pause' | 'complete';
        timestamp: number;
    }>;
}

interface LiveTimerProps {
    task: ITimeTask;
    getElapsedSeconds: (task: ITimeTask, currentTime: number) => number;
    formatElapsed: (seconds: number) => string;
}

export function LiveTimer({ task, getElapsedSeconds, formatElapsed }: LiveTimerProps) {
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    useEffect(() => {
        // Only run the timer if the task is currently active (running)
        if (!task.enabled || task.completed) return;

        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [task.enabled, task.completed]);

    return (
        <span className="font-mono">
            {formatElapsed(getElapsedSeconds(task, currentTime))}
        </span>
    );
}

// A simpler global stat timer that just ticks up total numbers
export function LiveTotalTimer({
    tasks,
    getElapsedSeconds,
    formatElapsed,
    className = ""
}: {
    tasks: ITimeTask[],
    getElapsedSeconds: (task: ITimeTask, currentTime: number) => number,
    formatElapsed: (seconds: number) => string,
    className?: string
}) {
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    const hasRunningTasks = tasks.some(t => t.enabled && !t.completed);

    useEffect(() => {
        // Only tick if there's actually a running task
        if (!hasRunningTasks) return;

        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [hasRunningTasks]);

    const totalTime = tasks.reduce((sum, task) => sum + getElapsedSeconds(task, currentTime), 0);

    return (
        <span className={`font-mono ${className}`}>
            {formatElapsed(totalTime)}
        </span>
    );
}
