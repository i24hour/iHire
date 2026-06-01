'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import type { ProfileProject, PublicProfile } from '@/types/profile';

const emptyProject = (): ProfileProject => ({
    title: '',
    description: '',
    siteUrl: '',
    githubUrl: '',
    technologies: [],
});

const inputClass =
    'w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all';

const cardClass = 'bg-black border border-white/10 rounded-2xl p-6 md:p-8 space-y-4';

export default function ProfileEditorPage() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [headline, setHeadline] = useState('');
    const [bio, setBio] = useState('');
    const [projects, setProjects] = useState<ProfileProject[]>([]);
    const [showGithubContributions, setShowGithubContributions] = useState(true);
    const [techInputs, setTechInputs] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

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
        if (session) fetchProfile();
        else setLoading(false);
    }, [session, fetchProfile]);

    const updateProject = (index: number, patch: Partial<ProfileProject>) => {
        setProjects((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    };

    const addProject = () => setProjects((prev) => [...prev, emptyProject()]);

    const removeProject = (index: number) => {
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
        const techs = raw.split(',').map((t) => t.trim()).filter(Boolean);
        updateProject(index, {
            technologies: [...new Set([...(projects[index]?.technologies || []), ...techs])].slice(0, 8),
        });
        setTechInputs((prev) => ({ ...prev, [index]: '' }));
    };

    const removeTech = (projectIndex: number, tech: string) => {
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
            setMessage('Profile saved');
        } catch (err: unknown) {
            setMessage(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="flex min-h-screen bg-black">
                <Sidebar />
                <main className="flex flex-1 items-center justify-center pt-20 md:pt-0">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white/40" />
                </main>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex min-h-screen flex-col bg-black md:flex-row">
                <Sidebar />
                <main className="flex flex-1 flex-col items-center justify-center px-6 pt-20 text-center md:pt-8">
                    <h1 className="text-3xl font-bold text-white">Your builder profile</h1>
                    <p className="mt-3 max-w-md text-zinc-400">Sign in to add projects, site links, GitHub repos, and tech stack tags.</p>
                    <LiquidButton onClick={() => signIn('google')} className="mt-8 px-8 py-3 text-white">
                        Sign In to Continue
                    </LiquidButton>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-black md:flex-row">
            <Sidebar />
            <main className="flex-1 w-full max-w-4xl p-4 pt-20 md:p-8 md:pt-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Profile</h1>
                            <p className="text-zinc-400">Share what you build — sites, repos, and the tech behind them.</p>
                            {profile?.username && (
                                <Link href={`/profile/${profile.username}`} className="mt-2 inline-block text-sm text-blue-400 transition-colors hover:text-blue-300">
                                    View public profile →
                                </Link>
                            )}
                        </div>
                        <LiquidButton onClick={handleSave} disabled={saving} className="text-white">
                            {saving ? 'Saving…' : 'Save Profile'}
                        </LiquidButton>
                    </div>

                    {message && (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-500">
                            {message}
                        </div>
                    )}

                    <section className={cardClass}>
                        <h2 className="text-xl font-semibold text-white">About you</h2>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Headline</label>
                            <input
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                                placeholder="Full-stack builder · shipping fast"
                                maxLength={120}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="What you build, what you care about, what you're working on next."
                                maxLength={500}
                                rows={4}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                    </section>

                    <section className={cardClass}>
                        <h2 className="text-xl font-semibold text-white">GitHub on portfolio</h2>
                        <p className="text-sm text-zinc-400">
                            Show your GitHub contribution board on your public portfolio page.
                        </p>
                        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-black px-4 py-3">
                            <span className="text-sm text-zinc-300">Display GitHub contributions</span>
                            <input
                                type="checkbox"
                                checked={showGithubContributions}
                                onChange={(e) => setShowGithubContributions(e.target.checked)}
                                className="h-4 w-4 cursor-pointer accent-white"
                            />
                        </label>
                        <p className="text-xs text-zinc-500">
                            Connect GitHub from{' '}
                            <Link href="/settings" className="text-blue-400 hover:text-blue-300">
                                Settings
                            </Link>{' '}
                            if you have not linked your account yet.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Projects</h2>
                            <button
                                type="button"
                                onClick={addProject}
                                className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                            >
                                + Add project
                            </button>
                        </div>

                        {projects.length === 0 && (
                            <div className={`${cardClass} border-dashed text-center text-sm text-zinc-500`}>
                                No projects yet. Add a site, app, or GitHub repo you shipped.
                            </div>
                        )}

                        {projects.map((project, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cardClass}
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-white">Project {index + 1}</h3>
                                    <button
                                        type="button"
                                        onClick={() => removeProject(index)}
                                        className="cursor-pointer text-xs text-red-400 transition-colors hover:text-red-300"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <input
                                    value={project.title}
                                    onChange={(e) => updateProject(index, { title: e.target.value })}
                                    placeholder="Project name"
                                    className={inputClass}
                                />
                                <textarea
                                    value={project.description || ''}
                                    onChange={(e) => updateProject(index, { description: e.target.value })}
                                    placeholder="Short description"
                                    rows={2}
                                    className={`${inputClass} resize-none`}
                                />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <input
                                        value={project.siteUrl || ''}
                                        onChange={(e) => updateProject(index, { siteUrl: e.target.value })}
                                        placeholder="https://yoursite.com"
                                        className={inputClass}
                                    />
                                    <input
                                        value={project.githubUrl || ''}
                                        onChange={(e) => updateProject(index, { githubUrl: e.target.value })}
                                        placeholder="https://github.com/you/repo"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {(project.technologies || []).map((tech) => (
                                            <button
                                                key={tech}
                                                type="button"
                                                onClick={() => removeTech(index, tech)}
                                                className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-400/40 hover:text-red-300"
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
                                            placeholder="React, Next.js, TypeScript (comma separated)"
                                            className={`${inputClass} flex-1`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addTech(index)}
                                            className="cursor-pointer rounded-xl border border-white/10 px-4 text-sm text-zinc-400 transition-colors hover:text-white"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </section>
                </motion.div>
            </main>
        </div>
    );
}
