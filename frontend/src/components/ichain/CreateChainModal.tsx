'use client';

import { useState } from 'react';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

interface CreateChainModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChainCreated: (chain: any) => void;
}

export function CreateChainModal({ isOpen, onClose, onChainCreated }: CreateChainModalProps) {
    const [name, setName] = useState('');
    const [memberInput, setMemberInput] = useState('');
    const [members, setMembers] = useState<string[]>([]);
    const [whatsappLink, setWhatsappLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleAddMember = () => {
        if (memberInput) {
            if (!members.includes(memberInput)) {
                setMembers([...members, memberInput]);
            }
            setMemberInput('');
        }
    };

    const removeMember = (identifier: string) => {
        setMembers(members.filter(m => m !== identifier));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || members.length === 0) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/ichain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    members,
                    whatsappLink,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                onChainCreated(data.chain);
                onClose();
                // Reset form
                setName('');
                setMembers([]);
                setWhatsappLink('');
            }
        } catch (error) {
            console.error('Error creating chain:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div 
                className="bg-black border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Create New iChain</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chain Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. IIT Study Squad"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Add Members (Email or Username)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={memberInput}
                                onChange={(e) => setMemberInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMember())}
                                placeholder="priyanshu or member@example.com"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                            />
                            <LiquidButton type="button" onClick={handleAddMember} size="sm" className="px-4">Add</LiquidButton>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                            {members.map(identifier => (
                                <div key={identifier} className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                                    <span>{identifier}</span>
                                    <button type="button" onClick={() => removeMember(identifier)} className="text-zinc-400 hover:text-white">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">WhatsApp Group Link (Optional)</label>
                        <input
                            type="url"
                            value={whatsappLink}
                            onChange={(e) => setWhatsappLink(e.target.value)}
                            placeholder="https://chat.whatsapp.com/..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                        />
                    </div>

                    <div className="pt-4">
                        <LiquidButton 
                            type="submit" 
                            className="w-full py-4 text-white font-bold"
                            disabled={isSubmitting || !name || memberEmails.length === 0}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Chain'}
                        </LiquidButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
