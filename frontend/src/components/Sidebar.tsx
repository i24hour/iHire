'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

const navItems = [
    { href: '/itime', label: 'iTime' },
    { href: '/workers', label: 'WOrKers' },
    { href: '/info', label: 'Info' },
];

interface Idea {
    _id: string;
    title: string;
    details: string;
    isPublic: boolean;
    createdBy: string;
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);

    // Ideas state
    const [ideasOpen, setIdeasOpen] = useState(false);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [ideasLoading, setIdeasLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [ideaTitle, setIdeaTitle] = useState('');
    const [ideaDetails, setIdeaDetails] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (ideasOpen && ideas.length === 0) {
            fetchIdeas();
        }
    }, [ideasOpen]);

    useEffect(() => {
        if (formOpen) {
            setTimeout(() => titleRef.current?.focus(), 80);
        }
    }, [formOpen]);

    const fetchIdeas = async () => {
        setIdeasLoading(true);
        try {
            const res = await fetch('/api/ideas');
            const data = await res.json();
            if (data.ideas) setIdeas(data.ideas);
        } catch (err) {
            console.error('Failed to fetch ideas:', err);
        } finally {
            setIdeasLoading(false);
        }
    };

    const handleSaveIdea = async () => {
        if (!ideaTitle.trim() || saving) return;
        setSaving(true);
        try {
            const res = await fetch('/api/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: ideaTitle.trim(), details: ideaDetails.trim(), isPublic }),
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setIdeas(prev => [data.idea, ...prev]);
            setIdeaTitle('');
            setIdeaDetails('');
            setIsPublic(true);
            setFormOpen(false);
        } catch (err) {
            console.error('Failed to save idea:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleVisibility = async (idea: Idea) => {
        if (togglingId) return;
        setTogglingId(idea._id);
        // Optimistic update
        setIdeas(prev => prev.map(i => i._id === idea._id ? { ...i, isPublic: !i.isPublic } : i));
        try {
            const res = await fetch(`/api/ideas/${idea._id}`, { method: 'PATCH' });
            if (!res.ok) {
                // Revert
                setIdeas(prev => prev.map(i => i._id === idea._id ? { ...i, isPublic: idea.isPublic } : i));
            }
        } catch {
            setIdeas(prev => prev.map(i => i._id === idea._id ? { ...i, isPublic: idea.isPublic } : i));
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteIdea = async (ideaId: string) => {
        setIdeas(prev => prev.filter(i => i._id !== ideaId));
        try {
            await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' });
        } catch {
            fetchIdeas();
        }
    };

    const myEmail = session?.user?.email;

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-white/10 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-1">
                    <span className="text-xl font-semibold text-white tracking-tight">infinW</span>
                    <div className="animate-spin-slow rounded-full h-5 w-5 border-t-2 border-b-2 border-white mt-0.5"></div>
                    <span className="text-xl font-semibold text-white tracking-tight">rK</span>
                </div>
                <button onClick={() => setIsOpen(true)} className="p-2 -mr-2 text-zinc-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div className="md:hidden fixed inset-0 bg-black/80 z-[60]" onClick={() => setIsOpen(false)} />
            )}

            <aside className={`fixed md:relative top-0 left-0 z-[70] h-[100dvh] w-64 bg-black border-r border-white/10 p-6 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                {/* Close Button Mobile */}
                <button onClick={() => setIsOpen(false)} className="md:hidden absolute top-4 right-4 text-zinc-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Logo */}
                <div className="mb-8 flex items-center gap-1">
                    <span className="text-2xl font-semibold text-white tracking-tight">infinW</span>
                    <div className="animate-spin-slow rounded-full h-6 w-6 border-t-2 border-b-2 border-white mt-0.5"></div>
                    <span className="text-2xl font-semibold text-white tracking-tight">rK</span>
                </div>

                {/* Nav + Ideas — scrollable middle */}
                <div className="flex-1 overflow-y-auto flex flex-col min-h-0 gap-4">

                    {/* Main Nav */}
                    <nav className="space-y-4 w-full">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <LiquidButton
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className={`w-full justify-start text-left px-5 py-3 rounded-full transition-all duration-300 ${isActive
                                        ? 'shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/20 text-white bg-white/5'
                                        : 'text-zinc-400 border border-transparent hover:text-white hover:bg-black'
                                        }`}
                                    variant="default"
                                >
                                    <span className="font-medium text-sm flex-1">{item.label}</span>
                                </LiquidButton>
                            );
                        })}

                        {/* Ideas Button — same style as nav items */}
                        <LiquidButton
                            onClick={() => setIdeasOpen(prev => !prev)}
                            className={`w-full justify-start text-left px-5 py-3 rounded-full transition-all duration-300 ${ideasOpen
                                ? 'shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/20 text-white bg-white/5'
                                : 'text-zinc-400 border border-transparent hover:text-white hover:bg-black'
                                }`}
                            variant="default"
                        >
                            <span className="font-medium text-sm flex-1">Ideas</span>
                            <span className={`text-xs transition-transform duration-200 ${ideasOpen ? 'rotate-180' : ''}`}>▾</span>
                        </LiquidButton>
                    </nav>

                    {/* Ideas Panel — slides open below the button */}
                    <AnimatePresence initial={false}>
                        {ideasOpen && (
                            <motion.div
                                key="ideas-panel"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 flex flex-col gap-2">

                                    {/* Panel Header */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Ideas</span>
                                        {session && (
                                            <button
                                                onClick={() => setFormOpen(p => !p)}
                                                className="w-5 h-5 rounded-md bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center text-xs leading-none"
                                            >
                                                {formOpen ? '×' : '+'}
                                            </button>
                                        )}
                                    </div>

                                    {/* New Idea Form */}
                                    <AnimatePresence>
                                        {formOpen && session && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.15 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex flex-col gap-2 pb-3 border-b border-white/10 mb-1">
                                                    <input
                                                        ref={titleRef}
                                                        type="text"
                                                        value={ideaTitle}
                                                        onChange={e => setIdeaTitle(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSaveIdea()}
                                                        placeholder="Idea title..."
                                                        maxLength={80}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/25 transition-colors"
                                                    />
                                                    <textarea
                                                        value={ideaDetails}
                                                        onChange={e => setIdeaDetails(e.target.value)}
                                                        placeholder="Details, context, links..."
                                                        rows={2}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/25 transition-colors resize-none"
                                                    />
                                                    <div className="flex items-center justify-between">
                                                        <button
                                                            onClick={() => setIsPublic(p => !p)}
                                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border transition-all duration-200 ${isPublic
                                                                ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
                                                                : 'bg-white/5 border-white/10 text-zinc-500'
                                                                }`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isPublic ? 'bg-[#4CAF50]' : 'bg-zinc-600'}`} />
                                                            {isPublic ? 'Public' : 'Private'}
                                                        </button>
                                                        <button
                                                            onClick={handleSaveIdea}
                                                            disabled={!ideaTitle.trim() || saving}
                                                            className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            {saving ? 'Saving...' : 'Save'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Ideas List */}
                                    {ideasLoading ? (
                                        <div className="flex justify-center py-3">
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white/30" />
                                        </div>
                                    ) : ideas.length === 0 ? (
                                        <p className="text-[11px] text-zinc-600 text-center py-2">
                                            {session ? 'No ideas yet. Hit + to add one.' : 'Sign in to add ideas.'}
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                                            <AnimatePresence initial={false}>
                                                {ideas.map(idea => {
                                                    const isOwner = myEmail === idea.createdBy;
                                                    return (
                                                        <motion.div
                                                            key={idea._id}
                                                            initial={{ opacity: 0, y: -4 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, x: -8 }}
                                                            transition={{ duration: 0.12 }}
                                                            className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-xl p-2.5 transition-all"
                                                        >
                                                            <div className="flex items-start justify-between gap-1.5 mb-1">
                                                                <p className="text-xs font-medium text-zinc-200 flex-1 leading-snug break-words">{idea.title}</p>
                                                                <button
                                                                    onClick={() => isOwner && handleToggleVisibility(idea)}
                                                                    disabled={!isOwner || togglingId === idea._id}
                                                                    title={isOwner ? `Make ${idea.isPublic ? 'private' : 'public'}` : undefined}
                                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border flex-shrink-0 transition-all duration-200 ${idea.isPublic
                                                                        ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
                                                                        : 'bg-white/5 border-white/10 text-zinc-500'
                                                                        } ${isOwner ? 'cursor-pointer hover:opacity-75' : 'cursor-default'} ${togglingId === idea._id ? 'opacity-40' : ''}`}
                                                                >
                                                                    <span className={`w-1 h-1 rounded-full ${idea.isPublic ? 'bg-[#4CAF50]' : 'bg-zinc-600'}`} />
                                                                    {idea.isPublic ? 'Public' : 'Private'}
                                                                </button>
                                                            </div>
                                                            {idea.details && (
                                                                <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2 break-words">{idea.details}</p>
                                                            )}
                                                            <div className="flex items-center justify-between mt-1.5">
                                                                <span className="text-[9px] text-zinc-700">{idea.createdBy.split('@')[0].slice(0, 3)}••••</span>
                                                                {isOwner && (
                                                                    <button
                                                                        onClick={() => handleDeleteIdea(idea._id)}
                                                                        className="text-[9px] text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Quick Stats */}
                    <div className="p-4 bg-black rounded-lg border border-white/10">
                        <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">Quick Stats</h3>
                        <div className="space-y-2.5">
                            <div className="flex justify-between">
                                <span className="text-zinc-500 text-sm">Total Candidates</span>
                                <span className="text-zinc-300 font-medium text-sm">--</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500 text-sm">Strong Yes</span>
                                <span className="text-white font-medium text-sm">--</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Info */}
                <div className="mt-6 pt-6 border-t border-white/10">
                    {status === 'loading' ? (
                        <div className="animate-pulse bg-white/5 h-10 w-full rounded-lg"></div>
                    ) : session ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {session.user?.image ? (
                                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-white/10 shrink-0" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white shrink-0">
                                        {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                                    </div>
                                )}
                                <div className="truncate pr-2">
                                    <div className="text-sm font-medium text-white truncate">{session.user?.name || 'User'}</div>
                                    <div className="text-xs text-zinc-500 truncate">{session.user?.email}</div>
                                </div>
                            </div>
                            <button onClick={() => signOut()} className="p-2 text-zinc-500 hover:text-white transition-colors shrink-0" title="Sign Out">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <LiquidButton onClick={() => signIn('google')} className="w-full text-xs py-2 content-center text-center font-semibold text-white justify-center flex">
                            Sign In
                        </LiquidButton>
                    )}
                </div>
            </aside>
        </>
    );
}
