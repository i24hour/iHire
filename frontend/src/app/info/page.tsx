'use client';

import { Sidebar } from '@/components/Sidebar';

export default function InfoPage() {
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
                <div className="space-y-8 max-w-4xl">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Information & Resources</h1>
                        <p className="text-zinc-400">Helpful guides and techniques for maximizing your productivity.</p>
                    </div>

                    {/* Japanese Chunking Technique Info */}
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
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
                                <div className="bg-black/50 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Example</span>
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