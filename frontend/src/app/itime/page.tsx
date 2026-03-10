'use client';

import { Sidebar } from '@/components/Sidebar';
import { SignInModal } from '@/components/SignInModal';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

const PerformanceChart = dynamic(
    () => import('@/components/PerformanceChart').then(mod => mod.PerformanceChart),
    { ssr: false, loading: () => <div className="h-[500px] bg-black rounded-2xl border border-white/10 flex items-center justify-center text-zinc-500">Loading chart...</div> }
);
import { useState, useEffect, useCallback, useMemo } from 'react';
import { LiveTimer, LiveTotalTimer } from '@/components/LiveTimer';

interface ITimeTask {
    id: string;
    _id?: string; // MongoDB ID
    title: string;
    description: string;
    startTime: number; // timestamp when task was started
    pausedElapsed: number; // elapsed seconds when paused
    enabled: boolean;
    completed: boolean;
    completedAt?: number; // timestamp when completed
    targetTime?: number; // target time in seconds
    autoResumeAt?: number; // scheduled automatic resume timestamp
    milestones?: Milestone[];
    events?: Array<{
        type: 'start' | 'pause' | 'complete';
        timestamp: number;
    }>;
}

interface Milestone {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: number;
    createdAt: number; // timestamp when milestone was added
    createdAtElapsed: number; // elapsed seconds when milestone was added
}

export default function ITimePage() {
    const { data: session, status } = useSession();
    const [tasks, setTasks] = useState<ITimeTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [selectedTask, setSelectedTask] = useState<ITimeTask | null>(null);
    const [newMilestone, setNewMilestone] = useState('');
    const [targetHours, setTargetHours] = useState('');
    const [targetMinutes, setTargetMinutes] = useState('');
    const [showSignInModal, setShowSignInModal] = useState(false);
    const [showPauseOptions, setShowPauseOptions] = useState<string | null>(null);

    const playAlertSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error("Audio API error", e);
        }
    };

    // Fetch tasks from MongoDB for authenticated users
    const fetchTasks = useCallback(async () => {
        if (status === 'loading') return;

        if (status === 'authenticated') {
            try {
                const response = await fetch('/api/itime');
                if (response.ok) {
                    const data = await response.json();
                    setTasks(data.tasks.map((t: any) => ({
                        ...t,
                        id: t._id,
                    })));
                }
            } catch (error) {
                console.error('Failed to fetch tasks:', error);
            } finally {
                setIsLoading(false);
            }
        } else {
            // Load from localStorage for guest users
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('itime_tasks');
                setTasks(saved ? JSON.parse(saved) : []);
            }
            setIsLoading(false);
        }
    }, [status]);

    // Initial load
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Previous Timer Interval removed - now handled by LiveTimer components

    // Save tasks - MongoDB for authenticated, localStorage for guest
    useEffect(() => {
        if (isLoading) return;

        if (status === 'unauthenticated' && typeof window !== 'undefined') {
            // Guest mode - save to localStorage
            localStorage.setItem('itime_tasks', JSON.stringify(tasks));
        }
    }, [tasks, status, isLoading]);

    const handleAddTask = async () => {
        if (!newTitle.trim()) return;

        // DEBUG: Log authentication status
        console.log('🔐 Auth Status:', { status, session });

        // Check if user is authenticated (block if loading or unauthenticated)
        if (status === 'loading') {
            console.log('⏳ Session loading, please wait...');
            return;
        }

        if (status === 'unauthenticated') {
            console.log('❌ Not authenticated - showing sign in modal');
            setShowSignInModal(true);
            return;
        }

        console.log('✅ Authenticated - adding task');
        const newTask: ITimeTask = {
            id: Date.now().toString(),
            title: newTitle,
            description: newDescription,
            startTime: Date.now(),
            pausedElapsed: 0,
            enabled: true,
            completed: false,
            milestones: [],
            events: [{ type: 'start', timestamp: Date.now() }],
        };

        try {
            // Save to MongoDB
            const response = await fetch('/api/itime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask),
            });

            if (response.ok) {
                const { task } = await response.json();
                setTasks([...tasks, { ...task, id: task._id }]);
                setNewTitle('');
                setNewDescription('');
            } else {
                console.error('Failed to save task');
            }
        } catch (error) {
            console.error('Error saving task:', error);
        }
    };

    const toggleTask = async (id: string, breakMinutes?: number) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const currentElapsed = task.enabled ? getElapsedSeconds(task) : task.pausedElapsed;
        const now = Date.now();
        const updatedTask = {
            ...task,
            enabled: !task.enabled,
            pausedElapsed: currentElapsed,
            startTime: !task.enabled ? now : 0,
            autoResumeAt: (!task.enabled) ? undefined : (breakMinutes ? now + (breakMinutes * 60000) : undefined),
            events: [...(task.events || []), {
                type: (!task.enabled ? 'start' : 'pause') as 'start' | 'pause' | 'complete',
                timestamp: now
            }]
        };

        setTasks((prev) => prev.map(t => t.id === id ? updatedTask : t));

        if (status === 'authenticated' && task._id) {
            try {
                await fetch('/api/itime', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ _id: task._id, ...updatedTask }),
                });
            } catch (error) {
                console.error('Error updating task:', error);
            }
        }
    };

    const resumeTaskFromBreak = useCallback(async (id: string) => {
        playAlertSound();
        setTasks(prev => {
            const task = prev.find(t => t.id === id);
            if (!task || task.enabled) return prev;

            const now = Date.now();
            const updatedTask = {
                ...task,
                enabled: true,
                autoResumeAt: undefined,
                startTime: now,
                events: [...(task.events || []), {
                    type: 'start' as const,
                    timestamp: now
                }]
            };

            // Fire and forget API call
            if (status === 'authenticated' && task._id) {
                fetch('/api/itime', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ _id: task._id, ...updatedTask }),
                }).catch(e => console.error(e));
            }

            return prev.map(t => t.id === id ? updatedTask : t);
        });
    }, [status]);

    useEffect(() => {
        const activeBreaks = tasks.filter(t => !t.enabled && t.autoResumeAt);
        if (activeBreaks.length === 0) return;

        const interval = setInterval(() => {
            const now = Date.now();
            activeBreaks.forEach(task => {
                if (task.autoResumeAt && now >= task.autoResumeAt) {
                    resumeTaskFromBreak(task.id);
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [tasks, resumeTaskFromBreak]);

    const deleteTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        setTasks((prev) => prev.filter((t) => t.id !== id));

        if (status === 'authenticated' && task?._id) {
            try {
                await fetch(`/api/itime?id=${task._id}`, {
                    method: 'DELETE',
                });
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const completeTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const finalElapsed = getElapsedSeconds(task);
        const updatedTask = {
            ...task,
            completed: true,
            completedAt: Date.now(),
            enabled: false,
            pausedElapsed: finalElapsed,
            startTime: 0,
            events: [...(task.events || []), { type: 'complete', timestamp: Date.now() } as const]
        };

        setTasks((prev) => prev.map(t => t.id === id ? updatedTask : t));

        if (status === 'authenticated' && task._id) {
            try {
                await fetch('/api/itime', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ _id: task._id, ...updatedTask }),
                });
            } catch (error) {
                console.error('Error completing task:', error);
            }
        }
    };

    const addMilestone = (taskId: string) => {
        if (!newMilestone.trim()) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== taskId) return task;
                const milestone: Milestone = {
                    id: Date.now().toString(),
                    text: newMilestone,
                    completed: false,
                    createdAt: Date.now(),
                    createdAtElapsed: getElapsedSeconds(task),
                };
                return {
                    ...task,
                    milestones: [...(task.milestones || []), milestone],
                };
            })
        );
        setNewMilestone('');
    };

    const toggleMilestone = (taskId: string, milestoneId: string) => {
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== taskId) return task;
                return {
                    ...task,
                    milestones: task.milestones?.map((m) =>
                        m.id === milestoneId
                            ? { ...m, completed: !m.completed, completedAt: !m.completed ? Date.now() : undefined }
                            : m
                    ),
                };
            })
        );
    };

    const deleteMilestone = (taskId: string, milestoneId: string) => {
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== taskId) return task;
                return {
                    ...task,
                    milestones: task.milestones?.filter((m) => m.id !== milestoneId),
                };
            })
        );
    };

    const setTargetTime = (taskId: string) => {
        const hours = parseInt(targetHours) || 0;
        const minutes = parseInt(targetMinutes) || 0;
        const totalSeconds = (hours * 3600) + (minutes * 60);

        if (totalSeconds <= 0) return;

        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, targetTime: totalSeconds } : task
            )
        );
        setTargetHours('');
        setTargetMinutes('');
    };

    const getElapsedSeconds = useCallback((task: ITimeTask, now: number = Date.now()): number => {
        if (task.completed) {
            return task.pausedElapsed;
        }

        if (!task.events || task.events.length === 0) {
            // Legacy fallback
            if (!task.enabled) {
                return task.pausedElapsed;
            }
            const runningSince = (now - task.startTime) / 1000;
            return Math.floor(task.pausedElapsed + runningSince);
        }

        let totalMs = 0;
        let isRunning = false;
        let lastStartTime = 0;

        for (const ev of task.events) {
            if (ev.type === 'start') {
                if (!isRunning) {
                    isRunning = true;
                    lastStartTime = ev.timestamp;
                }
            } else if (ev.type === 'pause' || ev.type === 'complete') {
                if (isRunning) {
                    totalMs += (ev.timestamp - lastStartTime);
                    isRunning = false;
                }
            }
        }

        if (isRunning && !task.completed) {
            totalMs += (now - lastStartTime);
        }

        if (task.events.length > 0 && task.events[0].type !== 'start') {
            totalMs += (task.pausedElapsed * 1000);
        }

        return Math.floor(totalMs / 1000);
    }, []);

    const formatElapsed = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const totalTime = useMemo(() => tasks.reduce((sum, task) => !task.completed ? sum + getElapsedSeconds(task) : sum, 0), [tasks, getElapsedSeconds]);
    const activeTasks = useMemo(() => tasks.filter((task) => task.enabled && !task.completed).length, [tasks]);
    const pendingTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);
    const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-4">
                        <div className="order-2 md:order-1">
                            <h1 className="text-3xl font-bold text-white mb-2">
                                iTime Tracker
                            </h1>
                            <p className="text-gray-400">
                                Track your tasks and manage your time effectively
                            </p>
                        </div>

                        <div className="order-1 md:order-2 self-start md:self-auto w-full md:w-auto flex justify-end md:block">

                            {/* User Info / Sign In Button */}
                            {status === 'loading' ? (
                                <div className="animate-pulse bg-black h-10 w-32 rounded-lg"></div>
                            ) : session ? (
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-white">{session.user?.name || session.user?.email}</div>
                                        <div className="text-xs text-zinc-500">{session.user?.email}</div>
                                    </div>
                                    {session.user?.image && (
                                        <Image
                                            src={session.user.image}
                                            alt="Profile"
                                            width={40}
                                            height={40}
                                            className="rounded-full border-2 border-white/10"
                                        />
                                    )}
                                    <LiquidButton
                                        onClick={() => signOut()}
                                        className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                        variant="ghost"
                                    >
                                        Sign Out
                                    </LiquidButton>
                                </div>
                            ) : (
                                <LiquidButton
                                    onClick={() => setShowSignInModal(true)}
                                    className="px-6 py-2 text-sm font-bold"
                                >
                                    Sign In
                                </LiquidButton>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <div className="bg-black  rounded-2xl border border-white/10 p-4 md:p-6">
                        <div className="text-sm text-gray-400 mb-2">Total Tasks</div>
                        <div className="text-2xl md:text-4xl font-bold text-white">{tasks.length}</div>
                    </div>

                    <div className="bg-black  rounded-2xl border border-white/20 p-4 md:p-6">
                        <div className="text-sm text-zinc-300 mb-2">Running</div>
                        <div className="text-2xl md:text-4xl font-bold text-white">{activeTasks}</div>
                    </div>

                    <div className="bg-black  rounded-2xl border border-white/20 p-4 md:p-6">
                        <div className="text-sm text-zinc-300 mb-2">Completed</div>
                        <div className="text-2xl md:text-4xl font-bold text-white">{completedTasks.length}</div>
                    </div>

                    <div className="bg-black  rounded-2xl border border-white/20 p-4 md:p-6">
                        <div className="text-sm text-zinc-300 mb-2">Total Time</div>
                        <div className="text-2xl md:text-4xl font-bold text-white">
                            <LiveTotalTimer tasks={tasks} getElapsedSeconds={getElapsedSeconds} formatElapsed={formatElapsed} />
                        </div>
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="mb-8 w-full max-w-none">
                    <PerformanceChart tasks={tasks} />
                </div>

                {/* Add Task Form */}
                <div className="bg-black  rounded-2xl border border-white/10 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Add New Task</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Task title..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                        />
                        <input
                            type="text"
                            placeholder="Description..."
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                        />
                    </div>
                    <LiquidButton
                        onClick={handleAddTask}
                        className="w-full md:w-auto px-6 py-3 text-sm font-bold text-white content-center"
                    >
                        + Add Task
                    </LiquidButton>
                </div>

                {/* Pending Tasks */}
                <div className="bg-black  rounded-2xl border border-white/10 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Active Tasks</h2>

                    {pendingTasks.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">⏱️</div>
                            <div className="text-zinc-400 text-lg mb-2">No active tasks</div>
                            <div className="text-zinc-600 text-sm">Add your first task above to get started</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 space-y-3 transition-all group cursor-pointer"
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
                                        <LiquidButton
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTask(task.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </LiquidButton>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <div className={`text-2xl font-mono font-bold ${task.enabled ? 'text-white' : 'text-zinc-500'}`}>
                                            <LiveTimer task={task} getElapsedSeconds={getElapsedSeconds} formatElapsed={formatElapsed} />
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {task.enabled ? (
                                                <div className="relative">
                                                    {showPauseOptions === task.id ? (
                                                        <div className="absolute bottom-full right-0 mb-2 p-2 bg-zinc-900 border border-white/20 rounded-lg shadow-xl z-20 w-32 animate-in fade-in slide-in-from-bottom-2">
                                                            <div className="flex justify-between items-center mb-2 px-1">
                                                                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Pause Timer</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setShowPauseOptions(null); }} className="text-zinc-500 hover:text-white">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                <LiquidButton size="sm" onClick={(e) => { e.stopPropagation(); toggleTask(task.id, 5); setShowPauseOptions(null); }} className="px-1 text-white text-xs w-full h-7 min-h-0 bg-white/5 hover:bg-white/10">5m</LiquidButton>
                                                                <LiquidButton size="sm" onClick={(e) => { e.stopPropagation(); toggleTask(task.id, 15); setShowPauseOptions(null); }} className="px-1 text-white text-xs w-full h-7 min-h-0 bg-white/5 hover:bg-white/10">15m</LiquidButton>
                                                                <LiquidButton size="sm" onClick={(e) => { e.stopPropagation(); toggleTask(task.id, 30); setShowPauseOptions(null); }} className="px-1 text-white text-xs w-full h-7 min-h-0 bg-white/5 hover:bg-white/10">30m</LiquidButton>
                                                                <LiquidButton size="sm" onClick={(e) => { e.stopPropagation(); toggleTask(task.id, 60); setShowPauseOptions(null); }} className="px-1 text-white text-xs w-full h-7 min-h-0 bg-white/5 hover:bg-white/10">1hr</LiquidButton>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    <LiquidButton
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowPauseOptions(task.id);
                                                        }}
                                                        className="text-zinc-400 hover:text-white transition-colors"
                                                        title="Pause Timer"
                                                    >
                                                        ⏸
                                                    </LiquidButton>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-1">
                                                    <LiquidButton
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleTask(task.id);
                                                            setShowPauseOptions(null);
                                                        }}
                                                        className="text-white transition-colors"
                                                        title="Resume Timer"
                                                    >
                                                        ▶
                                                    </LiquidButton>
                                                    {task.autoResumeAt && (
                                                        <span className="text-[10px] text-zinc-500 -mt-1 block">
                                                            {new Date(task.autoResumeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <LiquidButton
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    completeTask(task.id);
                                                }}
                                                className="text-white ml-2"
                                                title="Mark as complete"
                                            >
                                                ✓
                                            </LiquidButton>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                    <div className="bg-black  rounded-2xl border border-white/10 p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Completed Tasks</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {completedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="bg-white/5 border border-white/20 rounded-lg p-4 space-y-3 opacity-75"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white mb-1 line-through decoration-white/50">
                                                {task.title}
                                            </div>
                                            {task.description && (
                                                <div className="text-xs text-zinc-400">
                                                    {task.description}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-white text-lg">✓</span>
                                            <button
                                                onClick={() => deleteTask(task.id)}
                                                className="text-zinc-500 hover:text-white transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <div className="text-2xl font-mono font-bold text-white">
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

            {/* Task Detail Modal - Full Screen */}
            {selectedTask && (
                <div
                    className="fixed inset-0 bg-black z-[80] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-black  border-b border-white/10">
                        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 break-words">
                                        {selectedTask.title}
                                    </h1>
                                    {selectedTask.description && (
                                        <p className="text-zinc-400 text-sm md:text-lg">
                                            {selectedTask.description}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="text-zinc-500 hover:text-white transition-colors p-2"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
                            {/* Left Column - Timer & Controls */}
                            <div className="space-y-8">
                                {/* Timer Display */}
                                <div className="bg-black  rounded-2xl border border-white/10 p-4 md:p-8 overflow-hidden">
                                    <div className="text-center">
                                        <div className="text-xs md:text-sm text-zinc-400 mb-2 md:mb-4 uppercase tracking-wide">Current Time</div>
                                        <div className={`text-6xl sm:text-7xl md:text-8xl font-mono font-bold mb-4 md:mb-8 tracking-tighter sm:tracking-normal ${selectedTask.enabled ? 'text-white' : 'text-zinc-500'}`}>
                                            <LiveTimer task={selectedTask} getElapsedSeconds={getElapsedSeconds} formatElapsed={formatElapsed} />
                                        </div>
                                        <div className="flex gap-4 justify-center">
                                            {selectedTask.enabled ? (
                                                showPauseOptions === selectedTask.id ? (
                                                    <div className="flex gap-2">
                                                        <LiquidButton onClick={() => { toggleTask(selectedTask.id, 5); setShowPauseOptions(null); }} className="px-3 text-white">5m</LiquidButton>
                                                        <LiquidButton onClick={() => { toggleTask(selectedTask.id, 15); setShowPauseOptions(null); }} className="px-3 text-white">15m</LiquidButton>
                                                        <LiquidButton onClick={() => { toggleTask(selectedTask.id, 30); setShowPauseOptions(null); }} className="px-3 text-white">30m</LiquidButton>
                                                        <LiquidButton onClick={() => { toggleTask(selectedTask.id, 60); setShowPauseOptions(null); }} className="px-3 text-white">1hr</LiquidButton>
                                                    </div>
                                                ) : (
                                                    <LiquidButton
                                                        onClick={() => setShowPauseOptions(selectedTask.id)}
                                                        className="w-40 text-base font-bold transition-all text-white"
                                                    >
                                                        ⏸ Pause Option
                                                    </LiquidButton>
                                                )
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <LiquidButton
                                                        onClick={() => { toggleTask(selectedTask.id); setShowPauseOptions(null); }}
                                                        className="w-40 text-base font-bold transition-all text-zinc-300"
                                                    >
                                                        ▶ Resume
                                                    </LiquidButton>
                                                    {selectedTask.autoResumeAt && (
                                                        <span className="text-xs text-zinc-500 absolute -bottom-5">
                                                            Resumes at {new Date(selectedTask.autoResumeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <LiquidButton
                                                onClick={() => {
                                                    completeTask(selectedTask.id);
                                                    setSelectedTask(null);
                                                }}
                                                className="w-40 text-base font-bold text-white"
                                            >
                                                ✓ Complete
                                            </LiquidButton>
                                        </div>
                                    </div>

                                    {/* Progress Bar if target time is set */}
                                    {selectedTask.targetTime && (
                                        <div className="mt-8 pt-8 border-t border-white/10">
                                            <div className="flex justify-between text-sm text-zinc-400 mb-3">
                                                <span>Progress to Target</span>
                                                <span>{formatElapsed(selectedTask.targetTime)}</span>
                                            </div>
                                            <div className="w-full bg-black rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${getElapsedSeconds(selectedTask) >= selectedTask.targetTime
                                                        ? 'bg-white text-black'
                                                        : 'bg-white text-black'
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

                                {/* Target Time */}
                                <div className="bg-black  rounded-2xl border border-white/10 p-8">
                                    <h3 className="text-xl font-semibold text-white mb-4">Set Target Time</h3>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs text-zinc-400 mb-2">Hours</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={targetHours}
                                                onChange={(e) => setTargetHours(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-lg text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all text-center"
                                                min="0"
                                            />
                                        </div>
                                        <div className="flex items-end pb-3 text-2xl text-zinc-600">:</div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-zinc-400 mb-2">Minutes</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={targetMinutes}
                                                onChange={(e) => setTargetMinutes(e.target.value)}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-lg text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all text-center"
                                                min="0"
                                                max="59"
                                            />
                                        </div>
                                        <LiquidButton
                                            onClick={() => setTargetTime(selectedTask.id)}
                                            className="px-6 py-3 text-sm font-bold self-end text-white"
                                        >
                                            Set
                                        </LiquidButton>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Vertical Timeline */}
                            <div className="bg-black  rounded-2xl border border-white/10 p-8">
                                <h3 className="text-xl font-semibold text-white mb-6">Milestones</h3>

                                {/* Add Milestone */}
                                <div className="flex gap-3 mb-8">
                                    <input
                                        type="text"
                                        placeholder="Add a milestone..."
                                        value={newMilestone}
                                        onChange={(e) => setNewMilestone(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addMilestone(selectedTask.id)}
                                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                                    />
                                    <LiquidButton
                                        onClick={() => addMilestone(selectedTask.id)}
                                        className="px-6 py-3 text-sm font-bold text-white"
                                    >
                                        Add
                                    </LiquidButton>
                                </div>

                                {/* Vertical Timeline */}
                                <div className="relative">
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
                                                        <button
                                                            onClick={() => toggleMilestone(selectedTask.id, milestone.id)}
                                                            className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${milestone.completed
                                                                ? 'bg-white text-black border-white/50 shadow-lg shadow-white/20'
                                                                : 'bg-black border-white/30 hover:border-white/50 hover:bg-white/5'
                                                                }`}
                                                        >
                                                            {milestone.completed && (
                                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </button>

                                                        {/* Content */}
                                                        <div className="flex-1 pt-1">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className={`flex-1 text-base font-medium ${milestone.completed
                                                                    ? 'text-zinc-500 line-through'
                                                                    : 'text-white'
                                                                    }`}>
                                                                    {milestone.text}
                                                                </div>
                                                                <button
                                                                    onClick={() => deleteMilestone(selectedTask.id, milestone.id)}
                                                                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white p-1 -mt-1"
                                                                    title="Delete milestone"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <div className="text-xs text-zinc-500">
                                                                    Added at {formatElapsed(milestone.createdAtElapsed)}
                                                                </div>
                                                                {milestone.completed && milestone.completedAt && (
                                                                    <>
                                                                        <span className="text-zinc-700">•</span>
                                                                        <div className="text-xs text-white">
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
                                            <div className="text-6xl mb-4">📝</div>
                                            <div className="text-zinc-400 text-base mb-2">No milestones yet</div>
                                            <div className="text-zinc-600 text-sm">Add milestones to track your progress</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Sign In Modal */}
            <SignInModal
                isOpen={showSignInModal}
                onClose={() => setShowSignInModal(false)}
            />
        </div >
    );
}
