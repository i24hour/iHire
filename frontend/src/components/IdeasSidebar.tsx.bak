'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Idea {
    _id: string;
    title: string;
    details: string;
    isPublic: boolean;
    createdBy: string;
    createdAt: string;
}

export function IdeasSidebar() {
    const { data: session } = useSession();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchIdeas();
    }, []);

    useEffect(() => {
        if (formOpen) {
            setTimeout(() => titleRef.current?.focus(), 50);
        }
    }, [formOpen]);

    const fetchIdeas = async () => {
        try {
            const res = await fetch('/api/ideas');
            const data = await res.json();
            if (data.ideas) setIdeas(data.ideas);
        } catch (err) {
            console.error('Failed to fetch ideas:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || saving) return;
        setSaving(true);
        try {
            const res = await fetch('/api/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim(), details: details.trim(), isPublic }),
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            // Prepend new idea to list
            setIdeas(prev => [data.idea, ...prev]);
            // Reset form
            setTitle('');
            setDetails('');
            setIsPublic(true);
            setFormOpen(false);
        } catch (err) {
            console.error('Failed to save idea:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleVisibility = async (idea: Idea) => {
        // Optimistic update
        if (togglingId) return;
        setTogglingId(idea._id);
        setIdeas(prev =>
            prev.map(i => i._id === idea._id ? { ...i, isPublic: !i.isPublic } : i)
        );
        try {
            const res = await fetch(`/api/ideas/${idea._id}`, { method: 'PATCH' });
            if (!res.ok) {
                // Revert on failure
                setIdeas(prev =>
                    prev.map(i => i._id === idea._id ? { ...i, isPublic: idea.isPublic } : i)
                );
            }
        } catch {
            // Revert on error
            setIdeas(prev =>
                prev.map(i => i._id === idea._id ? { ...i, isPublic: idea.isPublic } : i)
            );
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (ideaId: string) => {
        setIdeas(prev => prev.filter(i => i._id !== ideaId));
        try {
            await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Failed to delete idea:', err);
            fetchIdeas(); // Refetch on error to sync state
        }
    };

    const myEmail = session?.user?.email;

    return (
        <div className="mt-4 border-t border-white/10 pt-4">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Ideas</h3>
                {session && (
                    <button
                        onClick={() => setFormOpen(prev => !prev)}
                        className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center text-sm leading-none"
                        title={formOpen ? 'Close' : 'New idea'}
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
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col gap-2 mb-3 pb-3 border-b border-white/10">
                            <input
                                ref={titleRef}
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()}
                                placeholder="Idea title..."
                                maxLength={80}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25 transition-colors"
                            />
                            <textarea
                                value={details}
                                onChange={e => setDetails(e.target.value)}
                                placeholder="Details, context, links..."
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25 transition-colors resize-none"
                            />
                            <div className="flex items-center justify-between">
                                {/* Visibility toggle pill */}
                                <button
                                    onClick={() => setIsPublic(prev => !prev)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 ${
                                        isPublic
                                            ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
                                            : 'bg-white/5 border-white/10 text-zinc-500'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPublic ? 'bg-[#4CAF50]' : 'bg-zinc-600'}`} />
                                    {isPublic ? 'Public' : 'Private'}
                                </button>

                                <button
                                    onClick={handleSave}
                                    disabled={!title.trim() || saving}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ideas List */}
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white/30" />
                    </div>
                ) : ideas.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center py-3">
                        {session ? 'No ideas yet. Hit + to add one.' : 'Sign in to add ideas.'}
                    </p>
                ) : (
                    <AnimatePresence initial={false}>
                        {ideas.map(idea => {
                            const isOwner = myEmail === idea.createdBy;
                            return (
                                <motion.div
                                    key={idea._id}
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.12] rounded-xl p-3 transition-all"
                                >
                                    {/* Top row: title + visibility badge */}
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-sm font-medium text-zinc-200 leading-snug flex-1 min-w-0 break-words">
                                            {idea.title}
                                        </p>
                                        {/* Visibility badge — clickable only if owner */}
                                        <button
                                            onClick={() => isOwner && handleToggleVisibility(idea)}
                                            disabled={!isOwner || togglingId === idea._id}
                                            title={isOwner ? `Click to make ${idea.isPublic ? 'private' : 'public'}` : idea.isPublic ? 'Public' : 'Private'}
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 transition-all duration-200 ${
                                                idea.isPublic
                                                    ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
                                                    : 'bg-white/5 border-white/10 text-zinc-500'
                                            } ${isOwner ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${togglingId === idea._id ? 'opacity-50' : ''}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${idea.isPublic ? 'bg-[#4CAF50]' : 'bg-zinc-600'}`} />
                                            {idea.isPublic ? 'Public' : 'Private'}
                                        </button>
                                    </div>

                                    {/* Details */}
                                    {idea.details && (
                                        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 break-words">
                                            {idea.details}
                                        </p>
                                    )}

                                    {/* Footer: author + delete */}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-zinc-600">
                                            {idea.createdBy.split('@')[0].slice(0, 3)}••••
                                        </span>
                                        {isOwner && (
                                            <button
                                                onClick={() => handleDelete(idea._id)}
                                                className="text-[10px] text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete idea"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
