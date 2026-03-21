'use client';

import { useState, useEffect, use } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { ChainNode } from '@/components/ichain/ChainNode';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function ChainDetailPage({ params }: { params: Promise<{ chainId: string }> }) {
    const { chainId } = use(params);
    const { data: session } = useSession();
    const [chain, setChain] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchChain = async () => {
        try {
            const response = await fetch(`/api/ichain/${chainId}`);
            if (response.ok) {
                const data = await response.json();
                setChain(data.chain);
            }
        } catch (error) {
            console.error('Failed to fetch chain details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleWorkStatus = async (isStarting: boolean) => {
        if (!chain) return;
        try {
            const response = await fetch(`/api/ichain/${chainId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isWorking: isStarting }),
            });
            if (response.ok) {
                const data = await response.json();
                setChain(data.chain);
            }
        } catch (error) {
            console.error('Failed to toggle work status:', error);
        }
    };

    useEffect(() => {
        fetchChain();
        const interval = setInterval(fetchChain, 2000); // More frequent polling for detail view
        return () => clearInterval(interval);
    }, [chainId]);

    if (isLoading) {
        return (
            <div className="flex flex-col md:flex-row min-h-screen bg-black">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50"></div>
                </div>
            </div>
        );
    }

    if (!chain) {
        return (
            <div className="flex flex-col md:flex-row min-h-screen bg-black">
                <Sidebar />
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <p className="text-zinc-500">Chain not found.</p>
                    <Link href="/ichain">
                        <LiquidButton className="text-white">Go Back</LiquidButton>
                    </Link>
                </div>
            </div>
        );
    }

    const myMemberInfo = chain.members.find((m: any) => m.userId === session?.user?.email);
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-7xl mx-auto flex flex-col">
                {/* Header Detail */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-12">
                    <div className="space-y-4">
                        <Link href="/ichain" className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Back to iChains
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">{chain.name}</h1>
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${
                                chain.status === 'Active' ? 'text-green-500 border-green-500/30 bg-green-500/10' :
                                chain.status === 'Idle' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' :
                                'text-red-500 border-red-500/30 bg-red-500/10'
                            }`}>
                                {chain.status}
                            </div>
                            {chain.whatsappLink && (
                                <a 
                                    href={chain.whatsappLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-green-500 hover:text-green-400 text-sm flex items-center gap-2 font-semibold"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412 0 6.556-5.338 11.892-11.893 11.892-1.997-.001-3.951-.499-5.688-1.447l-6.309 1.656zm6.223-4.76c1.543.917 3.011 1.403 4.626 1.405 5.235 0 9.493-4.258 9.495-9.493 0-2.535-1.011-5.045-2.847-6.88-1.84-1.84-4.146-2.853-6.647-2.853-5.236 0-9.493 4.256-9.496 9.493 0 1.613.404 3.206 1.326 4.706l-1.035 3.774 3.578-.952zm12.734-6.783c-.027-.447-.13-.767-.327-.927-.197-.16-.508-.24-.93-.24-.423 0-.69.091-.84.21-.15.12-.224.316-.224.587 0 .27.06.467.18.59.12.123.367.22.74.29.373.07.644.113.81.13.167.017.37.067.611.15.241.083.424.167.55.25z"/></svg>
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-end min-w-[240px]">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-2">Total Chain Life</span>
                        <div className="text-5xl font-mono font-bold text-white tracking-tighter">
                            {formatTime(chain.totalTime)}
                        </div>
                        {chain.status === 'Burst' && chain.burstAt && (
                            <span className="text-[10px] text-red-500 font-bold mt-2 uppercase">Burst at {new Date(chain.burstAt).toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>

                {/* Chain Visual View */}
                <div className="flex-1 flex items-center justify-center overflow-x-auto py-12 px-4 scrollbar-hide">
                    <div className="flex items-center min-w-max gap-0">
                        {chain.members.map((member: any, index: number) => (
                            <ChainNode 
                                key={member.userId} 
                                member={member} 
                                isLast={index === chain.members.length - 1} 
                            />
                        ))}
                    </div>
                </div>

                {/* Personal Control Section */}
                <div className="mt-auto border-t border-white/10 pt-12 pb-8 flex flex-col items-center gap-6">
                    {myMemberInfo ? (
                        <>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-white mb-2">My Contribution</h3>
                                <p className="text-3xl font-mono text-zinc-300">{formatTime(myMemberInfo.contributionTime)}</p>
                            </div>
                            
                            {chain.status !== 'Burst' ? (
                                <div className="flex gap-4">
                                    {myMemberInfo.isWorking ? (
                                        <LiquidButton 
                                            onClick={() => toggleWorkStatus(false)}
                                            className="px-12 py-5 text-white font-bold text-xl rounded-2xl bg-red-600/20 hover:bg-red-600/40 border-red-500/50"
                                        >
                                            Stop Working
                                        </LiquidButton>
                                    ) : (
                                        <LiquidButton 
                                            onClick={() => toggleWorkStatus(true)}
                                            className="px-12 py-5 text-white font-bold text-xl rounded-2xl bg-green-600/20 hover:bg-green-600/40 border-green-500/50"
                                        >
                                            Start Working
                                        </LiquidButton>
                                    )}
                                </div>
                            ) : (
                                <div className="text-red-500 font-bold uppercase tracking-widest text-center">
                                    <p className="text-2xl mb-1">Chain Burst</p>
                                    <p className="text-xs opacity-50">Everyone stopped working</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-zinc-500 italic">You are not a member of this chain</p>
                    )}
                </div>
            </main>
        </div>
    );
}
