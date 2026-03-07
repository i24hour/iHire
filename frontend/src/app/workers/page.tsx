'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';

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
        <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full ml-0 md:ml-64">
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
                        <div className="flex flex-col gap-4">
                            {workers.length === 0 ? (
                                <p className="text-zinc-500">No workers found yet. Tasks need to be created first.</p>
                            ) : (
                                workers.map((worker) => (
                                    <Link href={`/workers/${encodeURIComponent(worker.userId)}`} key={worker.userId}>
                                        <motion.div
                                            whileHover={{ y: -4, scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-zinc-700 transition-colors cursor-pointer group w-full"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex shrink-0 items-center justify-center text-emerald-500 font-bold text-xl uppercase ring-1 ring-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                                    {worker.userId.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-[150px] overflow-hidden">
                                                    <h3 className="text-lg font-medium text-zinc-200 truncate" title={worker.userId}>
                                                        {worker.userId.split('@')[0]}
                                                    </h3>
                                                    <p className="text-xs text-zinc-500 truncate" title={worker.userId}>
                                                        {worker.userId}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-row gap-4 mt-auto">
                                                <div className="bg-zinc-950/50 rounded-xl px-4 py-2 border border-zinc-800/50 flex flex-col justify-center min-w-[120px]">
                                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">Total Tasks</span>
                                                    <span className="block text-2xl font-bold text-zinc-300 leading-none">
                                                        {worker.totalTasks}
                                                    </span>
                                                </div>
                                                <div className="bg-emerald-950/20 rounded-xl px-4 py-2 border border-emerald-900/30 flex flex-col justify-center min-w-[120px]">
                                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-emerald-500/70 mb-0.5">Completed</span>
                                                    <span className="block text-2xl font-bold text-emerald-400 leading-none">
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
            </main>
        </div>
    );
}
