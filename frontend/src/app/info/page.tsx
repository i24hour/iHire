'use client';

import { Sidebar } from '@/components/Sidebar';

export default function InfoPage() {
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full overflow-y-auto">
                <div className="space-y-8 max-w-4xl mx-auto pb-20">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Rules & Formulas</h1>
                        <p className="text-zinc-400">Understanding how your performance is measured and scored.</p>
                    </div>

                    {/* Formula Section */}
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h2 className="text-xl font-semibold text-white mb-6 relative z-10 flex items-center gap-2">
                            <span className="text-blue-400">📈</span> Performance Score Formula
                        </h2>
                        
                        <div className="bg-black/80 rounded-xl p-5 border border-white/5 font-mono text-sm md:text-base text-zinc-300 mb-8 relative z-10 overflow-x-auto">
                            Score = Completion_Rate × Speed_Score × Volume_Bonus × 1000
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">1. Completion Rate</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        <code className="text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded">Completed_Tasks / Total_Tasks</code><br/>
                                        The ratio of tasks you successfully finish versus the ones you create. Leaving tasks pending tank this multiplier.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">2. Speed Score</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        <code className="text-blue-400 bg-blue-400/10 px-1 py-0.5 rounded">1 / Max(Avg_Time_Per_Task, 0.5)</code><br/>
                                        Measures your pace. It takes the total time spent across all tasks (including active running time) divided by completed tasks. Faster average execution yields a higher multiplier.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">3. Volume Bonus</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        <code className="text-purple-400 bg-purple-400/10 px-1 py-0.5 rounded">Log10(Completed_Tasks + 1) × 2</code><br/>
                                        Rewards high volume consistency. The logarithmic curve provides a large initial boost for early tasks, with steady, sustainable growth as you scale.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Penalty Section */}
                    <div className="bg-[#110505] border border-red-500/20 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h2 className="text-xl font-semibold text-red-400 mb-4 relative z-10 flex items-center gap-2">
                            <span>⚠️</span> Continuous Inactivity Penalty
                        </h2>
                        
                        <p className="text-zinc-300 text-sm leading-relaxed mb-6 relative z-10">
                            The system enforces strict discipline. If you abandon your workflow and the global timer remains inactive for extended periods, your earned score will be heavily taxed.
                        </p>

                        <div className="bg-red-500/10 rounded-xl p-5 border border-red-500/20 relative z-10">
                            <ul className="space-y-3 text-sm text-zinc-300">
                                <li className="flex items-start gap-3">
                                    <span className="text-red-500 mt-0.5">▪</span>
                                    <span>If the timer is stopped continuously for <strong>2 hours</strong>, you lose <strong>10 points</strong>.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-red-500 mt-0.5">▪</span>
                                    <span>The penalty applies to <strong>each continuous 2-hour gap</strong> (e.g., a 4-hour continuous gap deducts 20 points).</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-red-500 mt-0.5">▪</span>
                                    <span>If you start a task before the 2-hour threshold is crossed, the continuous gap resets. Short breaks are safe.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Japanese Chunking Technique Info */}
                    <div className="bg-[#050f0a] border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="flex flex-col sm:flex-row gap-5 items-start relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
                                🎯
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-emerald-400 mb-2 tracking-tight">
                                    Pro Tip: The Japanese Chunking Technique
                                </h3>
                                <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                                    Targets ko hmesha chunks mein todo! This is a Japanese technique to break large targets into smaller, manageable chunks. Start the timer for each chunk. Target jaldi achieve hoga aur score zyada badhega.
                                </p>
                                <div className="bg-black/50 rounded-xl p-4 border border-emerald-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Example</span>
                                    </div>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        <strong className="text-zinc-200">Organic Chemistry:</strong> Agar aaj ka target 80 questions hai, toh usko ek sath na karke, <strong className="text-emerald-300">20-20 questions ke chunks</strong> bana kar timer set karo. Target jaldi hoga and score zyada badhega!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}