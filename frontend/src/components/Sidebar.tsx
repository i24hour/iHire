'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

interface ITimeTask {
    id: string;
    title: string;
    description: string;
    elapsedSeconds: number;
    enabled: boolean;
}

function ITimeTrackerSidebar() {
    const [tasks, setTasks] = useState<ITimeTask[]>(() => {
        // Initialize from localStorage
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

    const formatElapsed = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-3">
            {/* Add Task Form - Compact */}
            <div className="space-y-2">
                <input
                    type="text"
                    placeholder="Task title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-2 py-1.5 bg-black border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
                <input
                    type="text"
                    placeholder="Description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-2 py-1.5 bg-black border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
                <button
                    onClick={handleAddTask}
                    className="w-full px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                >
                    Add Task
                </button>
            </div>

            {/* Task List - Compact */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="text-center py-4 text-zinc-600 text-xs">
                        No tasks yet
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className="bg-black border border-zinc-800 rounded p-2 space-y-1"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-zinc-200 truncate">
                                        {task.title}
                                    </div>
                                    {task.description && (
                                        <div className="text-[10px] text-zinc-500 truncate">
                                            {task.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-mono text-emerald-400">
                                    {formatElapsed(task.elapsedSeconds)}
                                </div>
                                <button
                                    onClick={() => toggleTask(task.id)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                        task.enabled
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                                    }`}
                                >
                                    {task.enabled ? '⏸' : '▶'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

const navItems = [
    { href: '/', label: 'Overview', icon: '📊' },
    { href: '/dashboard', label: 'Candidates', icon: '👥' },
];

export function Sidebar() {
    const pathname = usePathname();
    const [campaigns, setCampaigns] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCampaigns() {
            try {
                const res = await fetch('/api/campaigns');
                const data = await res.json();
                if (data.campaigns) {
                    setCampaigns(data.campaigns);
                }
            } catch (error) {
                console.error('Failed to fetch campaigns:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchCampaigns();
    }, []);

    return (
        <aside className="w-64 bg-black border-r border-zinc-800 min-h-screen p-6 flex flex-col">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-3">
                <div className="animate-spin-slow rounded-full h-7 w-7 border-t-2 border-b-2 border-white"></div>
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight">
                        iHire
                    </h1>
                    <p className="text-xs text-zinc-500">Multi-Agent Analysis</p>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="space-y-1 mb-8">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                whileHover={{ x: 2 }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${isActive
                                    ? 'bg-zinc-900 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                                    }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                <span className="font-medium text-sm">{item.label}</span>
                            </motion.div>
                        </Link>
                    );
                })}
            </nav>

            {/* Campaigns / Jobs */}
            <div className="mb-4">
                <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide px-3">Active Jobs</h3>
                <div className="space-y-1">
                    {loading ? (
                        <div className="px-3 text-zinc-600 text-sm">Loading...</div>
                    ) : campaigns.length === 0 ? (
                        <div className="px-3 text-zinc-600 text-sm">No active jobs</div>
                    ) : (
                        campaigns.map((campaign) => {
                            // Check if active based on URL param
                            // Note: This is client-side, so we can check window.location or useSearchParams
                            // But Sidebar is a client component, so useSearchParams is better
                            // However, for simplicity in this edit, let's just use Link
                            return (
                                <Link key={campaign} href={`/dashboard?campaign=${encodeURIComponent(campaign)}`}>
                                    <motion.div
                                        whileHover={{ x: 2 }}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200`}
                                    >
                                        <span className="text-xs">💼</span>
                                        <span className="font-medium text-sm truncate">{campaign}</span>
                                    </motion.div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* iTime Tracker */}
            <div className="mb-4 mt-6">
                <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide px-3">iTime</h3>
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-3">
                    <ITimeTrackerSidebar />
                </div>
            </div>

            {/* Stats Summary */}
            <div className="mt-auto p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">Quick Stats</h3>
                <div className="space-y-2.5">
                    <div className="flex justify-between">
                        <span className="text-zinc-500 text-sm">Total Candidates</span>
                        <span className="text-zinc-300 font-medium text-sm">--</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500 text-sm">Strong Yes</span>
                        <span className="text-emerald-500 font-medium text-sm">--</span>
                    </div>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="mt-6 pt-6 border-t border-zinc-900">
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-500 text-xs">System Active</span>
                </div>
            </div>
        </aside>
    );
}
