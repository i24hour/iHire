'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { PublicProfile } from '@/types/profile';
import type { GithubContributionCalendar } from '@/types/github-contributions';
import { getContributionLevel } from '@/lib/github-contributions';
import { FlowingBackground } from '@/components/profile/FlowingBackground';
import { ProjectCard } from '@/components/profile/ProfileShowcaseCard';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { cn } from '@/lib/utils';

const LEVEL_CLASSES = [
    'bg-white/5 border-white/5',
    'bg-white/20 border-white/10',
    'bg-white/35 border-white/15',
    'bg-white/55 border-white/20',
    'bg-white/80 border-white/25',
];

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="profile-stat rounded-2xl border p-5 backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-widest profile-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function GithubHeatmap({ calendar, username }: { calendar: GithubContributionCalendar; username: string }) {
    const monthLabels = useMemo(() => {
        const labels: { label: string; index: number }[] = [];
        let lastMonth = -1;
        calendar.weeks.forEach((week, weekIndex) => {
            for (const day of week.days) {
                if (!day?.date) continue;
                const month = new Date(`${day.date}T00:00:00Z`).getUTCMonth();
                if (month !== lastMonth) {
                    labels.push({
                        label: new Date(`${day.date}T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
                        index: weekIndex,
                    });
                    lastMonth = month;
                    break;
                }
            }
        });
        return labels;
    }, [calendar.weeks]);

    return (
        <div className="rounded-2xl border border-white/10 bg-black p-5 md:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500">GitHub Contributions</p>
                    <h3 className="text-lg font-semibold text-white">
                        {calendar.totalContributions.toLocaleString()} contributions in the last year
                    </h3>
                </div>
                <a
                    href={`https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer text-sm text-zinc-400 transition-colors hover:text-white"
                >
                    @{username}
                </a>
            </div>

            <div className="overflow-x-auto pb-1">
                <div className="min-w-[680px]">
                    <div className="relative mb-2 h-4">
                        {monthLabels.map((month) => (
                            <span
                                key={`${month.label}-${month.index}`}
                                className="absolute text-[10px] text-zinc-500"
                                style={{ left: `${month.index * 14}px` }}
                            >
                                {month.label}
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-[3px]">
                        {calendar.weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[3px]">
                                {Array.from({ length: 7 }).map((_, dayIndex) => {
                                    const day = week.days.find(
                                        (d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === dayIndex
                                    );
                                    if (!day) {
                                        return <div key={dayIndex} className="h-[11px] w-[11px]" />;
                                    }
                                    const level = getContributionLevel(day.count);
                                    return (
                                        <div
                                            key={day.date}
                                            title={`${day.count} contributions on ${day.date}`}
                                            className={cn('h-[11px] w-[11px] rounded-sm border', LEVEL_CLASSES[level])}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-1 text-[10px] text-zinc-500">
                <span>Less</span>
                {LEVEL_CLASSES.map((cls, i) => (
                    <div key={i} className={cn('h-[11px] w-[11px] rounded-sm border', cls)} />
                ))}
                <span>More</span>
            </div>
        </div>
    );
}

interface PortfolioViewProps {
    profile: PublicProfile;
    isOwner: boolean;
    githubCalendar: GithubContributionCalendar | null;
    githubLoading: boolean;
    githubHidden: boolean;
    onConnectGithub?: () => void;
    onHideGithub?: () => void;
    onShowGithub?: () => void;
}

export function PortfolioView({
    profile,
    isOwner,
    githubCalendar,
    githubLoading,
    githubHidden,
    onConnectGithub,
    onHideGithub,
    onShowGithub,
}: PortfolioViewProps) {
    const initial = profile.username.charAt(0).toUpperCase();
    const memberYear = profile.memberSince ? new Date(profile.memberSince).getFullYear() : '—';

    return (
        <div className="profile-builder relative">
            <FlowingBackground />
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mx-auto max-w-5xl space-y-10 pb-20">
            <Link href="/profiles" className="inline-flex text-sm text-zinc-400 transition-colors hover:text-white">
                ← All profiles
            </Link>

            {/* Hero */}
            <section className="profile-glass-hero relative overflow-hidden rounded-3xl border p-8 backdrop-blur-2xl md:p-10">
                <div className="profile-hero-grid pointer-events-none absolute inset-0 opacity-40" />
                <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-5">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                            {profile.image ? (
                                <img src={profile.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">{initial}</div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Builder Profile</p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white md:text-4xl">{profile.username}</h1>
                            {profile.headline && (
                                <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">{profile.headline}</p>
                            )}
                            {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">{profile.bio}</p>}
                            <div className="mt-5 flex flex-wrap gap-3">
                                {profile.githubUsername && (
                                    <a
                                        href={`https://github.com/${profile.githubUsername}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                                    >
                                        GitHub · @{profile.githubUsername}
                                    </a>
                                )}
                                {isOwner && (
                                    <Link href="/profile">
                                        <LiquidButton className="px-4 py-2 text-sm text-white">Edit Profile</LiquidButton>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Projects" value={profile.projects.length} />
                <StatCard label="GitHub Commits" value={profile.githubCommitsTotal || 0} />
                <StatCard label="Infinwork Points" value={profile.points || 0} />
                <StatCard label="Member Since" value={memberYear} />
            </section>

            {/* Projects */}
            <section>
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-zinc-500">Featured Work</p>
                        <h2 className="text-2xl font-semibold text-white">Projects</h2>
                    </div>
                </div>
                {profile.projects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black p-10 text-center text-sm text-zinc-500">
                        {isOwner ? 'Add projects from your profile editor to showcase them here.' : 'No projects shared yet.'}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {profile.projects.map((project) => (
                            <ProjectCard key={project._id || project.title} project={project} />
                        ))}
                    </div>
                )}
            </section>

            {/* GitHub */}
            <section>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-zinc-500">Open Source Activity</p>
                        <h2 className="text-2xl font-semibold text-white">GitHub Board</h2>
                    </div>
                    {isOwner && profile.githubUsername && profile.showGithubContributions !== false && !githubHidden && (
                        <button
                            type="button"
                            onClick={onHideGithub}
                            className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 transition-colors hover:text-white"
                        >
                            Hide GitHub
                        </button>
                    )}
                </div>

                {!profile.githubUsername ? (
                    isOwner ? (
                        <div className="rounded-2xl border border-dashed border-white/15 bg-black p-8 text-center">
                            <p className="text-sm text-zinc-400">Connect GitHub to display your contribution board on your portfolio.</p>
                            <button
                                type="button"
                                onClick={onConnectGithub}
                                className="mt-4 cursor-pointer rounded-full border border-white/15 px-5 py-2 text-sm text-white transition-colors hover:border-white/30"
                            >
                                Connect GitHub
                            </button>
                        </div>
                    ) : null
                ) : githubHidden || profile.showGithubContributions === false ? (
                    isOwner ? (
                        <div className="rounded-2xl border border-white/10 bg-black p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <p className="text-sm text-zinc-400">Your GitHub contribution board is hidden from visitors.</p>
                            <button
                                type="button"
                                onClick={onShowGithub}
                                className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
                            >
                                Show GitHub
                            </button>
                        </div>
                    ) : null
                ) : githubLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-black p-10 flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white/40" />
                    </div>
                ) : githubCalendar && profile.githubUsername ? (
                    <GithubHeatmap calendar={githubCalendar} username={profile.githubUsername} />
                ) : (
                    <div className="rounded-2xl border border-white/10 bg-black p-8 text-center text-sm text-zinc-500">
                        Could not load GitHub contributions right now.
                    </div>
                )}
            </section>
            </motion.div>
        </div>
    );
}
