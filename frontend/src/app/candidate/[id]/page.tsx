'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ScoreChart } from '@/components/ScoreChart';
import { motion } from 'framer-motion';

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
            case 'Strong Yes': return 'from-emerald-500 to-green-500';
            case 'Yes': return 'from-green-500 to-teal-500';
            case 'Maybe': return 'from-amber-500 to-yellow-500';
            case 'Not Now': return 'from-red-500 to-orange-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </main>
            </div>
        );
    }

    if (!candidate) {
        return (
            <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Candidate Not Found</h2>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <Sidebar />

            <main className="flex-1 p-8">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mb-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                >
                    ← Back to Dashboard
                </button>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 mb-6"
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
                            className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
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
                            className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Interview Focus Areas</h3>
                            <ul className="space-y-2">
                                {candidate.interviewFocusAreas.split(';').map((area, index) => (
                                    <li key={index} className="flex items-start gap-2 text-gray-300">
                                        <span className="text-purple-400 mt-1">•</span>
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
                            className="bg-red-900/20 backdrop-blur-xl rounded-2xl border border-red-500/30 p-6"
                        >
                            <h3 className="text-lg font-semibold text-red-400 mb-4">Risk Notes</h3>
                            <ul className="space-y-2">
                                {candidate.riskNotes.split(';').map((note, index) => (
                                    <li key={index} className="flex items-start gap-2 text-red-300">
                                        <span className="text-red-400 mt-1">⚠</span>
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
                            className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6"
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
                            className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 lg:col-span-2"
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
