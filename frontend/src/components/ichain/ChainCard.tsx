'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface ChainCardProps {
    chain: {
        _id: string;
        name: string;
        status: 'Active' | 'Idle' | 'Burst';
        totalTime: number;
        members: any[];
        burstAt?: number;
    };
}

export function ChainCard({ chain }: ChainCardProps) {
    const activeMembers = chain.members.filter(m => m.isWorking).length;
    
    const statusColors = {
        Active: 'text-green-500 border-green-500/30 bg-green-500/10',
        Idle: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10',
        Burst: 'text-red-500 border-red-500/30 bg-red-500/10',
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <Link href={`/ichain/${chain._id}`}>
            <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`bg-black border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all cursor-pointer group relative overflow-hidden ${chain.status === 'Burst' ? 'shake-subtle' : ''}`}
            >
                {/* Glow effect based on status */}
                <div className={`absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${
                    chain.status === 'Active' ? 'bg-green-500' : 
                    chain.status === 'Idle' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>

                <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-white/90 transition-colors">
                                {chain.name}
                            </h3>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-2 ${statusColors[chain.status]}`}>
                                {chain.status}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Total Chain Time</span>
                            <span className="text-2xl font-mono font-bold text-white">
                                {formatTime(chain.totalTime)}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {chain.members.slice(0, 3).map((member, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-white/10 flex items-center justify-center text-[10px] text-white overflow-hidden">
                                        {member.image ? <img src={member.image} alt="" /> : member.name[0]}
                                    </div>
                                ))}
                                {chain.members.length > 3 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">
                                        +{chain.members.length - 3}
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-zinc-400">
                                {activeMembers} / {chain.members.length} Active
                            </span>
                        </div>
                        
                        {chain.status === 'Burst' && (
                            <div className="text-[10px] text-red-500 font-bold uppercase tracking-tighter animate-pulse">
                                Burst
                            </div>
                        )}
                    </div>
                </div>

                <style jsx global>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-1px); }
                        75% { transform: translateX(1px); }
                    }
                    .shake-subtle {
                        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) infinite;
                        animation-play-state: paused;
                    }
                    .group:hover .shake-subtle {
                        animation-play-state: running;
                    }
                `}</style>
            </motion.div>
        </Link>
    );
}
