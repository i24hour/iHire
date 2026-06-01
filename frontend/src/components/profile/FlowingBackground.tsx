'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FlowingBackgroundProps {
    className?: string;
}

export function FlowingBackground({ className }: FlowingBackgroundProps) {
    const reduceMotion = useReducedMotion();

    const blobs = [
        { color: 'rgba(59,130,246,0.18)', size: '42vw', x: '-10%', y: '8%', duration: 22 },
        { color: 'rgba(168,85,247,0.14)', size: '36vw', x: '62%', y: '-6%', duration: 26 },
        { color: 'rgba(34,211,238,0.12)', size: '30vw', x: '28%', y: '58%', duration: 20 },
        { color: 'rgba(255,255,255,0.06)', size: '24vw', x: '72%', y: '42%', duration: 18 },
    ];

    return (
        <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_55%)]" />
            {blobs.map((blob, index) => (
                <motion.div
                    key={index}
                    className="absolute rounded-full blur-3xl"
                    style={{
                        width: blob.size,
                        height: blob.size,
                        left: blob.x,
                        top: blob.y,
                        background: blob.color,
                    }}
                    animate={
                        reduceMotion
                            ? undefined
                            : {
                                  x: [0, 30, -20, 0],
                                  y: [0, -24, 18, 0],
                                  scale: [1, 1.08, 0.96, 1],
                              }
                    }
                    transition={
                        reduceMotion
                            ? undefined
                            : {
                                  duration: blob.duration,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                              }
                    }
                />
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.55)_72%,#000_100%)]" />
        </div>
    );
}
