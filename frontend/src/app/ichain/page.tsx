'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { CreateChainModal } from '@/components/ichain/CreateChainModal';
import { ChainCard } from '@/components/ichain/ChainCard';

export default function IChainPage() {
    const [chains, setChains] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchChains = async () => {
        try {
            const response = await fetch('/api/ichain');
            if (response.ok) {
                const data = await response.json();
                setChains(data.chains);
            }
        } catch (error) {
            console.error('Failed to fetch chains:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChains();
        // Poll every 5 seconds for list view
        const interval = setInterval(fetchChains, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleChainCreated = (newChain: any) => {
        const updatedChains = [newChain, ...chains];
        // Sort by maxTime (or totalTime for new chain)
        updatedChains.sort((a, b) => (b.maxTime || b.totalTime || 0) - (a.maxTime || a.totalTime || 0));
        setChains(updatedChains);
    };

    const handleChainDeleted = (chainId: string) => {
        setChains(chains.filter(c => c._id !== chainId));
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-7xl mx-auto">
                <div className="space-y-12">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">iChain</h1>
                            <p className="text-zinc-400 text-lg">Collaborative productivity chains where progress continues as long as someone is working.</p>
                        </div>
                        <LiquidButton 
                            onClick={() => setIsModalOpen(true)}
                            className="text-white font-bold h-12 px-8"
                        >
                            + Create Chain
                        </LiquidButton>
                    </div>

                    {/* Active Chains List */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-semibold text-white">Active Chains</h2>
                            <div className="h-px flex-1 bg-white/10"></div>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-48 animate-pulse"></div>
                                ))}
                            </div>
                        ) : chains.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center space-y-4">
                                <p className="text-zinc-500 text-lg">No chains found. Start a productivity chain with your team!</p>
                                <LiquidButton 
                                    onClick={() => setIsModalOpen(true)}
                                    variant="ghost"
                                    className="text-white border border-white/20"
                                >
                                    Create Your First Chain
                                </LiquidButton>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {chains.map((chain, index) => (
                                    <ChainCard 
                                        key={chain._id} 
                                        chain={chain} 
                                        rank={index + 1}
                                        onDelete={handleChainDeleted}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <CreateChainModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onChainCreated={handleChainCreated}
                />
            </main>
        </div>
    );
}
