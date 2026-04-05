'use client';

import { useState, useEffect, useRef, use } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

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

export default function IdeaDiscussionPage({ params }: { params: Promise<{ ideaId: string }> }) {
    const resolvedParams = use(params);
    const selectedIdeaId = resolvedParams.ideaId;
    
    const { data: session } = useSession();
    const myEmail = session?.user?.email;

    const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
    const [loadingIdea, setLoadingIdea] = useState(true);

    const [replies, setReplies] = useState<Reply[]>([]);
    const [loadingReplies, setLoadingReplies] = useState(false);
    
    const [newReply, setNewReply] = useState('');
    const [replyIsPublic, setReplyIsPublic] = useState(true);
    const [sendingReply, setSendingReply] = useState(false);
    const [togglingReplyId, setTogglingReplyId] = useState<string | null>(null);
    
    const [replyImage, setReplyImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Zoomed Image Lightbox State
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        if (selectedIdeaId) {
            fetchIdea(selectedIdeaId);
            fetchReplies(selectedIdeaId);
        }
    }, [selectedIdeaId]);

    const fetchIdea = async (id: string) => {
        try {
            const res = await fetch(`/api/ideas/${id}`);
            const data = await res.json();
            if (data.idea) setSelectedIdea(data.idea);
        } catch (err) {
            console.error('Failed to fetch idea:', err);
        } finally {
            setLoadingIdea(false);
        }
    };

    const fetchReplies = async (id: string) => {
        setLoadingReplies(true);
        try {
            const res = await fetch(`/api/ideas/${id}/replies`);
            const data = await res.json();
            if (data.replies) setReplies(data.replies);
        } catch (err) {
            console.error('Failed to fetch replies:', err);
        } finally {
            setLoadingReplies(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Image too large (max 2MB)');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setReplyImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSendReply = async () => {
        if (!selectedIdeaId || sendingReply || (!newReply.trim() && !replyImage)) return;
        setSendingReply(true);
        try {
            const res = await fetch(`/api/ideas/${selectedIdeaId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: newReply.trim(), 
                    isPublic: replyIsPublic,
                    imageUrl: replyImage
                }),
            });
            if (!res.ok) throw new Error('Failed');
            fetchReplies(selectedIdeaId);
            setNewReply('');
            setReplyImage(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('Failed to send reply:', err);
        } finally {
            setSendingReply(false);
        }
    };

    const handleToggleReplyVisibility = async (reply: Reply) => {
        if (togglingReplyId) return;
        setTogglingReplyId(reply._id);
        
        setReplies(prev => prev.map(r => r._id === reply._id ? { ...r, isPublic: !r.isPublic } : r));
        
        try {
            const res = await fetch(`/api/replies/${reply._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: !reply.isPublic }),
            });
            if (!res.ok) throw new Error('Failed');
        } catch (err) {
            console.error('Failed to toggle reply visibility:', err);
            setReplies(prev => prev.map(r => r._id === reply._id ? { ...r, isPublic: reply.isPublic } : r));
        } finally {
            setTogglingReplyId(null);
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
                <div className="space-y-8 max-w-4xl">
                    {/* Back Button */}
                    <div className="flex items-center gap-4">
                        <Link href="/ideas" className="text-zinc-500 hover:text-white transition-colors duration-200 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full text-sm font-medium border border-white/10 flex items-center gap-2">
                            <span>←</span> Back to Ideas
                        </Link>
                    </div>

                    <div className="bg-black border border-white/10 rounded-3xl w-full flex flex-col overflow-hidden shadow-2xl">
                        {/* Discussion Body */}
                        <div className="flex-1 p-6 sm:p-8">
                            {/* Idea Header */}
                            {loadingIdea ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/40" />
                                </div>
                            ) : selectedIdea ? (
                                <div className="relative mb-10 group">
                                    {replies.length > 0 && (
                                        <div className="absolute left-6 top-14 bottom-[-40px] w-[1px] bg-gradient-to-b from-white/20 to-transparent z-0" />
                                    )}
                                    <div className="relative z-10 flex gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 shadow-lg">
                                            <span className="text-xl">💡</span>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-white tracking-tight">
                                                    @{selectedIdea.createdBy.split('@')[0]}
                                                </span>
                                                <span className="text-[11px] text-zinc-500">
                                                    {new Date(selectedIdea.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
                                                {selectedIdea.isPublic ? (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20">Public</span>
                                                ) : (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-white/5">Private</span>
                                                )}
                                            </div>
                                            <h1 className="text-2xl font-bold text-white leading-tight">
                                                {selectedIdea.title}
                                            </h1>
                                            {selectedIdea.details && (
                                                <div className="text-[15px] text-zinc-300 leading-relaxed bg-white/[0.03] p-5 rounded-2xl border border-white/[0.05] shadow-sm">
                                                    {selectedIdea.details}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-red-400">Idea not found.</div>
                            )}

                            {/* Replies List */}
                            <div className="space-y-8">
                                {loadingReplies ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white/40" />
                                    </div>
                                ) : replies.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-600 bg-white/[0.01] rounded-3xl border border-white/[0.02]">
                                        <div className="text-3xl mb-3">💬</div>
                                        <p className="font-medium text-zinc-400">No replies yet</p>
                                        <p className="text-sm mt-1">Start the discussion below.</p>
                                    </div>
                                ) : (
                                    replies.map((reply, index) => (
                                        <div key={reply._id} className="relative pl-14 group">
                                            <div className="absolute left-6 top-[-30px] bottom-0 w-[1px] bg-white/10 z-0" />
                                            <div className="absolute left-6 top-6 w-6 h-[1px] bg-white/10 z-0" />
                                            {index === replies.length - 1 && (
                                                <div className="absolute left-6 top-6 bottom-0 w-[2px] bg-black z-10" />
                                            )}

                                            <div className="relative z-10 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-zinc-200">
                                                            @{reply.username || reply.createdBy.split('@')[0]}
                                                        </span>
                                                        <span className="text-[11px] text-zinc-600">
                                                            {new Date(reply.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Toggle Reply Visibility */}
                                                    <button
                                                        onClick={() => reply.createdBy === myEmail && handleToggleReplyVisibility(reply)}
                                                        disabled={reply.createdBy !== myEmail || togglingReplyId === reply._id}
                                                        className={`text-[10px] font-medium tracking-wide px-2 py-0.5 rounded transition-all duration-200 flex items-center gap-1.5 border ${
                                                            reply.isPublic 
                                                                ? 'bg-[#4CAF50]/5 border-[#4CAF50]/20 text-[#4CAF50]/70' 
                                                                : 'bg-zinc-900 border-white/5 text-zinc-500'
                                                        } ${reply.createdBy === myEmail ? 'cursor-pointer hover:bg-white/10 hover:text-white' : 'cursor-default opacity-80'}`}
                                                    >
                                                        <span className={`w-1 h-1 rounded-full ${reply.isPublic ? 'bg-[#4CAF50]' : 'bg-zinc-600'}`} />
                                                        {reply.isPublic ? 'Public' : 'Private'}
                                                        {reply.createdBy === myEmail && <span className="opacity-50 ml-0.5">✎</span>}
                                                    </button>
                                                </div>
                                                <div className="text-zinc-300 text-[15px] leading-relaxed bg-white/[0.02] hover:bg-white/[0.04] p-4 rounded-3xl rounded-tl-sm border border-white/[0.04] transition-colors group-hover:border-white/[0.08] shadow-sm">
                                                    {reply.content && <p className="whitespace-pre-wrap">{reply.content}</p>}
                                                    {reply.imageUrl && (
                                                        <div 
                                                            className={`${reply.content ? 'mt-4' : ''} rounded-xl overflow-hidden border border-white/10 max-w-sm cursor-pointer relative group/img`}
                                                            onClick={() => setZoomedImage(reply.imageUrl!)}
                                                        >
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                <span className="bg-black/60 text-white backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium">🔍 Zoom</span>
                                                            </div>
                                                            <img src={reply.imageUrl} alt="attached" className="w-full h-auto object-cover max-h-72" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Reply Input Box */}
                        <div className="p-6 sm:p-8 bg-black border-t border-white/[0.05]">
                            {session ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <textarea
                                            value={newReply}
                                            onChange={e => setNewReply(e.target.value)}
                                            placeholder="Write a reply..."
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[15px] text-white placeholder-zinc-500 outline-none focus:border-white/25 focus:bg-white/5 transition-colors resize-none shadow-inner"
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
                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
                                                title="Attach image"
                                            >
                                                🖼️
                                            </button>
                                        </div>
                                    </div>

                                    {replyImage && (
                                        <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-white/20 shadow-lg group shadow-black/50">
                                            <img src={replyImage} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => {
                                                    setReplyImage(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                                className="absolute inset-0 bg-red-500/20 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                                            >
                                                <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg">✕</div>
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            onClick={() => setReplyIsPublic(p => !p)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 ${
                                                replyIsPublic
                                                    ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50] hover:bg-[#4CAF50]/20'
                                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${replyIsPublic ? 'bg-[#4CAF50] shadow-[0_0_8px_rgba(76,175,80,0.5)]' : 'bg-zinc-500'}`} />
                                            {replyIsPublic ? 'Public Reply' : 'Private Reply'}
                                        </button>
                                        <LiquidButton
                                            onClick={handleSendReply}
                                            disabled={(!newReply.trim() && !replyImage) || sendingReply}
                                            className="text-white px-8 h-10 shadow-xl"
                                        >
                                            {sendingReply ? 'Posting...' : 'Post Reply'}
                                        </LiquidButton>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center bg-white/5 p-6 rounded-2xl border border-white/5 text-zinc-500 text-sm">
                                    Please sign in to join the discussion.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Global Lightbox for Image Zoom */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 cursor-zoom-out"
                        onClick={() => setZoomedImage(null)}
                    >
                        <motion.img 
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            src={zoomedImage} 
                            alt="Zoomed attachment" 
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
                        />
                        <button 
                            className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors backdrop-blur-md"
                            onClick={(e) => {
                                e.stopPropagation();
                                setZoomedImage(null);
                            }}
                        >
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
