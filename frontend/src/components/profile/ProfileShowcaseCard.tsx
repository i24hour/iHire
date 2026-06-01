'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ProfileProject, PublicProfile } from '@/types/profile';
import { cn } from '@/lib/utils';

function LinkIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    );
}

function GithubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
    );
}

function TechTags({ technologies, compact }: { technologies: string[]; compact?: boolean }) {
    if (!technologies.length) return null;

    return (
        <div className={cn('flex flex-wrap gap-1.5', compact ? 'mt-2' : 'mt-3')}>
            {technologies.slice(0, compact ? 4 : 8).map((tech) => (
                <span
                    key={tech}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300"
                >
                    {tech}
                </span>
            ))}
        </div>
    );
}

function ProjectPreview({ project }: { project: ProfileProject }) {
    return (
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-colors duration-200 hover:border-white/15 hover:bg-white/[0.05]">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{project.title}</p>
                    {project.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{project.description}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {project.siteUrl && (
                        <a
                            href={project.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label={`Open ${project.title} site`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <LinkIcon className="h-3.5 w-3.5" />
                        </a>
                    )}
                    {project.githubUrl && (
                        <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label={`Open ${project.title} on GitHub`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GithubIcon className="h-3.5 w-3.5" />
                        </a>
                    )}
                </div>
            </div>
            <TechTags technologies={project.technologies} compact />
        </div>
    );
}

interface ProfileShowcaseCardProps {
    profile: PublicProfile;
    index?: number;
}

export function ProfileShowcaseCard({ profile, index = 0 }: ProfileShowcaseCardProps) {
    const initial = profile.username.charAt(0).toUpperCase();
    const previewProjects = profile.projects.slice(0, 2);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
        >
            <Link href={`/profile/${profile.username}`} className="group block cursor-pointer">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_20px_60px_-20px_rgba(59,130,246,0.35)]">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-60" />

                    <div className="relative flex items-start gap-4">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10 ring-1 ring-white/10">
                            {profile.image ? (
                                <img src={profile.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">{initial}</div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="truncate text-lg font-semibold text-white transition-colors group-hover:text-blue-100">
                                {profile.username}
                            </h3>
                            {profile.headline && (
                                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{profile.headline}</p>
                            )}
                            {profile.githubUsername && (
                                <p className="mt-1 text-xs text-zinc-500">@{profile.githubUsername}</p>
                            )}
                        </div>
                    </div>

                    {profile.bio && (
                        <p className="relative mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">{profile.bio}</p>
                    )}

                    {previewProjects.length > 0 && (
                        <div className="relative mt-5 space-y-2">
                            {previewProjects.map((project) => (
                                <ProjectPreview key={project._id || project.title} project={project} />
                            ))}
                            {profile.projects.length > 2 && (
                                <p className="text-xs text-zinc-500">+{profile.projects.length - 2} more projects</p>
                            )}
                        </div>
                    )}

                    <div className="relative mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                        <span className="text-xs uppercase tracking-widest text-zinc-500">
                            {profile.projects.length} project{profile.projects.length === 1 ? '' : 's'}
                        </span>
                        <span className="text-xs font-medium text-zinc-300 transition-colors group-hover:text-white">
                            View profile →
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

export function ProjectCard({ project }: { project: ProfileProject }) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-black"
        >
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                        {project.description && (
                            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{project.description}</p>
                        )}
                    </div>
                </div>
                <TechTags technologies={project.technologies} />
                <div className="mt-4 flex flex-wrap gap-2">
                    {project.siteUrl && (
                        <a
                            href={project.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                        >
                            <LinkIcon className="h-3.5 w-3.5" />
                            Live site
                        </a>
                    )}
                    {project.githubUrl && (
                        <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                        >
                            <GithubIcon className="h-3.5 w-3.5" />
                            GitHub repo
                        </a>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
