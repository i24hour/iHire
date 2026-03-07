'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ScoreChart } from '@/components/ScoreChart';
import { motion } from 'framer-motion';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

interface CandidateRecord {
    id: number;
    candidateName: string;
    email: string;
    phone: string;
    resumeFileLink: string;
    executionFitScore: number;
    founderConfidenceScore: number;
    relevanceScore: number;
    roleContext: string;
    interviewFocusAreas: string;
    riskNotes: string;
    assignmentBrief: string;
    recommendation: string;
    resumeFeedback: string;
    assignmentFeedback: string;
    timestamp: string;
}

export default function CandidateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCandidate() {
            try {
                const response = await fetch('/api/candidates');
                const data = await response.json();
                const found = data.candidates?.find((c: CandidateRecord) => c.id === Number(params.id));
                setCandidate(found || null);
            } catch (error) {
                console.error('Failed to fetch candidate:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchCandidate();
    }, [params.id]);

    const getRecommendationGradient = (rec: string) => {
        switch (rec) {
            case 'Strong Yes': return 'from-zinc-500 to-zinc-600';
            case 'Yes': return 'from-zinc-900 to-zinc-900';
            case 'Maybe': return 'from-zinc-500 to-zinc-600';
            case 'Not Now': return 'from-zinc-500 to-zinc-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col md:flex-row min-h-screen bg-black">
                <Sidebar />
                <main className="flex-1 p-4 pt-20 md:p-8 w-full animate-pulse">
                    {/* Back Button Skeleton */}
                    <div className="w-40 h-8 bg-zinc-800/50 rounded-lg mb-6"></div>
                    {/* Header Skeleton */}
                    <div className="bg-black rounded-2xl border border-gray-800 p-6 mb-6 h-32"></div>
                    <div className="h-64 bg-black rounded-2xl border border-gray-800 mb-6"></div>
                </main>
            </div>
        );
    }

    if (!candidate) {
        return (
            <div className="flex flex-col md:flex-row min-h-screen bg-black">
                <Sidebar />
                <main className="flex-1 p-4 pt-20 md:p-8 flex items-center justify-center w-full">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Candidate Not Found</h2>
                        <LiquidButton
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 text-white"
                        >
                            Back to Dashboard
                        </LiquidButton>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-black">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
                {/* Back Button */}
                <LiquidButton
                    onClick={() => router.push('/dashboard')}
                    className="mb-6 text-gray-400 group flex items-center gap-2"
                    variant="ghost"
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
                </LiquidButton>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black backdrop-blur-xl rounded-2xl border border-gray-800 p-6 mb-6"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{candidate.candidateName}</h1>
                            <div className="flex items-center gap-4 text-gray-400">
                                <span>{candidate.email}</span>
                                <span>•</span>
                                <span>{candidate.phone}</span>
                            </div>
                        </div>
                        <div className={`px-6 py-3 rounded-xl text-lg font-bold bg-gradient-to-r ${getRecommendationGradient(candidate.recommendation)} text-white`}>
                            {candidate.recommendation}
                        </div>
                    </div>

                    <div className="mt-4 flex gap-4">
                        <a
                            href={candidate.resumeFileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white text-black/30 transition-colors"
                        >
                            View Resume
                        </a>
                        <span className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg">
                            {candidate.roleContext.replace(/_/g, ' ')}
                        </span>
                    </div>
                </motion.div>

                {/* Scores Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <ScoreChart
                        executionFit={candidate.executionFitScore}
                        founderConfidence={candidate.founderConfidenceScore}
                        relevance={candidate.relevanceScore}
                    />
                </motion.div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Interview Focus Areas */}
                    {candidate.interviewFocusAreas && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-black backdrop-blur-xl rounded-2xl border border-gray-800 p-6"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Interview Focus Areas</h3>
                            <ul className="space-y-2">
                                {candidate.interviewFocusAreas.split(';').map((area, index) => (
                                    <li key={index} className="flex items-start gap-2 text-gray-300">
                                        <span className="text-white mt-1">•</span>
                                        {area.trim()}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    )}

                    {/* Risk Notes */}
                    {candidate.riskNotes && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-black backdrop-blur-xl rounded-2xl border border-white/20 p-6"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Risk Notes</h3>
                            <ul className="space-y-2">
                                {candidate.riskNotes.split(';').map((note, index) => (
                                    <li key={index} className="flex items-start gap-2 text-zinc-300">
                                        <span className="text-white mt-1">⚠</span>
                                        {note.trim()}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    )}

                    {/* Assignment */}
                    {candidate.assignmentBrief && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-black backdrop-blur-xl rounded-2xl border border-gray-800 p-6"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Assignment</h3>
                            <p className="text-gray-300">{candidate.assignmentBrief}</p>
                        </motion.div>
                    )}

                    {/* Resume Feedback */}
                    {candidate.resumeFeedback && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-black backdrop-blur-xl rounded-2xl border border-gray-800 p-6 lg:col-span-2"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Resume Feedback</h3>
                            <div className="text-gray-300 whitespace-pre-line">
                                {candidate.resumeFeedback}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Timestamp */}
                <div className="mt-6 text-sm text-gray-500 text-right">
                    Processed: {new Date(candidate.timestamp).toLocaleString()}
                </div>
            </main>
        </div>
    );
}
