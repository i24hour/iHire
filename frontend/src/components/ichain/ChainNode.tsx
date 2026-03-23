'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ChainNodeProps {
    member: {
        userId: string;
        name: string;
        image?: string;
        isWorking: boolean;
        contributionTime: number;
        parentId?: string;
    };
    isCurrentUser?: boolean;
    onNodeClick?: () => void;
    onAddMember?: (parentId: string) => void;
    children?: React.ReactNode;
}

export function ChainNode({ member, isCurrentUser, onNodeClick, onAddMember, children }: ChainNodeProps) {
    const [isLightTheme, setIsLightTheme] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        const syncTheme = () => setIsLightTheme(root.getAttribute('data-theme') === 'light');

        syncTheme();
        const observer = new MutationObserver(syncTheme);
        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    return (
        <div className="flex flex-col items-center">
            <div className="flex flex-col items-center gap-4 relative">
                {/* Node representation with pulse and lift animation if working */}
                <motion.div
                    animate={member.isWorking ? {
                        y: -30,
                        boxShadow: [
                            "0 0 0 0px rgba(34, 197, 94, 0.4)",
                            "0 0 0 10px rgba(34, 197, 94, 0)",
                        ]
                    } : {
                        y: 0
                    }}
                    transition={member.isWorking ? {
                        y: { duration: 0.5, ease: "easeOut" },
                        boxShadow: {
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut"
                        }
                    } : {
                        y: { duration: 0.5, ease: "easeIn" }
                    }}
                    className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 transition-all duration-500 flex items-center justify-center bg-black overflow-hidden z-10 ${
                        member.isWorking ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                    } ${!isCurrentUser ? 'cursor-pointer hover:border-white/50' : ''}`}
                    onClick={!isCurrentUser ? onNodeClick : undefined}
                >
                    {member.image ? (
                        <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                        <span
                            className={`text-2xl font-bold uppercase ${isLightTheme ? 'text-zinc-900' : 'text-white'}`}
                        >
                            {member.name[0]}
                        </span>
                    )}
                </motion.div>

                {/* Name and Time */}
                <div className="text-center w-32">
                    <h4 className="text-white font-medium text-sm truncate">{member.name}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{formatTime(member.contributionTime)}</p>
                    
                    {isCurrentUser && (
                        <button
                            onClick={() => onAddMember?.(member.userId)}
                            className={`mt-2 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isLightTheme
                                ? 'bg-white border-black/15 text-zinc-700 hover:text-black hover:bg-zinc-100 shadow-sm'
                                : 'bg-white/5 border-white/15 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            title="Add Member to this Node"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Connecting lines to children */}
            {children && (
                <div className="flex flex-col items-center">
                    {/* Vertical line from parent down to the split point */}
                    <div className={`w-0 h-8 border-l-2 border-dashed ${isLightTheme ? 'border-zinc-400/80' : 'border-white/45'}`} />
                    
                    {/* The horizontal line and the children */}
                    <div className="relative">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}
