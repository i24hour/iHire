'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

interface WorkerStats {
    userId: string;
    totalTasks: number;
    completedTasks: number;
    runningTasks?: number;
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

    // We will render loading and error states inside the main layout to preserve the sidebar

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
                <div className="space-y-8">
                    {/* Header Section */}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Workers Directory</h1>
                        <p className="text-zinc-400">Overview of all active users and their task statistics.</p>
                    </div>

                    {/* Dashboard Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-black border border-zinc-800/50 rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-zinc-400 mb-2">Total Workers</h3>
                            <p className="text-3xl font-semibold text-white">{workers.length}</p>
                        </div>
                    </div>

                    {/* Workers Grid */}
                    <div>
                        <div className="flex flex-col gap-4 max-w-3xl">
                            {loading ? (
                                <div className="flex py-12 items-center justify-center w-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50"></div>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col py-12 items-center justify-center text-white gap-4 w-full bg-black border border-zinc-800 rounded-2xl">
                                    <p className="text-white">Error: {error}</p>
                                    <LiquidButton
                                        onClick={fetchWorkers}
                                        className="px-4 py-2 text-white"
                                        size="default"
                                    >
                                        Retry
                                    </LiquidButton>
                                </div>
                            ) : workers.length === 0 ? (
                                <p className="text-zinc-500">No workers found yet. Tasks need to be created first.</p>
                            ) : (
                                workers.map((worker) => (
                                    <Link href={`/workers/${encodeURIComponent(worker.userId)}`} key={worker.userId}>
                                        <motion.div
                                            whileHover={{ y: -4, scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="bg-black border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-zinc-700 transition-colors cursor-pointer group w-full"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-full bg-white/10 flex shrink-0 items-center justify-center text-white font-bold text-xl uppercase ring-1 ring-white/20 group-hover:bg-white/10 transition-colors">
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

                                            <div className="flex flex-row flex-wrap gap-4 mt-auto">
                                                <div className="bg-zinc-950/50 rounded-xl px-4 py-2 border border-zinc-800/50 flex flex-col justify-center min-w-[100px] flex-1">
                                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">Total Tasks</span>
                                                    <span className="block text-2xl font-bold text-zinc-300 leading-none">
                                                        {worker.totalTasks}
                                                    </span>
                                                </div>
                                                <div className="bg-black rounded-xl px-4 py-2 border border-zinc-800 flex flex-col justify-center min-w-[100px] flex-1">
                                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-0.5">Running</span>
                                                    <span className="block text-2xl font-bold text-white leading-none">
                                                        {worker.runningTasks || 0}
                                                    </span>
                                                </div>
                                                <div className="bg-black rounded-xl px-4 py-2 border border-zinc-800 flex flex-col justify-center min-w-[100px] flex-1">
                                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-0.5">Completed</span>
                                                    <span className="block text-2xl font-bold text-white leading-none">
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
