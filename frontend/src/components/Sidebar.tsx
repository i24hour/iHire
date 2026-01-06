'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
    { href: '/', label: 'Overview', icon: '📊' },
    { href: '/dashboard', label: 'Candidates', icon: '👥' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-black border-r border-zinc-800 min-h-screen p-6">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-3">
                <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-white"></div>
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight">
                        iHire
                    </h1>
                    <p className="text-xs text-zinc-500">Multi-Agent Analysis</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                whileHover={{ x: 2 }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${isActive
                                    ? 'bg-zinc-900 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                                    }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                <span className="font-medium text-sm">{item.label}</span>
                            </motion.div>
                        </Link>
                    );
                })}
            </nav>

            {/* Stats Summary */}
            <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <h3 className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">Quick Stats</h3>
                <div className="space-y-2.5">
                    <div className="flex justify-between">
                        <span className="text-zinc-500 text-sm">Total Candidates</span>
                        <span className="text-zinc-300 font-medium text-sm">--</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500 text-sm">Strong Yes</span>
                        <span className="text-emerald-500 font-medium text-sm">--</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500 text-sm">Pending Review</span>
                        <span className="text-amber-500 font-medium text-sm">--</span>
                    </div>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="mt-auto pt-8">
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-500 text-xs">System Active</span>
                </div>
            </div>
        </aside>
    );
}
