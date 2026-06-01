'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { FlowingBackground } from '@/components/profile/FlowingBackground';
import { ProjectCard } from '@/components/profile/ProfileShowcaseCard';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import type { PublicProfile } from '@/types/profile';

export default function PublicProfilePage() {
    const params = useParams();
    const username = decodeURIComponent(params.username as string);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/profiles/${encodeURIComponent(username)}`);
                if (res.status === 404) {
                    setNotFound(true);
                    return;
                }
                const data = await res.json();
                setProfile(data.profile);
            } catch (err) {
                console.error(err);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [username]);

    const initial = username.charAt(0).toUpperCase();

    return (
        <div className="relative flex min-h-screen overflow-hidden bg-black">
            <FlowingBackground />
            <Sidebar />
            <main className="relative z-10 flex-1 overflow-y-auto p-4 pt-20 md:p-8 md:pt-8">
                {loading ? (
                    <div className="flex min-h-[50vh] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white/40" />
                    </div>
                ) : notFound || !profile ? (
                    <div className="mx-auto max-w-lg py-20 text-center">
                        <h1 className="text-2xl font-bold text-white">Profile not found</h1>
                        <Link href="/" className="mt-6 inline-block">
                            <LiquidButton className="text-white">Back to profiles</LiquidButton>
                        </Link>
                    </div>
                ) : (
                    <div className="mx-auto max-w-4xl space-y-10 pb-20">
                        <Link href="/" className="inline-flex text-sm text-zinc-400 transition-colors hover:text-white">
                            ← All profiles
                        </Link>

                        <motion.section
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl"
                        >
                            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
                            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10">
                                    {profile.image ? (
                                        <img src={profile.image} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">{initial}</div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-3xl font-bold tracking-tight text-white">{profile.username}</h1>
                                    {profile.headline && <p className="mt-2 text-lg text-zinc-300">{profile.headline}</p>}
                                    {profile.githubUsername && (
                                        <a
                                            href={`https://github.com/${profile.githubUsername}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 inline-block cursor-pointer text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            github.com/{profile.githubUsername}
                                        </a>
                                    )}
                                    {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">{profile.bio}</p>}
                                </div>
                            </div>
                        </motion.section>

                        <section>
                            <h2 className="mb-5 text-xl font-semibold text-white">
                                Projects
                                <span className="ml-2 text-sm font-normal text-zinc-500">({profile.projects.length})</span>
                            </h2>
                            {profile.projects.length === 0 ? (
                                <p className="text-zinc-500">No projects shared yet.</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {profile.projects.map((project) => (
                                        <ProjectCard key={project._id || project.title} project={project} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
