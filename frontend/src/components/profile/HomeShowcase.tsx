'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FlowingBackground } from '@/components/profile/FlowingBackground';
import { ProfileShowcaseCard } from '@/components/profile/ProfileShowcaseCard';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import type { PublicProfile } from '@/types/profile';

export function HomeShowcase() {
    const { data: session } = useSession();
    const [profiles, setProfiles] = useState<PublicProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfiles() {
            try {
                const res = await fetch('/api/profiles');
                const data = await res.json();
                setProfiles(data.profiles || []);
            } catch (err) {
                console.error('Failed to load profiles:', err);
            } finally {
                setLoading(false);
            }
        }
        loadProfiles();
    }, []);

    return (
        <main className="relative min-h-screen overflow-hidden bg-black text-white selection:bg-white/20">
            <FlowingBackground />

            <header className="landing-header fixed top-0 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link href="/" className="landing-brand flex items-center gap-2">
                        <div className="landing-brand-icon flex h-6 w-6 items-center justify-center rounded-full bg-white">
                            <span className="text-xs font-bold text-black">iW</span>
                        </div>
                        <span className="font-semibold tracking-tight">Infinwork</span>
                    </Link>
                    <div className="landing-header-actions flex items-center gap-3 sm:gap-4">
                        <Link href="/profile" className="landing-directory-link text-sm text-zinc-400 transition-colors hover:text-white">
                            Profile
                        </Link>
                        <Link href="/itime" className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:inline">
                            iTime
                        </Link>
                        {session ? (
                            <Link href="/profile">
                                <LiquidButton className="landing-login-btn px-4 py-2 text-sm text-white border-white/20">
                                    My Profile
                                </LiquidButton>
                            </Link>
                        ) : (
                            <Link href="/api/auth/signin">
                                <LiquidButton className="landing-login-btn px-4 py-2 text-sm text-white border-white/20">
                                    Login
                                </LiquidButton>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-32">
                <div className="mb-14 max-w-3xl">
                    <div className="mb-5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300 backdrop-blur-sm">
                        <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                        Builder profiles, shared in motion
                    </div>
                    <h1 className="text-4xl font-bold tracking-tighter md:text-6xl">
                        <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                            Discover what builders ship.
                        </span>
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
                        A living directory of projects, sites, and repos. Add your work, tag your stack, and let your profile flow with the rest of Infinwork.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href="/profile">
                            <LiquidButton className="px-6 py-3 text-white ring-1 ring-white/20">
                                {session ? 'Edit My Profile' : 'Create Your Profile'}
                            </LiquidButton>
                        </Link>
                        <Link href="/workers">
                            <LiquidButton className="border-white/10 bg-transparent px-6 py-3 text-white hover:bg-white/5">
                                View Leaderboard
                            </LiquidButton>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
                        ))}
                    </div>
                ) : profiles.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-sm">
                        <p className="text-lg text-zinc-300">No profiles yet.</p>
                        <p className="mt-2 text-sm text-zinc-500">Be the first builder to share projects, site links, and GitHub repos.</p>
                        <Link href="/profile" className="mt-6 inline-block">
                            <LiquidButton className="px-6 py-3 text-white">Start Your Profile</LiquidButton>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {profiles.map((profile, index) => (
                            <ProfileShowcaseCard key={profile.username} profile={profile} index={index} />
                        ))}
                    </div>
                )}
            </section>

            <footer className="relative z-10 border-t border-white/10 bg-black/60 py-10 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 md:flex-row">
                    <p>© {new Date().getFullYear()} Infinwork. Measure work. Share what you build.</p>
                    <div className="flex gap-6">
                        <Link href="/profile" className="landing-footer-link transition-colors hover:text-white">Profile</Link>
                        <Link href="/itime" className="landing-footer-link transition-colors hover:text-white">iTime</Link>
                        <Link href="/workers" className="landing-footer-link transition-colors hover:text-white">Workers</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
