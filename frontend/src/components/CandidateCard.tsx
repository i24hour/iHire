'use client';

import { motion } from 'framer-motion';

interface CandidateCardProps {
    name: string;
    email: string;
    relevanceScore: number;
    executionFitScore: number;
    founderConfidenceScore: number;
    recommendation: string;
    roleContext: string;
    timestamp: string;
    onClick?: () => void;
}

export function CandidateCard({
    name,
    email,
    relevanceScore,
    executionFitScore,
    founderConfidenceScore,
    recommendation,
    roleContext,
    timestamp,
    onClick,
}: CandidateCardProps) {
    const getRecommendationGradient = (rec: string) => {
        switch (rec) {
            case 'Strong Yes': return 'from-zinc-900/50 to-zinc-900/50';
            case 'Yes': return 'from-zinc-900/50 to-zinc-900/50';
            case 'Maybe': return 'from-zinc-900/50 to-zinc-900/50';
            case 'Not Now': return 'from-zinc-900/50 to-orange-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-white';
        if (score >= 50) return 'text-white';
        return 'text-white';
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="bg-black  rounded-2xl border border-white/10 p-6 cursor-pointer hover:border-white/20 transition-all duration-300 relative overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">{name}</h3>
                    <p className="text-sm text-gray-500">{email}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRecommendationGradient(recommendation)} text-white`}>
                    {recommendation}
                </div>
            </div>

            {/* Relevance Score - Featured */}
            <div className="mb-4 p-4 bg-black rounded-xl border border-white/20">
                <div className="text-sm text-zinc-300 mb-1">Relevance Score</div>
                <div className={`text-3xl font-bold ${getScoreColor(relevanceScore)}`}>
                    {relevanceScore.toFixed(1)}
                    <span className="text-lg text-gray-500">/100</span>
                </div>
            </div>

            {/* Other Scores */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-black rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Execution Fit</div>
                    <div className={`text-xl font-bold ${getScoreColor(executionFitScore)}`}>
                        {executionFitScore.toFixed(1)}
                    </div>
                </div>
                <div className="p-3 bg-black rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Founder Confidence</div>
                    <div className={`text-xl font-bold ${getScoreColor(founderConfidenceScore)}`}>
                        {founderConfidenceScore.toFixed(1)}
                    </div>
                </div>
            </div>

            {/* Footer: Role & Date */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Role:</span>
                    <span className="px-2 py-1 bg-black rounded text-xs text-gray-300">
                        {roleContext.replace(/_/g, ' ')}
                    </span>
                </div>
                <div className="text-xs text-gray-600">
                    {formatDate(timestamp)}
                </div>
            </div>
        </motion.div>
    );
}
