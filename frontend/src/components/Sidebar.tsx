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
        <aside className="w-64 bg-gray-900/50 backdrop-blur-xl border-r border-gray-800 min-h-screen p-6">
            {/* Logo */}
            <div className="mb-8">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Hiring Intelligence
                </h1>
                <p className="text-xs text-gray-500 mt-1">Multi-Agent Analysis</p>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                whileHover={{ x: 4 }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </motion.div>
                        </Link>
                    );
                })}
            </nav>

            {/* Stats Summary */}
            <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Stats</h3>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Total Candidates</span>
                        <span className="text-white font-medium">--</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Strong Yes</span>
                        <span className="text-emerald-400 font-medium">--</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Pending Review</span>
                        <span className="text-amber-400 font-medium">--</span>
                    </div>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="mt-auto pt-8">
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-gray-500">System Active</span>
                </div>
            </div>
        </aside>
    );
}
