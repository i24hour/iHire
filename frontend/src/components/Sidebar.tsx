'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
    { href: '/', label: 'Overview', icon: '📊' },
    { href: '/dashboard', label: 'Candidates', icon: '👥' },
    { href: '/itime', label: 'iTime', icon: '⏱️' }, // iTime Tracker
];

export function Sidebar() {
    const pathname = usePathname();
    const [campaigns, setCampaigns] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        async function fetchCampaigns() {
            try {
                const res = await fetch('/api/campaigns');
                const data = await res.json();
                if (data.campaigns) {
                    setCampaigns(data.campaigns);
                }
            } catch (error) {
                console.error('Failed to fetch campaigns:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchCampaigns();
    }, []);

    // Close sidebar on route change on mobile
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-zinc-800 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-1">
                    <span className="text-xl font-semibold text-white tracking-tight">iW</span>
                    <div className="animate-spin-slow rounded-full h-5 w-5 border-t-2 border-b-2 border-white mt-1"></div>
                    <span className="text-xl font-semibold text-white tracking-tight">r</span>
                    <span className="text-xl font-semibold text-white tracking-tight">K</span>
                </div>
                <button onClick={() => setIsOpen(true)} className="p-2 -mr-2 text-zinc-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`fixed md:relative top-0 left-0 z-[70] h-[100dvh] w-64 bg-black border-r border-zinc-800 p-6 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Close Button on Mobile */}
                <button onClick={() => setIsOpen(false)} className="md:hidden absolute top-4 right-4 text-zinc-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-8 flex items-center gap-1">
                    <div className="flex items-center gap-1">
                        <span className="text-2xl font-semibold text-white tracking-tight">iW</span>
                        <div className="animate-spin-slow rounded-full h-6 w-6 border-t-2 border-b-2 border-white mt-1 hidden md:block"></div>
                        <span className="text-2xl font-semibold text-white tracking-tight hidden md:block">r</span>
                        <span className="text-2xl font-semibold text-white tracking-tight md:hidden">r</span>
                        <span className="text-2xl font-semibold text-white tracking-tight">K</span>
                    </div>
                </div>

                {/* Main Navigation */}
                <nav className="space-y-1 mb-8">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <motion.div
                                    whileHover={{ x: 2 }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${isActive
                                        ? 'bg-zinc-900 text-white'
                                        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                                        }`}
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span className="font-medium text-sm">{item.label}</span>
                                </motion.div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Campaigns / Jobs */}
                <div className="mb-4">
                    <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide px-3">Active Jobs</h3>
                    <div className="space-y-1">
                        {loading ? (
                            <div className="px-3 text-zinc-600 text-sm">Loading...</div>
                        ) : campaigns.length === 0 ? (
                            <div className="px-3 text-zinc-600 text-sm">No active jobs</div>
                        ) : (
                            campaigns.map((campaign) => {
                                // Check if active based on URL param
                                // Note: This is client-side, so we can check window.location or useSearchParams
                                // But Sidebar is a client component, so useSearchParams is better
                                // However, for simplicity in this edit, let's just use Link
                                return (
                                    <Link key={campaign} href={`/dashboard?campaign=${encodeURIComponent(campaign)}`}>
                                        <motion.div
                                            whileHover={{ x: 2 }}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200`}
                                        >
                                            <span className="text-xs">💼</span>
                                            <span className="font-medium text-sm truncate">{campaign}</span>
                                        </motion.div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="mt-auto p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">Quick Stats</h3>
                    <div className="space-y-2.5">
                        <div className="flex justify-between">
                            <span className="text-zinc-500 text-sm">Total Candidates</span>
                            <span className="text-zinc-300 font-medium text-sm">--</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500 text-sm">Strong Yes</span>
                            <span className="text-emerald-500 font-medium text-sm">--</span>
                        </div>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="mt-6 pt-6 border-t border-zinc-900">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-zinc-500 text-xs">System Active</span>
                    </div>
                </div>
            </aside>
        </>
    );
}
