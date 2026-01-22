'use client';

import { useState } from 'react';
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

interface RankingTableProps {
    candidates: CandidateRecord[];
    onSelectCandidate?: (candidate: CandidateRecord) => void;
}

type SortField = 'relevanceScore' | 'executionFitScore' | 'founderConfidenceScore' | 'candidateName';
type SortDirection = 'asc' | 'desc';

export function RankingTable({ candidates, onSelectCandidate }: RankingTableProps) {
    const [sortField, setSortField] = useState<SortField>('relevanceScore');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRecommendation, setFilterRecommendation] = useState<string>('all');
    const [sendingAssignment, setSendingAssignment] = useState<number | null>(null);
    const [assignmentStatus, setAssignmentStatus] = useState<{ id: number; success: boolean; message: string } | null>(null);

    const handleSendAssignment = async (candidate: CandidateRecord) => {
        if (!['Maybe', 'Yes', 'Strong Yes'].includes(candidate.recommendation)) {
            alert('Assignments can only be sent to Maybe, Yes or Strong Yes candidates');
            return;
        }

        setSendingAssignment(candidate.id);
        setAssignmentStatus(null);

        try {
            const response = await fetch('/api/send-assignment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: candidate.id,
                    candidateEmail: candidate.email,
                    candidateName: candidate.candidateName,
                    recommendation: candidate.recommendation,
                    roleContext: candidate.roleContext,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setAssignmentStatus({ id: candidate.id, success: true, message: 'Assignment sent!' });
            } else {
                setAssignmentStatus({ id: candidate.id, success: false, message: data.error || 'Failed' });
            }
        } catch (error) {
            console.error('Failed to send assignment:', error);
            setAssignmentStatus({ id: candidate.id, success: false, message: 'Network error' });
        } finally {
            setSendingAssignment(null);
            setTimeout(() => setAssignmentStatus(null), 3000);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedCandidates = [...candidates]
        .filter((c) => {
            const matchesSearch = c.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterRecommendation === 'all' || c.recommendation === filterRecommendation;
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            const modifier = sortDirection === 'asc' ? 1 : -1;

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * modifier;
            }
            return String(aVal).localeCompare(String(bVal)) * modifier;
        });

    const getRecommendationColor = (rec: string) => {
        switch (rec) {
            case 'Strong Yes': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            case 'Yes': return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'Maybe': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
            case 'Not Now': return 'bg-red-500/20 text-red-400 border-red-500/50';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-emerald-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1 inline-block">
            {sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : '↕'}
        </span>
    );

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
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-zinc-800 flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search candidates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    />
                </div>
                <select
                    value={filterRecommendation}
                    onChange={(e) => setFilterRecommendation(e.target.value)}
                    className="px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                    <option value="all">All Recommendations</option>
                    <option value="Strong Yes">Strong Yes</option>
                    <option value="Yes">Yes</option>
                    <option value="Maybe">Maybe</option>
                    <option value="Not Now">Not Now</option>
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-black/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                Rank
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-purple-400 transition-colors"
                                onClick={() => handleSort('candidateName')}
                            >
                                Candidate <SortIcon field="candidateName" />
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-purple-400 transition-colors"
                                onClick={() => handleSort('relevanceScore')}
                            >
                                Relevance <SortIcon field="relevanceScore" />
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-purple-400 transition-colors"
                                onClick={() => handleSort('executionFitScore')}
                            >
                                Execution Fit <SortIcon field="executionFitScore" />
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-purple-400 transition-colors"
                                onClick={() => handleSort('founderConfidenceScore')}
                            >
                                Founder Confidence <SortIcon field="founderConfidenceScore" />
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Recommendation
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {sortedCandidates.map((candidate, index) => (
                            <motion.tr
                                key={candidate.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                                onClick={() => onSelectCandidate?.(candidate)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 font-medium text-sm border border-zinc-700">
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div>
                                        <div className="font-medium text-white">{candidate.candidateName}</div>
                                        <div className="text-sm text-gray-500">{candidate.email}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`text-lg font-bold ${getScoreColor(candidate.relevanceScore)}`}>
                                        {candidate.relevanceScore.toFixed(1)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`font-medium ${getScoreColor(candidate.executionFitScore)}`}>
                                        {candidate.executionFitScore.toFixed(1)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`font-medium ${getScoreColor(candidate.founderConfidenceScore)}`}>
                                        {candidate.founderConfidenceScore.toFixed(1)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRecommendationColor(candidate.recommendation)}`}>
                                        {candidate.recommendation}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-400">
                                        {formatDate(candidate.timestamp)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(candidate.resumeFileLink, '_blank');
                                            }}
                                            className="text-zinc-400 hover:text-white transition-colors text-sm"
                                        >
                                            View Resume
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (['Maybe', 'Yes', 'Strong Yes'].includes(candidate.recommendation)) {
                                                    handleSendAssignment(candidate);
                                                }
                                            }}
                                            disabled={sendingAssignment === candidate.id || !['Maybe', 'Yes', 'Strong Yes'].includes(candidate.recommendation)}
                                            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${!['Maybe', 'Yes', 'Strong Yes'].includes(candidate.recommendation)
                                                    ? 'bg-transparent text-zinc-600 border border-zinc-700 cursor-not-allowed'
                                                    : sendingAssignment === candidate.id
                                                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-wait'
                                                        : assignmentStatus?.id === candidate.id
                                                            ? assignmentStatus.success
                                                                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                                                : 'bg-red-500/20 text-red-400 border border-red-500/40'
                                                            : 'bg-transparent text-white border border-zinc-600 hover:border-white hover:bg-white/5'
                                                }`}
                                        >
                                            {sendingAssignment === candidate.id
                                                ? 'Sending...'
                                                : assignmentStatus?.id === candidate.id
                                                    ? assignmentStatus.message
                                                    : 'Send Assignment'
                                            }
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {sortedCandidates.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                    No candidates found matching your criteria
                </div>
            )}
        </div>
    );
}
