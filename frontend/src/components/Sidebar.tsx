'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

const navItems = [
    { href: '/itime', label: 'iTime' },
    { href: '/workers', label: 'WOrKers' },
    { href: '/info', label: 'Info' },
    { href: '/ideas', label: 'Ideas' },
    { href: '/ichain', label: 'iChain' },
    { href: '/settings', label: 'Settings' },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [userProfile, setUserProfile] = useState<{ username?: string; image?: string }>({});

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (session?.user?.email) {
            fetchUserProfile();
        }
    }, [session]);

    const fetchUserProfile = async () => {
        try {
            const res = await fetch('/api/user/settings');
            const data = await res.json();
            if (data.username) {
                setUserProfile(prev => ({ ...prev, username: data.username }));
            }
        } catch (err) {
            console.error('Error fetching profile in sidebar:', err);
        }
    };

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

                {/* Nav */}
                <nav className="space-y-4 mb-8 w-full">
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
                </nav>

                {/* Quick Stats */}
                <div className="mt-auto p-4 bg-black rounded-lg border border-white/10">
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

                {/* User Info */}
                <div className="mt-6 pt-6 border-t border-white/10">
                    {status === 'loading' ? (
                        <div className="animate-pulse bg-white/5 h-10 w-full rounded-lg"></div>
                    ) : session ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {session.user?.image ? (
                                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-white/10 shrink-0 object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white shrink-0">
                                        {(userProfile.username || session.user?.name || session.user?.email || 'U')[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="truncate pr-2">
                                    <div className="text-sm font-medium text-white truncate">{userProfile.username || session.user?.name || 'User'}</div>
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
