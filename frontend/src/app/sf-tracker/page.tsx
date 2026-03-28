'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

interface SFTrackerItem {
    _id: string;
    target: string;
    successCondition: string;
    status: 'Pending' | 'Success' | 'Failure';
    failureReason: string;
    createdAt: string;
}

export default function SFTrackerPage() {
    const { data: session } = useSession();
    const [targets, setTargets] = useState<SFTrackerItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [newTarget, setNewTarget] = useState('');
    const [newCondition, setNewCondition] = useState('');

    // Failure Modal State
    const [failureModalOpen, setFailureModalOpen] = useState(false);
    const [failingTargetId, setFailingTargetId] = useState<string | null>(null);
    const [failureReason, setFailureReason] = useState('');

    useEffect(() => {
        if (session?.user?.email) {
            fetchTargets();
        }
    }, [session]);

    const fetchTargets = async () => {
        try {
            const res = await fetch('/api/sf-tracker');
            const data = await res.json();
            if (data.targets) {
                setTargets(data.targets);
            }
        } catch (error) {
            console.error('Failed to fetch targets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTarget.trim() || !newCondition.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/sf-tracker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: newTarget, successCondition: newCondition }),
            });
            const data = await res.json();
            if (data.target) {
                setTargets([data.target, ...targets]);
                setNewTarget('');
                setNewCondition('');
            }
        } catch (error) {
            console.error('Failed to create target:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkSuccess = async (id: string) => {
        try {
            const res = await fetch(`/api/sf-tracker/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Success' }),
            });
            if (res.ok) {
                setTargets(targets.map(t => t._id === id ? { ...t, status: 'Success' } : t));
            }
        } catch (error) {
            console.error('Failed to mark success:', error);
        }
    };

    const handleMarkFailureClick = (id: string) => {
        setFailingTargetId(id);
        setFailureReason('');
        setFailureModalOpen(true);
    };

    const submitFailure = async () => {
        if (!failingTargetId || !failureReason.trim()) return;
        
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/sf-tracker/${failingTargetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Failure', failureReason: failureReason }),
            });
            if (res.ok) {
                setTargets(targets.map(t => 
                    t._id === failingTargetId ? { ...t, status: 'Failure', failureReason: failureReason } : t
                ));
                setFailureModalOpen(false);
            }
        } catch (error) {
            console.error('Failed to submit failure:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this tracker permanently?')) return;
        try {
            const res = await fetch(`/api/sf-tracker/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTargets(targets.filter(t => t._id !== id));
            }
        } catch (error) {
            console.error('Failed to delete target:', error);
        }
    };

    const pendingTargets = targets.filter(t => t.status === 'Pending');
    const historyTargets = targets.filter(t => t.status !== 'Pending');

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 w-full max-w-5xl mx-auto pt-20 md:pt-8 min-h-screen">
                
                <div className="space-y-12 pb-24">
                    {/* Header */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center justify-center p-3 bg-white/5 border border-white/10 rounded-2xl mb-2 backdrop-blur-md">
                            <span className="text-3xl">⚖️</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">SF Tracker</h1>
                        <p className="text-zinc-400 text-lg max-w-2xl">
                            Binary execution: Success or Failure. Define your target, specify the exact condition for success, and hold yourself strictly accountable.
                        </p>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-zinc-500 text-sm font-medium mb-2">Total Tasks</h3>
                            <p className="text-4xl font-bold text-white">{targets.length}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-zinc-500 text-sm font-medium mb-2">Total Success</h3>
                            <p className="text-4xl font-bold text-white">{targets.filter(t => t.status === 'Success').length}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-zinc-500 text-sm font-medium mb-2">Total Failure</h3>
                            <p className="text-4xl font-bold text-white">{targets.filter(t => t.status === 'Failure').length}</p>
                        </div>
                    </div>

                    {/* Creation Form */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
                        <h2 className="text-xl font-semibold text-white mb-6">Add New Target</h2>
                        <form onSubmit={handleCreateTarget} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Target / Goal</label>
                                <input 
                                    type="text"
                                    value={newTarget}
                                    onChange={(e) => setNewTarget(e.target.value)}
                                    placeholder="e.g. Master React Hooks"
                                    className="w-full bg-black border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Success Condition <span className="text-zinc-500 text-xs">(Strict milestone)</span></label>
                                <input 
                                    type="text"
                                    value={newCondition}
                                    onChange={(e) => setNewCondition(e.target.value)}
                                    placeholder="e.g. Build 3 custom hooks without looking at docs and integrate them into a proj"
                                    className="w-full bg-black border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                                    required
                                />
                            </div>
                            <div className="pt-2">
                                <LiquidButton type="submit" disabled={isSubmitting || !newTarget.trim() || !newCondition.trim()} className="w-full sm:w-auto px-8 font-bold">
                                    {isSubmitting ? 'Initializing...' : 'Lock Target'}
                                </LiquidButton>
                            </div>
                        </form>
                    </div>

                    {/* Pending Targets */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">Active Pursuit</h2>
                            <div className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-bold text-zinc-300 border border-white/10">
                                {pendingTargets.length}
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2].map(i => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse"></div>)}
                            </div>
                        ) : pendingTargets.length === 0 ? (
                            <div className="text-center p-12 bg-white/5 border border-white/5 rounded-3xl border-dashed">
                                <span className="text-4xl mb-4 block">🎯</span>
                                <h3 className="text-lg font-medium text-zinc-300 mb-1">No Active Targets</h3>
                                <p className="text-zinc-500 text-sm">Lock in a target above to begin tracking your execution.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <AnimatePresence>
                                    {pendingTargets.map(target => (
                                        <motion.div 
                                            key={target._id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="bg-black border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group relative overflow-hidden flex flex-col justify-between"
                                        >
                                            <button onClick={() => handleDelete(target._id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors z-20" title="Delete">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            
                                            <div className="pr-6 relative z-10 mb-6">
                                                <h3 className="text-xl font-bold text-white mb-3">{target.target}</h3>
                                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Success Condition</span>
                                                    <p className="text-sm text-zinc-400 leading-snug">{target.successCondition}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 relative z-10 mt-auto">
                                                <button 
                                                    onClick={() => handleMarkSuccess(target._id)}
                                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    <span className="text-xl">S</span>
                                                    <span className="text-xs uppercase tracking-wider">Success</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleMarkFailureClick(target._id)}
                                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    <span className="text-xl">F</span>
                                                    <span className="text-xs uppercase tracking-wider">Failure</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* History */}
                    {historyTargets.length > 0 && (
                        <div className="space-y-6 pt-10 border-t border-white/5">
                            <h2 className="text-xl font-bold text-white">Execution History</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {historyTargets.map(target => (
                                    <div key={target._id} className="bg-white/5 border border-white/5 rounded-xl p-5 hover:bg-white/10 transition-colors relative group">
                                        <button onClick={() => handleDelete(target._id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                        <div className="flex justify-between items-start mb-2 pr-6">
                                            <h3 className="font-semibold text-white">{target.target}</h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${target.status === 'Success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {target.status}
                                            </span>
                                        </div>
                                        
                                        {target.status === 'Failure' && target.failureReason && (
                                            <div className="mt-3 bg-white/5 border border-white/10 rounded-lg p-3">
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Reason for Failure</span>
                                                <p className="text-sm text-zinc-400 italic">"{target.failureReason}"</p>
                                            </div>
                                        )}
                                        {target.status === 'Success' && (
                                            <div className="mt-3">
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Condition Met</span>
                                                <p className="text-xs text-zinc-400">{target.successCondition}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Failure Modal */}
                <AnimatePresence>
                    {failureModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setFailureModalOpen(false)}
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95, y: -20 }} 
                                className="relative w-full max-w-md bg-black border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden"
                            >
                                <h3 className="text-2xl font-bold text-white mb-2">Acknowledge Failure</h3>
                                <p className="text-zinc-400 text-sm mb-6">Why did you fail to meet the success condition? Be brutal. No excuses.</p>
                                
                                <textarea
                                    value={failureReason}
                                    onChange={(e) => setFailureReason(e.target.value)}
                                    placeholder="e.g. Got distracted by YouTube, procrastinated instead of reading documentation."
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all h-32 resize-none mb-6"
                                    autoFocus
                                />

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setFailureModalOpen(false)}
                                        className="flex-1 py-3 px-4 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={submitFailure}
                                        disabled={isSubmitting || !failureReason.trim()}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSubmitting ? 'Logging...' : 'Submit Failure'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </main>
        </div>
    );
}
