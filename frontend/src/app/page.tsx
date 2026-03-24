import Link from 'next/link';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

export async function generateMetadata() {
    return {
        title: "AI Workspace That Measures Your Work",
        description: "Set targets, build chains, track time, and analyze productivity using human performance charts.",
        alternates: {
            canonical: "/",
        },
    };
}

export default function Home() {
    return (
        <main className="landing-page min-h-screen bg-black text-white selection:bg-white/20">
            {/* Minimal Header */}
            <header className="landing-header fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="landing-brand flex items-center gap-2">
                        <div className="landing-brand-icon w-6 h-6 rounded-full bg-white flex items-center justify-center">
                            <span className="text-black font-bold text-xs">iW</span>
                        </div>
                        <span className="font-semibold tracking-tight">Infinwork</span>
                    </div>
                    <div className="landing-header-actions flex items-center gap-4">
                        <Link href="/workers" className="landing-directory-link text-sm text-zinc-400 hover:text-white transition-colors">Directory</Link>
                        <Link href="/api/auth/signin">
                            <LiquidButton className="landing-login-btn px-5 py-2 text-sm text-white border-white/20">Login</LiquidButton>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
                <div className="landing-hero-badge inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm mb-8 text-zinc-300 backdrop-blur-sm">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    The workspace for disciplined builders
                </div>
                
                <h1 className="landing-hero-title text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent max-w-4xl">
                    Make Every Unit of Work Measurable.
                </h1>
                
                <p className="landing-hero-description text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed text-balance">
                    Infinwork is an ambitious AI workspace designed for extreme consistency. 
                    Set aggressive targets, build unbreakable chains, track every second of execution, 
                    and watch your overall productivity behave like a high-performing stock.
                </p>

                <div className="landing-hero-cta flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Link href="/itime">
                        <LiquidButton className="landing-primary-cta w-full sm:w-auto px-8 py-3 text-white text-lg font-medium ring-1 ring-white/30">
                            Start Measuring Work
                        </LiquidButton>
                    </Link>
                    <Link href="/workers">
                        <LiquidButton className="landing-secondary-cta w-full sm:w-auto px-8 py-3 text-white bg-transparent border-white/10 hover:bg-white/5 text-lg">
                            View Leaderboard
                        </LiquidButton>
                    </Link>
                </div>
            </section>

            {/* Features Grid */}
            <section className="landing-features py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
                <div className="text-center mb-16">
                    <h2 className="landing-features-title text-3xl font-bold tracking-tight mb-4 text-white">Systems for Scale</h2>
                    <p className="landing-features-subtitle text-zinc-400">Everything you need to stay disciplined and execute globally.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FeatureCard 
                        title="Aggressive Targets" 
                        description="Define clear, measurable objectives. What gets tracked gets executed." 
                        icon="🎯"
                    />
                    <FeatureCard 
                        title="Unbreakable Chains" 
                        description="Build the daily consistency required for outsized outcomes. Don't break the iChain." 
                        icon="🔗"
                    />
                    <FeatureCard 
                        title="Precision iTime" 
                        description="Track execution down to the second. AI monitors your focus and performance." 
                        icon="⏱️"
                    />
                    <FeatureCard 
                        title="Absolute Execution" 
                        description="Move ideas out of your head and into a strict pipeline of getting things done." 
                        icon="⚡"
                    />
                    <FeatureCard 
                        title="Human Stock Charts" 
                        description="Visualize your personal output exactly like an open-market asset. Trade upwards." 
                        icon="📈"
                    />
                    <FeatureCard 
                        title="Global Leaderboards" 
                        description="Compete in real-time with an ambitious directory of top-tier builders." 
                        icon="🌍"
                    />
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer border-t border-white/10 py-12 px-6 mt-12 bg-black">
                <div className="landing-footer-content max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-zinc-500 text-sm">
                    <p>© {new Date().getFullYear()} Infinwork. The AI workspace.</p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <Link href="/workers" className="landing-footer-link hover:text-white transition-colors">Directory</Link>
                        <Link href="/itime" className="landing-footer-link hover:text-white transition-colors">iTime</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: string }) {
    return (
        <div className="landing-feature-card bg-[#050505] border border-white/10 rounded-2xl p-8 hover:bg-[#0a0a0a] transition-colors group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">{icon}</div>
            <h3 className="landing-feature-card-title text-xl font-semibold mb-2 text-zinc-100">{title}</h3>
            <p className="landing-feature-card-description text-zinc-400 leading-relaxed text-sm">{description}</p>
        </div>
    );
}
