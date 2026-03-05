'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

// Use same types as ITimeTracker
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
    milestones?: Milestone[];
}

interface Milestone {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: number;
    createdAt: number;
    createdAtElapsed: number;
}

export default function WorkerTasksPage({ params }: { params: Promise<{ userId: string }> }) {
    const [tasks, setTasks] = useState<ITimeTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [selectedTask, setSelectedTask] = useState<ITimeTask | null>(null);

    // Unwrap params in Next.js 15+ using React.use
    const resolvedParams = use(params);
    const userId = decodeURIComponent(resolvedParams.userId);

    const fetchTasks = useCallback(async () => {
        try {
            const response = await fetch(`/api/workers/${encodeURIComponent(userId)}/tasks`);
            if (response.ok) {
                const data = await response.json();
                setTasks(data.tasks.map((t: any) => ({
                    ...t,
                    id: t._id,
                })));
            } else {
                throw new Error('Failed to fetch tasks');
            }
        } catch (err: any) {
            console.error('Error fetching tasks:', err);
            setError(err.message || 'Error loading tasks');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Timer interval - update current time every second to show live progress of running tasks
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const getElapsedSeconds = (task: ITimeTask): number => {
        if (!task.enabled || task.completed) {
            return task.pausedElapsed;
        }
        // If task is running, calculate elapsed time since it started
        const runningSince = (currentTime - task.startTime) / 1000;
        return Math.floor(task.pausedElapsed + runningSince);
    };

    const formatElapsed = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const totalTime = tasks.reduce((sum, task) => sum + getElapsedSeconds(task), 0);
    const activeTasksCount = tasks.filter((task) => task.enabled && !task.completed).length;
    const pendingTasks = tasks.filter((task) => !task.completed);
    const completedTasks = tasks.filter((task) => task.completed);

    if (isLoading) {
        return (
            <div className="flex h-[100dvh] items-center justify-center bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-[100dvh] items-center justify-center bg-black text-white gap-4">
                <p className="text-red-400">Error: {error}</p>
                <Link href="/workers" className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                    Back to Workers Directory
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full ml-0 md:ml-64">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <Link href="/workers" className="text-emerald-500 text-sm hover:underline mb-2 inline-block">
                                ← Back to Workers
                            </Link>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                {userId.split('@')[0]}'s Tasks
                                <span className="bg-zinc-800 text-xs px-2 py-1 rounded text-zinc-400 font-normal">Read-only View</span>
                            </h1>
                            <p className="text-gray-400 text-sm">
                                {userId}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
                        <div className="text-sm text-gray-400 mb-2">Total Tasks</div>
                        <div className="text-4xl font-bold text-white">{tasks.length}</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900/50 to-green-900/50 backdrop-blur-xl rounded-2xl border border-emerald-500/30 p-6">
                        <div className="text-sm text-emerald-300 mb-2">Running</div>
                        <div className="text-4xl font-bold text-emerald-400">{activeTasksCount}</div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 backdrop-blur-xl rounded-2xl border border-blue-500/30 p-6">
                        <div className="text-sm text-blue-300 mb-2">Completed</div>
                        <div className="text-4xl font-bold text-blue-400">{completedTasks.length}</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6">
                        <div className="text-sm text-purple-300 mb-2">Total Time</div>
                        <div className="text-4xl font-bold text-purple-400">{formatElapsed(totalTime)}</div>
                    </div>
                </div>

                {/* Active/Pending Tasks */}
                <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Active Tasks</h2>

                    {pendingTasks.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">⏱️</div>
                            <div className="text-zinc-400 text-lg mb-2">No active tasks</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 space-y-3 transition-all cursor-pointer"
                                    onClick={() => setSelectedTask(task)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white mb-1">
                                                {task.title}
                                            </div>
                                            {task.description && (
                                                <div className="text-xs text-zinc-400">
                                                    {task.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <div className={`text-2xl font-mono font-bold ${task.enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            {formatElapsed(getElapsedSeconds(task))}
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            {task.enabled ? (
                                                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Running
                                                </span>
                                            ) : (
                                                <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                                                    Paused
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Completed Tasks</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {completedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className="bg-white/5 hover:bg-white/10 border border-emerald-500/30 rounded-lg p-4 space-y-3 opacity-75 cursor-pointer transition-all"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white mb-1 line-through decoration-emerald-500">
                                                {task.title}
                                            </div>
                                            {task.description && (
                                                <div className="text-xs text-zinc-400">
                                                    {task.description}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-emerald-400 text-lg">✓</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <div className="text-2xl font-mono font-bold text-emerald-400">
                                            {formatElapsed(getElapsedSeconds(task))}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            Completed
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Task Detail Modal - Read Only */}
            {selectedTask && (
                <div className="fixed inset-0 bg-gradient-to-br from-gray-950/95 via-gray-900/95 to-gray-950/95 z-50 overflow-y-auto backdrop-blur-sm">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
                        <div className="max-w-7xl mx-auto px-8 py-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-4xl font-bold text-white">
                                            {selectedTask.title}
                                        </h1>
                                        {selectedTask.completed ? (
                                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium border border-emerald-500/20">
                                                Completed
                                            </span>
                                        ) : selectedTask.enabled ? (
                                            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/20">
                                                Running
                                            </span>
                                        ) : (
                                            <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-sm font-medium border border-zinc-700">
                                                Paused
                                            </span>
                                        )}
                                    </div>
                                    {selectedTask.description && (
                                        <p className="text-zinc-400 text-lg">
                                            {selectedTask.description}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-8 py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left Column - Timer & Controls */}
                            <div className="space-y-8">
                                {/* Timer Display */}
                                <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
                                    <div className="text-center">
                                        <div className="text-sm text-zinc-400 mb-4 uppercase tracking-wide">Time Recorded</div>
                                        <div className={`text-8xl font-mono font-bold mb-8 ${selectedTask.enabled ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                            {formatElapsed(getElapsedSeconds(selectedTask))}
                                        </div>
                                    </div>

                                    {/* Progress Bar if target time is set */}
                                    {selectedTask.targetTime && (
                                        <div className="mt-8 pt-8 border-t border-gray-800">
                                            <div className="flex justify-between text-sm text-zinc-400 mb-3">
                                                <span>Progress to Target</span>
                                                <span>{formatElapsed(selectedTask.targetTime)}</span>
                                            </div>
                                            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${getElapsedSeconds(selectedTask) >= selectedTask.targetTime
                                                        ? 'bg-emerald-500'
                                                        : 'bg-purple-500'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min((getElapsedSeconds(selectedTask) / selectedTask.targetTime) * 100, 100)}%`
                                                    }}
                                                />
                                            </div>
                                            <div className="text-center mt-2 text-lg font-bold text-white">
                                                {Math.min(Math.round((getElapsedSeconds(selectedTask) / selectedTask.targetTime) * 100), 100)}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column - Vertical Timeline */}
                            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
                                <h3 className="text-xl font-semibold text-white mb-6">Milestones Log</h3>

                                {/* Vertical Timeline */}
                                <div className="relative mt-8">
                                    {selectedTask.milestones && selectedTask.milestones.length > 0 ? (
                                        <div className="space-y-0">
                                            {selectedTask.milestones.map((milestone, index) => (
                                                <div key={milestone.id} className="relative">
                                                    {/* Vertical Line - connecting to next item */}
                                                    {index < selectedTask.milestones!.length - 1 && (
                                                        <div className="absolute left-4 top-8 w-0.5 h-full bg-gradient-to-b from-white/20 to-transparent" />
                                                    )}

                                                    {/* Timeline Item */}
                                                    <div className="relative flex items-start gap-4 pb-8 group">
                                                        {/* Circle */}
                                                        <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${milestone.completed
                                                            ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/50'
                                                            : 'bg-gray-900 border-white/30'
                                                            }`}
                                                        >
                                                            {milestone.completed && (
                                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 pt-1">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className={`flex-1 text-base font-medium ${milestone.completed
                                                                    ? 'text-zinc-500 line-through'
                                                                    : 'text-white'
                                                                    }`}>
                                                                    {milestone.text}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <div className="text-xs text-zinc-500">
                                                                    Added at {formatElapsed(milestone.createdAtElapsed)}
                                                                </div>
                                                                {milestone.completed && milestone.completedAt && (
                                                                    <>
                                                                        <span className="text-zinc-700">•</span>
                                                                        <div className="text-xs text-emerald-500">
                                                                            ✓ Completed
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="text-4xl mb-4 opacity-50">📝</div>
                                            <div className="text-zinc-400 text-base">No milestones recorded for this task.</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
