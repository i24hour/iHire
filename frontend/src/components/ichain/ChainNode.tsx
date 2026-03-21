'use client';

import { motion } from 'framer-motion';

interface ChainNodeProps {
    member: {
        userId: string;
        name: string;
        image?: string;
        isWorking: boolean;
        contributionTime: number;
    };
    isLast?: boolean;
}

export function ChainNode({ member, isLast }: ChainNodeProps) {
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    return (
        <div className="flex items-center">
            <div className="flex flex-col items-center gap-4 relative">
                {/* Node representation with pulse animation if working */}
                <motion.div
                    animate={member.isWorking ? {
                        boxShadow: [
                            "0 0 0 0px rgba(34, 197, 94, 0.4)",
                            "0 0 0 10px rgba(34, 197, 94, 0)",
                        ]
                    } : {}}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut"
                    }}
                    className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 transition-all duration-500 flex items-center justify-center bg-black overflow-hidden ${
                        member.isWorking ? 'border-green-500' : 'border-red-500'
                    }`}
                >
                    {member.image ? (
                        <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-3xl font-bold text-white uppercase">{member.name[0]}</span>
                    )}
                </motion.div>

                {/* Name and Time */}
                <div className="text-center">
                    <h4 className="text-white font-medium">{member.name}</h4>
                    <p className="text-xs text-zinc-500 mt-1">{formatTime(member.contributionTime)}</p>
                    {member.isWorking && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] rounded-full font-bold uppercase tracking-tighter">
                            Working
                        </span>
                    )}
                </div>
            </div>

            {/* Connecting line */}
            {!isLast && (
                <div className="w-16 md:w-32 h-1 bg-white/10 mx-2 -mt-16 md:-mt-24">
                    <motion.div 
                        animate={member.isWorking ? { 
                            backgroundColor: ['rgba(255,255,255,0.1)', 'rgba(34, 197, 94, 0.5)', 'rgba(255,255,255,0.1)'] 
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-full h-full"
                    />
                </div>
            )}
        </div>
    );
}
