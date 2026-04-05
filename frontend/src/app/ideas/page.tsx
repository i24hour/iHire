'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
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

interface Reply {
    _id: string;
    ideaId: string;
    content: string;
    createdBy: string;
    username?: string;
    isPublic: boolean;
    imageUrl?: string;
    createdAt: string;
}

const MAX_REPLY_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_REPLY_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
]);

export default function IdeasPage() {
    const { data: session } = useSession();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'mine' | 'public'>('all');
    const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [newReply, setNewReply] = useState('');
    const [replyIsPublic, setReplyIsPublic] = useState(true);
    const [sendingReply, setSendingReply] = useState(false);
    const [replyImage, setReplyImage] = useState<string | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchIdeas();
    }, []);

    useEffect(() => {
        if (formOpen) setTimeout(() => titleRef.current?.focus(), 60);
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

    const fetchReplies = async (ideaId: string) => {
        setLoadingReplies(true);
        try {
            const res = await fetch(`/api/ideas/${ideaId}/replies`);
            const data = await res.json();
            if (data.replies) setReplies(data.replies);
        } catch (err) {
            console.error('Failed to fetch replies:', err);
        } finally {
            setLoadingReplies(false);
        }
    };

    const resetReplyComposer = () => {
        setNewReply('');
        setReplyImage(null);
        setReplyIsPublic(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_REPLY_IMAGE_TYPES.has(file.type)) {
            alert('Only PNG, JPG, WEBP, and GIF images are supported');
            e.target.value = '';
            return;
        }

        if (file.size > MAX_REPLY_IMAGE_BYTES) {
            alert('Image too large (max 2MB)');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => {
            alert('Failed to read the selected image');
            setReplyImage(null);
        };
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setReplyImage(reader.result);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleSendReply = async () => {
        const trimmedReply = newReply.trim();
        if ((!trimmedReply && !replyImage) || !selectedIdeaId || sendingReply) return;

        setSendingReply(true);
        try {
            const res = await fetch(`/api/ideas/${selectedIdeaId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: trimmedReply,
                    isPublic: replyIsPublic,
                    imageUrl: replyImage
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Failed to send reply');
            }

            // Fetch updated list of replies to include the new one (and its correct formatting/username)
            await fetchReplies(selectedIdeaId);
            resetReplyComposer();
        } catch (err) {
            console.error('Failed to send reply:', err);
            alert(err instanceof Error ? err.message : 'Failed to send reply');
        } finally {
            setSendingReply(false);
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
            setIdeas(prev => [data.idea, ...prev]);
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
        if (togglingId) return;
        setTogglingId(idea._id);
        setIdeas(prev => prev.map(i => i._id === idea._id ? { ...i, isPublic: !i.isPublic } : i));
        try {
            const res = await fetch(`/api/ideas/${idea._id}`, { method: 'PATCH' });
            if (!res.ok) setIdeas(prev => prev.map(i => i._id === idea._id ? { ...i, isPublic: idea.isPublic } : i));
        } catch {
            setIdeas(prev => prev.map(i => i._id === idea._id ? { ...i, isPublic: idea.isPublic } : i));
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (ideaId: string) => {
        setIdeas(prev => prev.filter(i => i._id !== ideaId));
        try {
            await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' });
        } catch {
            fetchIdeas();
        }
    };

    const closeReplyModal = () => {
        setSelectedIdeaId(null);
        resetReplyComposer();
    };

    const myEmail = session?.user?.email;

    const filteredIdeas = ideas.filter(idea => {
        if (filter === 'mine') return idea.createdBy === myEmail;
        if (filter === 'public') return idea.isPublic;
        return true;
    });

    const myIdeasCount = ideas.filter(i => i.createdBy === myEmail).length;
    const publicCount = ideas.filter(i => i.isPublic).length;
    const privateCount = ideas.filter(i => !i.isPublic && i.createdBy === myEmail).length;

    const selectedIdea = ideas.find(i => i._id === selectedIdeaId);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
                <div className="space-y-8 max-w-4xl">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Ideas</h1>
                            <p className="text-zinc-400">Capture, share, and track your ideas.</p>
                        </div>
                        {session && (
                            <LiquidButton
                                onClick={() => setFormOpen(prev => !prev)}
                                className="text-white self-start sm:self-auto"
                            >
                                {formOpen ? '✕ Cancel' : '+ New Idea'}
                            </LiquidButton>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-black border border-white/10 rounded-2xl p-5">
                            <p className="text-sm text-zinc-400 mb-1">Total Ideas</p>
                            <p className="text-3xl font-bold text-white">{ideas.length}</p>
                        </div>
                        <div className="bg-black border border-white/10 rounded-2xl p-5">
                            <p className="text-sm text-zinc-400 mb-1">Public</p>
                            <p className="text-3xl font-bold text-[#4CAF50]">{publicCount}</p>
                        </div>
                        <div className="bg-black border border-white/10 rounded-2xl p-5">
                            <p className="text-sm text-zinc-400 mb-1">My Private</p>
                            <p className="text-3xl font-bold text-zinc-400">{privateCount}</p>
                        </div>
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
                                <div className="bg-black border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                                    <h2 className="text-lg font-semibold text-white">New Idea</h2>
                                    <input
                                        ref={titleRef}
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()}
                                        placeholder="Idea title..."
                                        maxLength={100}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25 transition-colors"
                                    />
                                    <textarea
                                        value={details}
                                        onChange={e => setDetails(e.target.value)}
                                        placeholder="Details, context, links... (optional)"
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25 transition-colors resize-none"
                                    />
                                    <div className="flex items-center justify-between">
                                        {/* Visibility toggle */}
                                        <button
                                            onClick={() => setIsPublic(p => !p)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                                                isPublic
                                                    ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
                                                    : 'bg-white/5 border-white/10 text-zinc-400'
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${isPublic ? 'bg-[#4CAF50]' : 'bg-zinc-600'}`} />
                                            {isPublic ? 'Public' : 'Private'}
                                        </button>
                                        <LiquidButton
                                            onClick={handleSave}
                                            disabled={!title.trim() || saving}
                                            className="text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {saving ? 'Saving...' : 'Save Idea'}
                                        </LiquidButton>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Filter Tabs */}
                    <div className="flex gap-2">
                        {(['all', 'mine', 'public'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                    filter === f
                                        ? 'bg-white text-black border-white'
                                        : 'bg-transparent text-zinc-400 border-white/10 hover:border-white/25 hover:text-white'
                                }`}
                            >
                                {f === 'all' ? 'All' : f === 'mine' ? 'My Ideas' : 'Public'}
                            </button>
                        ))}
                    </div>

                    {/* Ideas List */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/40" />
                        </div>
                    ) : filteredIdeas.length === 0 ? (
                        <div className="text-center py-20 bg-black border border-white/10 rounded-2xl">
                            <div className="text-5xl mb-4">💡</div>
                            <p className="text-zinc-400 text-lg mb-1">No ideas yet</p>
                            <p className="text-zinc-600 text-sm">
                                {session ? 'Hit "+ New Idea" to add your first one.' : 'Sign in to add ideas.'}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <AnimatePresence initial={false}>
                                {filteredIdeas.map(idea => {
                                    const isOwner = myEmail === idea.createdBy;
                                    return (
                                        <motion.div
                                            key={idea._id}
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -12 }}
                                            transition={{ duration: 0.15 }}
                                            className="group bg-black border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all cursor-pointer"
                                            onClick={() => {
                                                setSelectedIdeaId(idea._id);
                                                resetReplyComposer();
                                                fetchReplies(idea._id);
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-semibold text-white leading-snug mb-1 break-words">
                                                        {idea.title}
                                                    </p>
                                                    {idea.details && (
                                                        <p className="text-sm text-zinc-500 leading-relaxed break-words">
                                                            {idea.details}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Right side: badge + actions */}
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    {/* Visibility badge — clickable for owner */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            isOwner && handleToggleVisibility(idea);
                                                        }}
                                                        disabled={!isOwner || togglingId === idea._id}
                                                        title={isOwner ? `Click to make ${idea.isPublic ? 'private' : 'public'}` : undefined}
                                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                                                            idea.isPublic
                                                                ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
                                                                : 'bg-white/5 border-white/10 text-zinc-400'
                                                        } ${isOwner ? 'cursor-pointer hover:opacity-75' : 'cursor-default'} ${togglingId === idea._id ? 'opacity-40' : ''}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${idea.isPublic ? 'bg-[#4CAF50]' : 'bg-zinc-500'}`} />
                                                        {idea.isPublic ? 'Public' : 'Private'}
                                                    </button>

                                                    {isOwner && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(idea._id);
                                                            }}
                                                            className="text-xs text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-zinc-700">
                                                        {idea.createdBy.split('@')[0]}
                                                    </span>
                                                    <span className="text-zinc-800">·</span>
                                                    <span className="text-xs text-zinc-700">
                                                        {new Date(idea.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                                                    <span className="text-[11px] font-medium">Discuss</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Reply Modal */}
                <AnimatePresence>
                    {selectedIdeaId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
                            >
                                {/* Modal Header */}
                                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white">Discussion</h2>
                                    <button 
                                        onClick={closeReplyModal}
                                        className="text-zinc-500 hover:text-white p-2"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Modal Body (Idea + Replies List) */}
                                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                    {/* Original Idea Section (The Root of the Tree) */}
                                    {selectedIdea && (
                                        <div className="relative mb-8 group">
                                            {/* Tree connecting line starting from here */}
                                            {replies.length > 0 && (
                                                <div className="absolute left-6 top-14 bottom-[-32px] w-[1px] bg-gradient-to-b from-white/20 to-transparent z-0" />
                                            )}
                                            
                                            <div className="relative z-10 flex gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-white/30 transition-colors">
                                                    <span className="text-xl">💡</span>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white">
                                                            @{selectedIdea.createdBy.split('@')[0]}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-600">
                                                            {new Date(selectedIdea.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                        {selectedIdea.isPublic ? (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20">Public</span>
                                                        ) : (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-white/5">Private</span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-white leading-tight">
                                                        {selectedIdea.title}
                                                    </h3>
                                                    {selectedIdea.details && (
                                                        <p className="text-sm text-zinc-400 leading-relaxed bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05] shadow-sm">
                                                            {selectedIdea.details}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        {loadingReplies ? (
                                            <div className="flex justify-center py-10">
                                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white/40" />
                                            </div>
                                        ) : replies.length === 0 ? (
                                            <div className="text-center py-10 text-zinc-600 italic border-t border-white/[0.05] mt-4">
                                                No replies yet. Be the first to reply!
                                            </div>
                                        ) : (
                                            replies.map((reply, index) => (
                                                <div key={reply._id} className="relative pl-14 group">
                                                    {/* Tree branch line */}
                                                    <div className="absolute left-6 top-[-24px] bottom-0 w-[1px] bg-white/10 z-0" />
                                                    <div className="absolute left-6 top-6 w-6 h-[1px] bg-white/10 z-0" />
                                                    {index === replies.length - 1 && (
                                                        <div className="absolute left-6 top-6 bottom-0 w-[2px] bg-zinc-950 z-10" />
                                                    )}

                                                    <div className="relative z-10 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold text-zinc-200">
                                                                    @{reply.username || reply.createdBy.split('@')[0]}
                                                                </span>
                                                                <span className="text-[10px] text-zinc-700 font-medium">
                                                                    {new Date(reply.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                </span>
                                                            </div>

                                                            {!reply.isPublic && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-500 flex items-center gap-1">
                                                                    <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                                                                    Private
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-zinc-400 text-sm leading-relaxed bg-white/[0.02] hover:bg-white/[0.04] p-3.5 rounded-2xl border border-white/[0.04] transition-colors group-hover:border-white/10">
                                                            {reply.content && <p>{reply.content}</p>}
                                                            {reply.imageUrl && (
                                                                <div className={`${reply.content ? 'mt-3' : ''} rounded-xl overflow-hidden border border-white/10 max-w-sm`}>
                                                                    <img src={reply.imageUrl} alt="attached" className="w-full h-auto object-cover max-h-60" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Modal Footer (Reply Input) */}
                                <div className="p-6 border-t border-white/10 bg-black/50">
                                    {session ? (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <textarea
                                                    value={newReply}
                                                    onChange={e => setNewReply(e.target.value)}
                                                    placeholder="Write a reply..."
                                                    rows={3}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25 transition-colors resize-none"
                                                />
                                                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef} 
                                                        onChange={handleImageChange} 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                    />
                                                    <button 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                                                        title="Attach image"
                                                    >
                                                        🖼️
                                                    </button>
                                                </div>
                                            </div>

                                            {replyImage && (
                                                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/20 group">
                                                    <img src={replyImage} alt="Preview" className="w-full h-full object-cover" />
                                                    <button 
                                                        onClick={() => {
                                                            setReplyImage(null);
                                                            if (fileInputRef.current) {
                                                                fileInputRef.current.value = '';
                                                            }
                                                        }}
                                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <span className="text-white text-xs font-bold">✕</span>
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => setReplyIsPublic(p => !p)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                                                        replyIsPublic
                                                            ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]'
                                                            : 'bg-white/5 border-white/10 text-zinc-400'
                                                    }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${replyIsPublic ? 'bg-[#4CAF50]' : 'bg-zinc-600'}`} />
                                                    {replyIsPublic ? 'Public Reply' : 'Private Reply'}
                                                </button>
                                                <LiquidButton
                                                    onClick={handleSendReply}
                                                    disabled={(!newReply.trim() && !replyImage) || sendingReply}
                                                    className="text-white h-9 text-xs"
                                                >
                                                    {sendingReply ? 'Sending...' : 'Post Reply'}
                                                </LiquidButton>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-zinc-600 text-sm">
                                            Please sign in to reply.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
