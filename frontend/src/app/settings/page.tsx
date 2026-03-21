'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (session) {
            fetchSettings();
        }
    }, [session]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/user/settings');
            const data = await res.json();
            if (data.username) {
                setUsername(data.username);
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Username updated successfully!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update username' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-4xl">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
                        <p className="text-zinc-400">Manage your profile and account settings.</p>
                    </div>

                    <div className="bg-black border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold text-white">Profile Information</h2>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Email Address</label>
                                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed">
                                    {session?.user?.email}
                                </div>
                                <p className="text-xs text-zinc-600">Email cannot be changed.</p>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <label htmlFor="username" className="text-sm font-medium text-zinc-400">Username</label>
                                    <input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Choose a unique username"
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                        minLength={3}
                                        required
                                    />
                                    <p className="text-xs text-zinc-500">Only letters, numbers, and underscores are allowed.</p>
                                </div>

                                {message.text && (
                                    <div className={`p-4 rounded-xl text-sm ${
                                        message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    }`}>
                                        {message.text}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <LiquidButton 
                                        type="submit" 
                                        disabled={saving || loading}
                                        className="w-full md:w-auto px-8 py-3 text-white"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </LiquidButton>
                                </div>
                            </form>
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
