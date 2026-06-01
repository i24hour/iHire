'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FlowingBackground } from '@/components/profile/FlowingBackground';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import type { ProfileProject, PublicProfile } from '@/types/profile';
import { cn } from '@/lib/utils';

const emptyProject = (): ProfileProject => ({
    title: '',
    description: '',
    siteUrl: '',
    githubUrl: '',
    technologies: [],
});

interface ProfileBuilderProps {
    sessionImage?: string | null;
    sessionName?: string | null;
}

export function ProfileBuilder({ sessionImage, sessionName }: ProfileBuilderProps) {
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [headline, setHeadline] = useState('');
    const [bio, setBio] = useState('');
    const [projects, setProjects] = useState<ProfileProject[]>([]);
    const [showGithubContributions, setShowGithubContributions] = useState(true);
    const [techInputs, setTechInputs] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [dirty, setDirty] = useState(false);

    const markDirty = () => setDirty(true);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/profile');
            if (!res.ok) throw new Error('Failed to load profile');
            const data = await res.json();
            const p = data.profile as PublicProfile | null;
            setProfile(p);
            setHeadline(p?.headline || '');
            setBio(p?.bio || '');
            setProjects(p?.projects?.length ? p.projects : []);
            setShowGithubContributions(p?.showGithubContributions !== false);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateProject = (index: number, patch: Partial<ProfileProject>) => {
        markDirty();
        setProjects((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    };

    const addProject = () => {
        markDirty();
        setProjects((prev) => [...prev, emptyProject()]);
    };

    const removeProject = (index: number) => {
        markDirty();
        setProjects((prev) => prev.filter((_, i) => i !== index));
        setTechInputs((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const addTech = (index: number) => {
        const raw = techInputs[index]?.trim();
        if (!raw) return;
        markDirty();
        const techs = raw.split(',').map((t) => t.trim()).filter(Boolean);
        updateProject(index, {
            technologies: [...new Set([...(projects[index]?.technologies || []), ...techs])].slice(0, 8),
        });
        setTechInputs((prev) => ({ ...prev, [index]: '' }));
    };

    const removeTech = (projectIndex: number, tech: string) => {
        markDirty();
        updateProject(projectIndex, {
            technologies: (projects[projectIndex]?.technologies || []).filter((t) => t !== tech),
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ headline, bio, projects, showGithubContributions }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            setProfile(data.profile);
            setProjects(data.profile?.projects || []);
            setDirty(false);
            setMessage('Portfolio saved');
            setTimeout(() => setMessage(''), 3000);
        } catch (err: unknown) {
            setMessage(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const displayName = profile?.username || sessionName || 'builder';
    const avatar = profile?.image || sessionImage;
    const initial = displayName.charAt(0).toUpperCase();

    if (loading) {
        return (
            <div className="profile-builder relative flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white/40" />
            </div>
        );
    }

    return (
        <div className="profile-builder relative min-h-full overflow-hidden">
            <FlowingBackground />

            <div className="relative z-10 mx-auto max-w-5xl space-y-10 pb-28 pt-2">
                {/* Top actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="profile-kicker text-xs uppercase tracking-[0.25em]">Live portfolio</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Build in motion</h1>
                        <p className="mt-1 text-sm profile-muted">Edit below — visitors see this layout on your public page.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {profile?.username && (
                            <Link
                                href={`/profile/${profile.username}`}
                                className="profile-link cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors"
                            >
                                Preview live →
                            </Link>
                        )}
                        <LiquidButton
                            onClick={handleSave}
                            disabled={saving}
                            className={cn('px-5 py-2.5 text-sm', dirty && 'ring-2 ring-blue-500/40')}
                        >
                            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                        </LiquidButton>
                    </div>
                </div>

                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="profile-toast rounded-xl border px-4 py-3 text-sm"
                        >
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hero — live preview shell */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="profile-glass-hero relative overflow-hidden rounded-3xl border p-8 backdrop-blur-2xl md:p-12"
                >
                    <div className="profile-hero-grid pointer-events-none absolute inset-0 opacity-40" />
                    <div className="relative flex flex-col gap-8 md:flex-row md:items-start">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="profile-avatar h-24 w-24 shrink-0 overflow-hidden rounded-2xl border md:h-28 md:w-28"
                        >
                            {avatar ? (
                                <img src={avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-3xl font-bold">{initial}</div>
                            )}
                        </motion.div>
                        <div className="min-w-0 flex-1 space-y-4">
                            <p className="text-xs uppercase tracking-widest profile-muted">@{displayName}</p>
                            <input
                                value={headline}
                                onChange={(e) => { setHeadline(e.target.value); markDirty(); }}
                                placeholder="Full-stack builder · shipping fast"
                                maxLength={120}
                                className="profile-hero-headline w-full bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:opacity-40 md:text-4xl md:leading-tight"
                            />
                            <textarea
                                value={bio}
                                onChange={(e) => { setBio(e.target.value); markDirty(); }}
                                placeholder="What you build, what you care about, what you're working on next."
                                maxLength={500}
                                rows={3}
                                className="profile-hero-bio w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-40 md:text-base"
                            />
                            {profile?.githubUsername && (
                                <p className="text-xs profile-muted">GitHub · @{profile.githubUsername}</p>
                            )}
                        </div>
                    </div>
                </motion.section>

                {/* Stats preview strip */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                        { label: 'Projects', value: projects.filter((p) => p.title.trim()).length },
                        { label: 'Tech tags', value: projects.reduce((n, p) => n + (p.technologies?.length || 0), 0) },
                        { label: 'Points', value: profile?.points ?? 0 },
                        { label: 'Repos linked', value: projects.filter((p) => p.githubUrl?.trim()).length },
                    ].map((stat) => (
                        <div key={stat.label} className="profile-stat rounded-2xl border p-4 backdrop-blur-xl">
                            <p className="text-[10px] uppercase tracking-widest profile-muted">{stat.label}</p>
                            <p className="mt-1 text-xl font-semibold">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Projects — flowing grid */}
                <section className="space-y-6">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-widest profile-muted">Featured work</p>
                            <h2 className="text-xl font-semibold md:text-2xl">Projects</h2>
                        </div>
                        <button
                            type="button"
                            onClick={addProject}
                            className="profile-add-btn cursor-pointer rounded-full border px-4 py-2 text-sm transition-all hover:scale-[1.02]"
                        >
                            + Add project
                        </button>
                    </div>

                    {projects.length === 0 ? (
                        <button
                            type="button"
                            onClick={addProject}
                            className="profile-empty w-full cursor-pointer rounded-3xl border border-dashed p-12 text-center transition-colors"
                        >
                            <p className="text-base font-medium">No projects yet</p>
                            <p className="mt-2 text-sm profile-muted">Add a site, app, or GitHub repo you shipped.</p>
                            <span className="profile-add-inline mt-4 inline-block rounded-full border px-5 py-2 text-sm">+ Add your first project</span>
                        </button>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                            <AnimatePresence mode="popLayout">
                                {projects.map((project, index) => (
                                    <motion.div
                                        key={index}
                                        layout
                                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ duration: 0.35, ease: 'easeOut' }}
                                        className="profile-glass-card group relative overflow-hidden rounded-2xl border p-6 backdrop-blur-xl"
                                    >
                                        <div className="profile-card-glow pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl" />
                                        <div className="relative space-y-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <input
                                                    value={project.title}
                                                    onChange={(e) => updateProject(index, { title: e.target.value })}
                                                    placeholder="Project name"
                                                    className="profile-field-title w-full bg-transparent text-lg font-semibold outline-none placeholder:opacity-40"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeProject(index)}
                                                    className="cursor-pointer shrink-0 text-xs opacity-50 transition-opacity hover:opacity-100"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <textarea
                                                value={project.description || ''}
                                                onChange={(e) => updateProject(index, { description: e.target.value })}
                                                placeholder="Short description"
                                                rows={2}
                                                className="profile-field-body w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-40"
                                            />
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <input
                                                    value={project.siteUrl || ''}
                                                    onChange={(e) => updateProject(index, { siteUrl: e.target.value })}
                                                    placeholder="https://yoursite.com"
                                                    className="profile-field-input rounded-xl border px-3 py-2 text-xs outline-none"
                                                />
                                                <input
                                                    value={project.githubUrl || ''}
                                                    onChange={(e) => updateProject(index, { githubUrl: e.target.value })}
                                                    placeholder="github.com/you/repo"
                                                    className="profile-field-input rounded-xl border px-3 py-2 text-xs outline-none"
                                                />
                                            </div>
                                            <div>
                                                <div className="mb-2 flex flex-wrap gap-1.5">
                                                    {(project.technologies || []).map((tech) => (
                                                        <button
                                                            key={tech}
                                                            type="button"
                                                            onClick={() => removeTech(index, tech)}
                                                            className="profile-tech-tag cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] transition-colors"
                                                        >
                                                            {tech} ×
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={techInputs[index] || ''}
                                                        onChange={(e) => setTechInputs((prev) => ({ ...prev, [index]: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech(index))}
                                                        placeholder="React, Next.js…"
                                                        className="profile-field-input min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => addTech(index)}
                                                        className="profile-add-btn shrink-0 cursor-pointer rounded-xl border px-3 text-xs transition-colors"
                                                    >
                                                        Tag
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </section>

                {/* GitHub board toggle */}
                <section className="profile-glass-card rounded-2xl border p-6 backdrop-blur-xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-widest profile-muted">GitHub board</p>
                            <p className="mt-1 text-sm profile-muted">Show contribution heatmap on your public portfolio.</p>
                        </div>
                        <label className="flex cursor-pointer items-center gap-3">
                            <span className="text-sm">Display on portfolio</span>
                            <input
                                type="checkbox"
                                checked={showGithubContributions}
                                onChange={(e) => { setShowGithubContributions(e.target.checked); markDirty(); }}
                                className="h-4 w-4 cursor-pointer accent-blue-500"
                            />
                        </label>
                    </div>
                    <p className="mt-3 text-xs profile-muted">
                        Connect GitHub from{' '}
                        <Link href="/settings" className="profile-link underline-offset-2 hover:underline">
                            Settings
                        </Link>{' '}
                        if not linked yet.
                    </p>
                </section>
            </div>

            {/* Sticky save bar on mobile */}
            {dirty && (
                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="profile-sticky-save fixed bottom-6 left-1/2 z-50 -translate-x-1/2 md:hidden"
                >
                    <LiquidButton onClick={handleSave} disabled={saving} className="px-6 py-3 text-sm shadow-lg">
                        {saving ? 'Saving…' : 'Save portfolio'}
                    </LiquidButton>
                </motion.div>
            )}
        </div>
    );
}
