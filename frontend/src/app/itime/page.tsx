'use client';

import { Sidebar } from '@/components/Sidebar';
import { useState, useEffect } from 'react';

interface ITimeTask {
    id: string;
    title: string;
    description: string;
    elapsedSeconds: number;
    enabled: boolean;
}

export default function ITimePage() {
    const [tasks, setTasks] = useState<ITimeTask[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('itime_tasks');
        return saved ? JSON.parse(saved) : [];
    });
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');

    // Timer interval
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks((prev) =>
                prev.map((task) =>
                    task.enabled
                        ? { ...task, elapsedSeconds: task.elapsedSeconds + 1 }
                        : task
                )
            );
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
            elapsedSeconds: 0,
            enabled: true,
        };
        setTasks([...tasks, newTask]);
        setNewTitle('');
        setNewDescription('');
    };

    const toggleTask = (id: string) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === id ? { ...task, enabled: !task.enabled } : task
            )
        );
    };

    const deleteTask = (id: string) => {
        setTasks((prev) => prev.filter((task) => task.id !== id));
    };

    const formatElapsed = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const totalTime = tasks.reduce((sum, task) => sum + task.elapsedSeconds, 0);
    const activeTasks = tasks.filter((task) => task.enabled).length;

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
                        <div className="text-sm text-gray-400 mb-2">Total Tasks</div>
                        <div className="text-4xl font-bold text-white">{tasks.length}</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900/50 to-green-900/50 backdrop-blur-xl rounded-2xl border border-emerald-500/30 p-6">
                        <div className="text-sm text-emerald-300 mb-2">Active Tasks</div>
                        <div className="text-4xl font-bold text-emerald-400">{activeTasks}</div>
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

                {/* Tasks List */}
                <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Your Tasks</h2>
                    
                    {tasks.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">⏱️</div>
                            <div className="text-zinc-400 text-lg mb-2">No tasks yet</div>
                            <div className="text-zinc-600 text-sm">Add your first task above to get started</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 space-y-3 transition-all group"
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
                                            onClick={() => deleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <div className={`text-2xl font-mono font-bold ${task.enabled ? 'text-white' : 'text-zinc-500'}`}>
                                            {formatElapsed(task.elapsedSeconds)}
                                        </div>
                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                                                task.enabled
                                                    ? 'bg-white text-black hover:bg-white/90'
                                                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                            }`}
                                        >
                                            {task.enabled ? '⏸ Pause' : '▶ Start'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
