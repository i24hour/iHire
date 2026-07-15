'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

interface PoliticianDetail {
    id: string;
    name: string;
    slug: string;
    party: string;
    state: string | null;
    portfolio: string;
    portfolioTopics: string[];
    xHandle: string;
    xProfileUrl: string;
    avatarUrl: string | null;
    lastScrapeStatus: string;
    lastScrapedAt: string | null;
    stats: {
        netScore: number;
        onPortfolioPct: number;
        postCount: number;
        onPortfolioCount?: number;
        relatedCount?: number;
        offTopicCount?: number;
        attackCount?: number;
        personalCount?: number;
        unknownCount?: number;
    };
}

interface ScoredPost {
    id: string;
    text: string;
    postedAt: string | null;
    postUrl: string | null;
    category: string;
    score: number;
    scoreReason: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
    on_portfolio: 'On portfolio',
    related: 'Related',
    off_topic: 'Off topic',
    attack: 'Attack',
    personal: 'Personal',
    unknown: 'Unknown',
};

export default function RankPoliticianDetailPage() {
    const params = useParams();
    const slug = typeof params?.slug === 'string' ? params.slug : '';
    const isLightTheme = useIsLightTheme();

    const [politician, setPolitician] = useState<PoliticianDetail | null>(null);
    const [posts, setPosts] = useState<ScoredPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!slug) return;
        try {
            setError(null);
            const response = await fetch(`/api/rank-politician/${encodeURIComponent(slug)}`);
            if (response.status === 404) throw new Error('Politician not found');
            if (!response.ok) throw new Error('Failed to fetch politician');
            const data = await response.json();
            setPolitician(data.politician);
            setPosts(data.posts || []);
        } catch (err: any) {
            console.error('Error fetching politician detail:', err);
            setError(err.message || 'Error fetching data');
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        setLoading(true);
        fetchDetail();
    }, [fetchDetail]);

    const muted = isLightTheme ? 'text-zinc-700' : 'text-zinc-400';
    const heading = isLightTheme ? 'text-zinc-900' : 'text-white';
    const panel = 'bg-black border border-white/10 rounded-2xl';

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
                <div className="space-y-6 max-w-4xl">
                    <Link href="/rank-politician" className={`text-sm ${muted} hover:text-white transition-colors`}>
                        ← Back to rankings
                    </Link>

                    {loading ? (
                        <div className="flex py-12 items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50" />
                        </div>
                    ) : error ? (
                        <div className={`${panel} p-8 flex flex-col items-center gap-4`}>
                            <p className="text-white">Error: {error}</p>
                            <LiquidButton onClick={fetchDetail} className="px-4 py-2 text-white">
                                Retry
                            </LiquidButton>
                        </div>
                    ) : politician ? (
                        <>
                            <div className="space-y-2">
                                <h1 className={`text-3xl font-bold tracking-tight ${heading}`}>
                                    {politician.name}
                                </h1>
                                <p className={muted}>
                                    {politician.party}
                                    {politician.state ? ` · ${politician.state}` : ''}
                                    {' · '}
                                    {politician.portfolio}
                                </p>
                                <a
                                    href={politician.xProfileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-zinc-300 hover:text-white underline underline-offset-2"
                                >
                                    @{politician.xHandle}
                                </a>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className={`${panel} p-4`}>
                                    <p className={`text-xs uppercase tracking-wider mb-1 ${muted}`}>Net score</p>
                                    <p className={`text-2xl font-bold font-mono ${heading}`}>
                                        {politician.stats.netScore > 0
                                            ? `+${politician.stats.netScore}`
                                            : politician.stats.netScore}
                                    </p>
                                </div>
                                <div className={`${panel} p-4`}>
                                    <p className={`text-xs uppercase tracking-wider mb-1 ${muted}`}>On-portfolio</p>
                                    <p className={`text-2xl font-bold ${heading}`}>
                                        {politician.stats.onPortfolioPct.toFixed(1)}%
                                    </p>
                                </div>
                                <div className={`${panel} p-4`}>
                                    <p className={`text-xs uppercase tracking-wider mb-1 ${muted}`}>Posts</p>
                                    <p className={`text-2xl font-bold ${heading}`}>
                                        {politician.stats.postCount}
                                    </p>
                                </div>
                                <div className={`${panel} p-4`}>
                                    <p className={`text-xs uppercase tracking-wider mb-1 ${muted}`}>Scrape</p>
                                    <p className={`text-lg font-semibold capitalize ${heading}`}>
                                        {politician.lastScrapeStatus || 'never'}
                                    </p>
                                </div>
                            </div>

                            {politician.portfolioTopics?.length > 0 && (
                                <div className={`${panel} p-5`}>
                                    <p className={`text-sm font-medium mb-3 ${heading}`}>Portfolio topics</p>
                                    <div className="flex flex-wrap gap-2">
                                        {politician.portfolioTopics.map((topic) => (
                                            <span
                                                key={topic}
                                                className="text-xs px-2.5 py-1 rounded-md border border-white/10 text-zinc-300"
                                            >
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h2 className={`text-xl font-semibold ${heading}`}>Scored posts</h2>
                                {posts.length === 0 ? (
                                    <div className={`${panel} p-6`}>
                                        <p className={muted}>
                                            No posts yet. Run admin seed, then wait for the 8h cron or trigger
                                            <code className="text-zinc-300"> POST /api/rank-politician/scrape</code>.
                                        </p>
                                    </div>
                                ) : (
                                    posts.map((post) => (
                                        <div key={post.id} className={`${panel} p-4 space-y-2`}>
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                <span className="px-2 py-0.5 rounded border border-white/10 text-zinc-300">
                                                    {CATEGORY_LABELS[post.category] || post.category}
                                                </span>
                                                <span
                                                    className={`font-mono font-semibold ${
                                                        post.score >= 0 ? 'text-[#4CAF50]' : 'text-red-400'
                                                    }`}
                                                >
                                                    {post.score > 0 ? `+${post.score}` : post.score}
                                                </span>
                                                {post.postedAt && (
                                                    <span className={muted}>
                                                        {new Date(post.postedAt).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm whitespace-pre-wrap ${isLightTheme ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                                {post.text}
                                            </p>
                                            {post.scoreReason && (
                                                <p className={`text-xs ${muted}`}>{post.scoreReason}</p>
                                            )}
                                            {post.postUrl && (
                                                <a
                                                    href={post.postUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-zinc-300 hover:text-white underline underline-offset-2"
                                                >
                                                    View on X
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
