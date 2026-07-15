'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

function useIsLightTheme() {
    const [isLightTheme, setIsLightTheme] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        const syncTheme = () => setIsLightTheme(root.getAttribute('data-theme') === 'light');

        syncTheme();
        const observer = new MutationObserver(syncTheme);
        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    return isLightTheme;
}

interface PoliticianRow {
    id: string;
    name: string;
    slug: string;
    party: string;
    state: string | null;
    portfolio: string;
    xHandle: string;
    xProfileUrl: string;
    avatarUrl: string | null;
    lastScrapeStatus: string;
    stats: {
        netScore: number;
        onPortfolioPct: number;
        postCount: number;
        scoredPostCount?: number;
    };
    rank: number;
}

type SortBy = 'onPortfolioPct' | 'netScore';

export default function RankPoliticianPage() {
    const isLightTheme = useIsLightTheme();
    const [politicians, setPoliticians] = useState<PoliticianRow[]>([]);
    const [parties, setParties] = useState<string[]>([]);
    const [party, setParty] = useState('all');
    const [sortBy, setSortBy] = useState<SortBy>('onPortfolioPct');
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaderboard = useCallback(async () => {
        try {
            setError(null);
            const params = new URLSearchParams({ sortBy });
            if (party !== 'all') params.set('party', party);
            if (q.trim()) params.set('q', q.trim());

            const response = await fetch(`/api/rank-politician?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch politician rankings');
            const data = await response.json();
            setPoliticians(data.politicians || []);
            setParties(data.parties || []);
        } catch (err: any) {
            console.error('Error fetching rank-politician:', err);
            setError(err.message || 'Error fetching data');
        } finally {
            setLoading(false);
        }
    }, [party, q, sortBy]);

    useEffect(() => {
        setLoading(true);
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const muted = isLightTheme ? 'text-zinc-700' : 'text-zinc-400';
    const heading = isLightTheme ? 'text-zinc-900' : 'text-white';
    const panel = 'bg-black border border-white/10 rounded-2xl';

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
                <div className="space-y-8">
                    <div className="flex flex-col gap-3 max-w-3xl">
                        <h1 className={`text-3xl font-bold tracking-tight ${heading}`}>
                            Rank Politician
                        </h1>
                        <p className={muted}>
                            Ranks how focused public X posts are on each politician&apos;s portfolio —
                            not a measure of governance delivery. Scores appear after seeding and scraping.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
                        <div className={`${panel} p-5`}>
                            <h3 className={`text-sm font-medium mb-2 ${muted}`}>Politicians</h3>
                            <p className={`text-3xl font-semibold ${heading}`}>{politicians.length}</p>
                        </div>
                        <div className={`${panel} p-5`}>
                            <h3 className={`text-sm font-medium mb-2 ${muted}`}>Default sort</h3>
                            <p className={`text-lg font-semibold ${heading}`}>% On-portfolio</p>
                        </div>
                        <div className={`${panel} p-5`}>
                            <h3 className={`text-sm font-medium mb-2 ${muted}`}>Data status</h3>
                            <p className={`text-lg font-semibold ${heading}`}>
                                {politicians.some((p) => p.stats.postCount > 0)
                                    ? 'Posts loaded'
                                    : 'Awaiting seed / scrape'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 max-w-4xl">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search name, portfolio, handle..."
                            className="flex-1 rounded-xl bg-black border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                        />
                        <select
                            value={party}
                            onChange={(e) => setParty(e.target.value)}
                            className="rounded-xl bg-black border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                        >
                            <option value="all">All parties</option>
                            {parties.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="rounded-xl bg-black border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                        >
                            <option value="onPortfolioPct">Sort: % on-portfolio</option>
                            <option value="netScore">Sort: net score</option>
                        </select>
                    </div>

                    <div>
                        {loading ? (
                            <div className="flex py-12 items-center justify-center w-full max-w-4xl">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50" />
                            </div>
                        ) : error ? (
                            <div className={`flex flex-col py-12 items-center justify-center gap-4 w-full max-w-4xl ${panel}`}>
                                <p className="text-white">Error: {error}</p>
                                <LiquidButton onClick={fetchLeaderboard} className="px-4 py-2 text-white">
                                    Retry
                                </LiquidButton>
                            </div>
                        ) : politicians.length === 0 ? (
                            <div className={`${panel} p-8 max-w-4xl space-y-3`}>
                                <p className={heading}>No politicians yet.</p>
                                <p className={`text-sm ${muted}`}>
                                    Admin: sign in and call <code className="text-zinc-300">POST /api/rank-politician/seed</code> to load the starter list.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 max-w-4xl">
                                {politicians.map((politician) => {
                                    const pct = politician.stats?.onPortfolioPct ?? 0;
                                    const net = politician.stats?.netScore ?? 0;
                                    const scorePositive = net >= 0;

                                    return (
                                        <Link
                                            href={`/rank-politician/${encodeURIComponent(politician.slug)}`}
                                            key={politician.id}
                                        >
                                            <motion.div
                                                whileHover={{ y: -4, scale: 1.01 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`${panel} p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-zinc-700 transition-colors cursor-pointer group w-full`}
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0 md:max-w-[340px]">
                                                    <div className="flex flex-col items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-zinc-400 font-bold text-sm">
                                                        #{politician.rank}
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full bg-white/10 flex shrink-0 items-center justify-center text-white font-bold text-xl uppercase ring-1 ring-white/20 overflow-hidden">
                                                        {politician.avatarUrl ? (
                                                            <img
                                                                src={politician.avatarUrl}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            politician.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 overflow-hidden">
                                                        <h3 className={`text-lg font-medium truncate ${isLightTheme ? 'text-zinc-900' : 'text-zinc-200'}`}>
                                                            {politician.name}
                                                        </h3>
                                                        <p className={`text-xs truncate ${muted}`}>
                                                            {politician.party}
                                                            {politician.state ? ` · ${politician.state}` : ''}
                                                            {' · '}@{politician.xHandle}
                                                        </p>
                                                        <p className={`text-xs truncate mt-0.5 ${isLightTheme ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                                            {politician.portfolio}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-row flex-wrap justify-end gap-3 mt-auto md:ml-auto">
                                                    <div className="bg-black rounded-xl px-4 py-2 border border-white/10 flex flex-col justify-center min-w-[90px] flex-1 md:flex-none">
                                                        <span className={`block text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${muted}`}>
                                                            Posts
                                                        </span>
                                                        <span className={`block text-2xl font-bold leading-none ${heading}`}>
                                                            {politician.stats?.postCount ?? 0}
                                                        </span>
                                                    </div>
                                                    <div className="bg-black rounded-xl px-4 py-2 border border-white/10 flex flex-col justify-center min-w-[110px] flex-1 md:flex-none">
                                                        <span className={`block text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${muted}`}>
                                                            On-portfolio
                                                        </span>
                                                        <span className={`block text-2xl font-bold leading-none ${heading}`}>
                                                            {pct.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`bg-black rounded-xl px-4 py-2 border flex flex-col justify-center min-w-[110px] flex-1 md:flex-none relative overflow-hidden ${
                                                            scorePositive
                                                                ? 'border-[#4CAF50]/30'
                                                                : 'border-red-500/30'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`block text-[10px] uppercase tracking-wider font-bold mb-0.5 ${
                                                                scorePositive ? 'text-[#4CAF50]' : 'text-red-400'
                                                            }`}
                                                        >
                                                            Net score
                                                        </span>
                                                        <span
                                                            className={`block text-2xl font-bold leading-none font-mono tracking-tight ${
                                                                scorePositive ? 'text-white' : 'text-red-400'
                                                            }`}
                                                        >
                                                            {net > 0 ? `+${net}` : net}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
