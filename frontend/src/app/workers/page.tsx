'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface WorkerStats {
    userId: string;
    totalTasks: number;
    completedTasks: number;
    lastActive: string;
}

export default function WorkersPage() {
    const [workers, setWorkers] = useState<WorkerStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            const response = await fetch('/api/workers');
            if (!response.ok) throw new Error('Failed to fetch workers');
            const data = await response.json();
            setWorkers(data.workers || []);
        } catch (err: any) {
            console.error('Error fetching workers:', err);
            setError(err.message || 'Error fetching data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
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
                <button
                    onClick={fetchWorkers}
                    className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-8 ml-0 md:ml-64">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Workers Directory</h1>
                    <p className="text-zinc-400">Overview of all active users and their task statistics.</p>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Total Workers</h3>
                        <p className="text-3xl font-semibold text-white">{workers.length}</p>
                    </div>
                </div>

                {/* Workers Grid */}
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workers.length === 0 ? (
                            <p className="text-zinc-500">No workers found yet. Tasks need to be created first.</p>
                        ) : (
                            workers.map((worker) => (
                                <Link href={`/workers/${encodeURIComponent(worker.userId)}`} key={worker.userId}>
                                    <motion.div
                                        whileHover={{ y: -4, scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col hover:border-zinc-700 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xl uppercase ring-1 ring-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                                {worker.userId.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-medium text-zinc-200 truncate" title={worker.userId}>
                                                    {worker.userId.split('@')[0]}
                                                </h3>
                                                <p className="text-xs text-zinc-500 truncate" title={worker.userId}>
                                                    {worker.userId}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-auto">
                                            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50">
                                                <span className="block text-xs font-medium text-zinc-500 mb-1">Total Tasks</span>
                                                <span className="block text-xl font-semibold text-zinc-300">
                                                    {worker.totalTasks}
                                                </span>
                                            </div>
                                            <div className="bg-emerald-950/20 rounded-xl p-3 border border-emerald-900/30">
                                                <span className="block text-xs font-medium text-emerald-500/70 mb-1">Completed</span>
                                                <span className="block text-xl font-semibold text-emerald-400">
                                                    {worker.completedTasks}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
