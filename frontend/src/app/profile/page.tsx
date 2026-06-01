'use client';

import { useSession, signIn } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';
import { ProfileBuilder } from '@/components/profile/ProfileBuilder';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

export default function ProfileEditorPage() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
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
                    <h1 className="text-3xl font-bold text-white">Your builder portfolio</h1>
                    <p className="mt-3 max-w-md text-zinc-400">
                        Sign in to build your flowing profile — projects, site links, GitHub repos, and tech stack.
                    </p>
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
            <main className="flex-1 w-full p-4 pt-20 md:p-8 md:pt-8">
                <ProfileBuilder
                    sessionImage={session.user?.image}
                    sessionName={session.user?.name}
                />
            </main>
        </div>
    );
}
