'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { PublicProfile, ProfileProject } from '@/types/profile';
import type { GithubContributionCalendar } from '@/types/github-contributions';
import { getContributionLevel } from '@/lib/github-contributions';
import { cn } from '@/lib/utils';

function GithubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
    );
}

function LinkIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="folio-mono mb-5 text-xs tracking-widest folio-accent-text">// {children}</p>;
}

function ProjectCard({ project, index }: { project: ProfileProject; index: number }) {
    const initial = project.title.charAt(0).toUpperCase() || '#';
    const isLive = !!project.siteUrl?.trim();

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
            className="folio-card group flex flex-col overflow-hidden rounded-xl border"
        >
            <div className="folio-card-strip relative h-1.5 w-full" />
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="folio-icon flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold">
                            {initial}
                        </div>
                        <h3 className="text-base font-semibold">{project.title || 'Untitled project'}</h3>
                    </div>
                    {isLive && (
                        <span className="folio-badge folio-mono rounded px-2 py-0.5 text-[10px] tracking-wider">LIVE</span>
                    )}
                </div>

                {project.description && (
                    <p className="folio-muted mt-3 line-clamp-3 text-sm leading-relaxed">{project.description}</p>
                )}

                {!!project.technologies?.length && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {project.technologies.slice(0, 6).map((tech) => (
                            <span key={tech} className="folio-chip folio-mono rounded border px-2 py-0.5 text-[10px]">
                                {tech}
                            </span>
                        ))}
                    </div>
                )}

                <div className="folio-divider mt-5 flex items-center gap-3 border-t pt-4">
                    {project.siteUrl && (
                        <a
                            href={project.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="folio-link inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                        >
                            <LinkIcon className="h-3.5 w-3.5" /> Live site
                        </a>
                    )}
                    {project.githubUrl && (
                        <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="folio-link inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                        >
                            <GithubIcon className="h-3.5 w-3.5" /> Repo
                        </a>
                    )}
                    {!project.siteUrl && !project.githubUrl && (
                        <span className="folio-muted text-xs">No links yet</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

const LEVEL_CLASSES = ['folio-heat-0', 'folio-heat-1', 'folio-heat-2', 'folio-heat-3', 'folio-heat-4'];

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
        <div className="folio-card rounded-xl border p-5 md:p-6">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="text-sm font-semibold">
                    {calendar.totalContributions.toLocaleString()} contributions in the last year
                </h3>
                <a
                    href={`https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="folio-link folio-mono text-xs"
                >
                    @{username}
                </a>
            </div>

            <div className="overflow-x-auto pb-1">
                <div className="min-w-[680px]">
                    <div className="folio-mono relative mb-2 h-4">
                        {monthLabels.map((month) => (
                            <span
                                key={`${month.label}-${month.index}`}
                                className="folio-muted absolute text-[10px]"
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
                                            className={cn('h-[11px] w-[11px] rounded-sm', LEVEL_CLASSES[level])}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="folio-muted folio-mono mt-4 flex items-center justify-end gap-1 text-[10px]">
                <span>Less</span>
                {LEVEL_CLASSES.map((cls, i) => (
                    <div key={i} className={cn('h-[11px] w-[11px] rounded-sm', cls)} />
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

    const topTech = useMemo(() => {
        const counts = new Map<string, number>();
        profile.projects.forEach((p) => (p.technologies || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 6);
    }, [profile.projects]);

    const liveCount = profile.projects.filter((p) => p.siteUrl?.trim()).length;
    const repoCount = profile.projects.filter((p) => p.githubUrl?.trim()).length;
    const techCount = new Set(profile.projects.flatMap((p) => p.technologies || [])).size;

    const stats = [
        { label: 'Products Built', value: profile.projects.length },
        { label: 'GitHub Commits', value: profile.githubCommitsTotal || 0 },
        { label: 'Infinwork Points', value: profile.points || 0 },
        { label: 'Live Sites', value: liveCount },
        { label: 'Repos Linked', value: repoCount },
        { label: 'Tech in Stack', value: techCount },
    ];

    const showGithubBoard =
        !!profile.githubUsername && profile.showGithubContributions !== false && !githubHidden;

    return (
        <div className="folio relative min-h-full">
            <div className="folio-bg pointer-events-none absolute inset-0" />

            <div className="relative z-10 mx-auto max-w-6xl space-y-16 pb-24">
                {/* Top bar */}
                <div className="folio-divider flex items-center justify-between border-b pb-5 pt-1">
                    <div className="flex items-center gap-3">
                        <Link href="/profiles" className="folio-link folio-mono text-xs">
                            ← /profiles
                        </Link>
                        <span className="folio-muted folio-mono hidden text-xs sm:inline">
                            {profile.username}.os
                        </span>
                    </div>
                    {isOwner ? (
                        <Link href="/profile" className="folio-cta folio-mono rounded-full px-4 py-1.5 text-xs font-medium">
                            Edit Profile
                        </Link>
                    ) : profile.githubUsername ? (
                        <a
                            href={`https://github.com/${profile.githubUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="folio-cta folio-mono rounded-full px-4 py-1.5 text-xs font-medium"
                        >
                            Let&apos;s Connect ●
                        </a>
                    ) : null}
                </div>

                {/* Hero */}
                <section className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col justify-center"
                    >
                        <p className="folio-mono folio-accent-text folio-cursor mb-6 text-xs tracking-widest">
                            &gt;_ INITIALIZING PROFILE...
                        </p>
                        <div className="flex items-start gap-4">
                            <div className="folio-avatar h-14 w-14 shrink-0 overflow-hidden rounded-xl border">
                                {profile.image ? (
                                    <img src={profile.image} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xl font-bold">{initial}</div>
                                )}
                            </div>
                            <div>
                                <p className="folio-muted folio-mono text-xs">@{profile.username}</p>
                                <h1 className="folio-headline mt-1 text-3xl font-extrabold uppercase leading-[1.05] tracking-tight md:text-5xl">
                                    {profile.headline || 'Builder shipping real products.'}
                                </h1>
                            </div>
                        </div>

                        {profile.bio && (
                            <p className="folio-muted mt-6 max-w-xl text-sm leading-relaxed md:text-base">{profile.bio}</p>
                        )}

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            {liveCount > 0 && profile.projects.find((p) => p.siteUrl) && (
                                <a
                                    href={profile.projects.find((p) => p.siteUrl)!.siteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="folio-cta folio-mono inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
                                >
                                    Explore Work →
                                </a>
                            )}
                            {profile.githubUsername && (
                                <a
                                    href={`https://github.com/${profile.githubUsername}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="folio-btn-ghost inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium"
                                >
                                    <GithubIcon className="h-4 w-4" /> GitHub
                                </a>
                            )}
                        </div>
                    </motion.div>

                    {/* Builder pulse panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="space-y-4"
                    >
                        <div className="folio-card rounded-xl border p-5">
                            <div className="folio-divider mb-4 flex items-center justify-between border-b pb-3">
                                <span className="folio-mono text-xs tracking-widest">BUILDER PULSE</span>
                                <span className="folio-accent-text folio-mono inline-flex items-center gap-1.5 text-[10px]">
                                    <span className="folio-dot h-1.5 w-1.5 rounded-full" /> LIVE
                                </span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-end justify-between">
                                    <span className="folio-muted folio-mono text-xs">INFINWORK POINTS</span>
                                    <span className="folio-accent-text text-2xl font-bold tabular-nums">
                                        {(profile.points || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="folio-muted folio-mono text-xs">PROJECTS SHIPPED</span>
                                    <span className="text-xl font-semibold tabular-nums">{profile.projects.length}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="folio-muted folio-mono text-xs">MEMBER SINCE</span>
                                    <span className="text-xl font-semibold tabular-nums">{memberYear}</span>
                                </div>
                            </div>
                        </div>

                        <div className="folio-card rounded-xl border p-5">
                            <p className="folio-mono mb-3 text-xs tracking-widest">STACK INSIGHT</p>
                            {topTech.length ? (
                                <>
                                    <p className="folio-muted text-sm">Key strength in</p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {topTech.map((t) => (
                                            <span key={t} className="folio-chip folio-mono rounded border px-2 py-0.5 text-[11px]">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="folio-muted text-sm">Add tech tags to your projects to surface your stack.</p>
                            )}
                        </div>
                    </motion.div>
                </section>

                {/* Featured projects */}
                <section>
                    <div className="flex items-end justify-between gap-4">
                        <SectionLabel>FEATURED PROJECTS</SectionLabel>
                        {isOwner && (
                            <Link href="/profile" className="folio-link folio-mono mb-5 text-xs">
                                Manage →
                            </Link>
                        )}
                    </div>
                    {profile.projects.length === 0 ? (
                        <div className="folio-card rounded-xl border border-dashed p-12 text-center">
                            <p className="folio-muted text-sm">
                                {isOwner ? 'Add projects from your profile editor to showcase them here.' : 'No projects shared yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {profile.projects.map((project, i) => (
                                <ProjectCard key={project._id || `${project.title}-${i}`} project={project} index={i} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Dashboard overview + GitHub */}
                <section>
                    <SectionLabel>DASHBOARD OVERVIEW</SectionLabel>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="folio-card rounded-xl border p-4">
                                <p className="folio-accent-text text-2xl font-bold tabular-nums">
                                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                </p>
                                <p className="folio-muted folio-mono mt-1 text-[10px] leading-tight tracking-wide">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        {showGithubBoard ? (
                            githubLoading ? (
                                <div className="folio-card flex justify-center rounded-xl border p-10">
                                    <div className="folio-spinner h-8 w-8 animate-spin rounded-full border-2" />
                                </div>
                            ) : githubCalendar && profile.githubUsername ? (
                                <GithubHeatmap calendar={githubCalendar} username={profile.githubUsername} />
                            ) : (
                                <div className="folio-card rounded-xl border p-8 text-center">
                                    <p className="folio-muted text-sm">Could not load GitHub contributions right now.</p>
                                </div>
                            )
                        ) : !profile.githubUsername && isOwner ? (
                            <div className="folio-card rounded-xl border border-dashed p-8 text-center">
                                <p className="folio-muted text-sm">Connect GitHub to display your contribution board.</p>
                                <button
                                    type="button"
                                    onClick={onConnectGithub}
                                    className="folio-btn-ghost folio-mono mt-4 cursor-pointer rounded-lg border px-5 py-2 text-sm"
                                >
                                    Connect GitHub
                                </button>
                            </div>
                        ) : (profile.showGithubContributions === false || githubHidden) && isOwner ? (
                            <div className="folio-card flex flex-col gap-4 rounded-xl border p-6 sm:flex-row sm:items-center sm:justify-between">
                                <p className="folio-muted text-sm">Your GitHub contribution board is hidden from visitors.</p>
                                <button
                                    type="button"
                                    onClick={onShowGithub}
                                    className="folio-btn-ghost folio-mono cursor-pointer rounded-lg border px-4 py-2 text-sm"
                                >
                                    Show GitHub
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {isOwner && showGithubBoard && (
                        <div className="mt-3 text-right">
                            <button
                                type="button"
                                onClick={onHideGithub}
                                className="folio-link folio-mono cursor-pointer text-xs"
                            >
                                Hide GitHub board
                            </button>
                        </div>
                    )}
                </section>

                <footer className="folio-divider flex flex-col items-center justify-between gap-3 border-t pt-8 sm:flex-row">
                    <p className="folio-muted folio-mono text-xs">© {new Date().getFullYear()} {profile.username} · built on Infinwork</p>
                    <Link href="/profiles" className="folio-link folio-mono text-xs">
                        Discover more builders →
                    </Link>
                </footer>
            </div>
        </div>
    );
}
