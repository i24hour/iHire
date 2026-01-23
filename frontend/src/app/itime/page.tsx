'use client';

import { Sidebar } from '@/components/Sidebar';
import { useState, useEffect } from 'react';

interface ITimeTask {
    id: string;
    title: string;
    description: string;
    startTime: number; // timestamp when task was started
    pausedElapsed: number; // elapsed seconds when paused
    enabled: boolean;
    completed: boolean;
    completedAt?: number; // timestamp when completed
    targetTime?: number; // target time in seconds
    milestones?: Milestone[];
}

interface Milestone {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: number;
}

export default function ITimePage() {
    const [tasks, setTasks] = useState<ITimeTask[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('itime_tasks');
        return saved ? JSON.parse(saved) : [];
    });
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [selectedTask, setSelectedTask] = useState<ITimeTask | null>(null);
    const [newMilestone, setNewMilestone] = useState('');
    const [targetHours, setTargetHours] = useState('');
    const [targetMinutes, setTargetMinutes] = useState('');

    // Timer interval - update current time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Save to localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('itime_tasks', JSON.stringify(tasks));
    }, [tasks]);

    const handleAddTask = () => {
        if (!newTitle.trim()) return;
        const newTask: ITimeTask = {
            id: Date.now().toString(),
            title: newTitle,
            description: newDescription,
            startTime: Date.now(), // current timestamp
            pausedElapsed: 0,
            enabled: true,
            completed: false,
            milestones: [],
        };
        setTasks([...tasks, newTask]);
        setNewTitle('');
        setNewDescription('');
    };

    const toggleTask = (id: string) => {
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== id) return task;
                
                if (task.enabled) {
                    // Pausing: save current elapsed time
                    const currentElapsed = getElapsedSeconds(task);
                    return { 
                        ...task, 
                        enabled: false,
                        pausedElapsed: currentElapsed,
                        startTime: 0
                    };
                } else {
                    // Starting: set new start time
                    return { 
                        ...task, 
                        enabled: true,
                        startTime: Date.now()
                    };
                }
            })
        );
    };

    const deleteTask = (id: string) => {
        setTasks((prev) => prev.filter((task) => task.id !== id));
    };

    const completeTask = (id: string) => {
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== id) return task;
                
                // Save final elapsed time when completing
                const finalElapsed = getElapsedSeconds(task);
                return {
                    ...task,
                    completed: true,
                    completedAt: Date.now(),
                    enabled: false,
                    pausedElapsed: finalElapsed,
                    startTime: 0
                };
            })
        );
    };

    const addMilestone = (taskId: string) => {
        if (!newMilestone.trim()) return;
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== taskId) return task;
                const milestone: Milestone = {
                    id: Date.now().toString(),
                    text: newMilestone,
                    completed: false,
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

    const getElapsedSeconds = (task: ITimeTask): number => {
        if (!task.enabled) {
            return task.pausedElapsed;
        }
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
    const activeTasks = tasks.filter((task) => task.enabled && !task.completed).length;
    const pendingTasks = tasks.filter((task) => !task.completed);
    const completedTasks = tasks.filter((task) => task.completed);

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <Sidebar />

            <main className="flex-1 p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        iTime Tracker
                    </h1>
                    <p className="text-gray-400">
                        Track your tasks and manage your time effectively
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
                        <div className="text-sm text-gray-400 mb-2">Total Tasks</div>
                        <div className="text-4xl font-bold text-white">{tasks.length}</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900/50 to-green-900/50 backdrop-blur-xl rounded-2xl border border-emerald-500/30 p-6">
                        <div className="text-sm text-emerald-300 mb-2">Running</div>
                        <div className="text-4xl font-bold text-emerald-400">{activeTasks}</div>
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

                {/* Add Task Form */}
                <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 mb-8">
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
                    <button
                        onClick={handleAddTask}
                        className="w-full md:w-auto px-6 py-3 bg-white hover:bg-white/90 text-black text-sm font-medium rounded-lg transition-all"
                    >
                        + Add Task
                    </button>
                </div>

                {/* Pending Tasks */}
                <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 mb-8">
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
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTask(task.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <div className={`text-2xl font-mono font-bold ${task.enabled ? 'text-white' : 'text-zinc-500'}`}>
                                            {formatElapsed(getElapsedSeconds(task))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTask(task.id);
                                                }}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                                    task.enabled
                                                        ? 'bg-white text-black hover:bg-white/90'
                                                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                                }`}
                                            >
                                                {task.enabled ? '⏸' : '▶'}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    completeTask(task.id);
                                                }}
                                                className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition-all"
                                                title="Mark as complete"
                                            >
                                                ✓
                                            </button>
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
                                    className="bg-white/5 border border-emerald-500/30 rounded-lg p-4 space-y-3 opacity-75"
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
                                            <button
                                                onClick={() => deleteTask(task.id)}
                                                className="text-zinc-500 hover:text-red-400 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
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

            {/* Task Detail Modal - Full Screen */}
            {selectedTask && (
                <div 
                    className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 z-50 overflow-y-auto"
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
                        <div className="max-w-7xl mx-auto px-8 py-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h1 className="text-4xl font-bold text-white mb-2">
                                        {selectedTask.title}
                                    </h1>
                                    {selectedTask.description && (
                                        <p className="text-zinc-400 text-lg">
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

                    <div className="max-w-7xl mx-auto px-8 py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left Column - Timer & Controls */}
                            <div className="space-y-8">
                                {/* Timer Display */}
                                <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
                                    <div className="text-center">
                                        <div className="text-sm text-zinc-400 mb-4 uppercase tracking-wide">Current Time</div>
                                        <div className={`text-8xl font-mono font-bold mb-8 ${selectedTask.enabled ? 'text-white' : 'text-zinc-500'}`}>
                                            {formatElapsed(getElapsedSeconds(selectedTask))}
                                        </div>
                                        <div className="flex gap-4 justify-center">
                                            <button
                                                onClick={() => toggleTask(selectedTask.id)}
                                                className={`px-8 py-4 rounded-xl text-base font-medium transition-all ${
                                                    selectedTask.enabled
                                                        ? 'bg-white text-black hover:bg-white/90'
                                                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                                }`}
                                            >
                                                {selectedTask.enabled ? '⏸ Pause' : '▶ Start'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    completeTask(selectedTask.id);
                                                    setSelectedTask(null);
                                                }}
                                                className="px-8 py-4 rounded-xl text-base font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                                            >
                                                ✓ Complete
                                            </button>
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
                                                    className={`h-full transition-all ${
                                                        getElapsedSeconds(selectedTask) >= selectedTask.targetTime
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

                                {/* Target Time */}
                                <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
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
                                        <button
                                            onClick={() => setTargetTime(selectedTask.id)}
                                            className="px-6 py-3 bg-white hover:bg-white/90 text-black text-sm font-medium rounded-lg transition-all self-end"
                                        >
                                            Set
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Vertical Timeline */}
                            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
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
                                    <button
                                        onClick={() => addMilestone(selectedTask.id)}
                                        className="px-6 py-3 bg-white hover:bg-white/90 text-black text-sm font-medium rounded-lg transition-all"
                                    >
                                        Add
                                    </button>
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
                                                    <div className="relative flex items-start gap-4 pb-8">
                                                        {/* Circle */}
                                                        <button
                                                            onClick={() => toggleMilestone(selectedTask.id, milestone.id)}
                                                            className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                                                                milestone.completed
                                                                    ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/50'
                                                                    : 'bg-gray-900 border-white/30 hover:border-white/50 hover:bg-white/5'
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
                                                            <div className={`text-base font-medium ${
                                                                milestone.completed 
                                                                    ? 'text-zinc-500 line-through' 
                                                                    : 'text-white'
                                                            }`}>
                                                                {milestone.text}
                                                            </div>
                                                            {milestone.completed && milestone.completedAt && (
                                                                <div className="text-xs text-emerald-500 mt-1">
                                                                    ✓ Completed
                                                                </div>
                                                            )}
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
            )}
        </div>
    );
}
