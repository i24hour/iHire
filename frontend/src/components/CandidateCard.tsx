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
    onClick,
}: CandidateCardProps) {
    const getRecommendationGradient = (rec: string) => {
        switch (rec) {
            case 'Strong Yes': return 'from-emerald-500 to-green-500';
            case 'Yes': return 'from-green-500 to-teal-500';
            case 'Maybe': return 'from-amber-500 to-yellow-500';
            case 'Not Now': return 'from-red-500 to-orange-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-emerald-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 cursor-pointer hover:border-purple-500/50 transition-all duration-300"
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
            <div className="mb-4 p-4 bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl border border-purple-500/30">
                <div className="text-sm text-purple-300 mb-1">Relevance Score</div>
                <div className={`text-3xl font-bold ${getScoreColor(relevanceScore)}`}>
                    {relevanceScore.toFixed(1)}
                    <span className="text-lg text-gray-500">/100</span>
                </div>
            </div>

            {/* Other Scores */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Execution Fit</div>
                    <div className={`text-xl font-bold ${getScoreColor(executionFitScore)}`}>
                        {executionFitScore.toFixed(1)}
                    </div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Founder Confidence</div>
                    <div className={`text-xl font-bold ${getScoreColor(founderConfidenceScore)}`}>
                        {founderConfidenceScore.toFixed(1)}
                    </div>
                </div>
            </div>

            {/* Role Context Badge */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Role Context:</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                    {roleContext.replace(/_/g, ' ')}
                </span>
            </div>
        </motion.div>
    );
}
