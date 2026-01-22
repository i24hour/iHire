'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { RankingTable } from '@/components/RankingTable';
import { CandidateCard } from '@/components/CandidateCard';

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

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const campaign = searchParams.get('campaign') || 'Candidates';

    const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCandidates() {
            setLoading(true);
            try {
                const response = await fetch(`/api/candidates?campaign=${encodeURIComponent(campaign)}`);
                const data = await response.json();
                setCandidates(data.candidates || []);
            } catch (error) {
                console.error('Failed to fetch candidates:', error);
                // Use mock data
                setCandidates([
                    {
                        id: 1,
                        candidateName: 'Alex Johnson',
                        email: 'alex@example.com',
                        phone: '+1-555-0101',
                        resumeFileLink: '#',
                        executionFitScore: 78.5,
                        founderConfidenceScore: 82.3,
                        relevanceScore: 76.2,
                        roleContext: 'High_Ownership_Critical',
                        interviewFocusAreas: 'Technical depth; System design',
                        riskNotes: '',
                        assignmentBrief: 'API Design Challenge',
                        recommendation: 'Strong Yes',
                        resumeFeedback: 'Strong technical background...',
                        assignmentFeedback: '',
                        timestamp: new Date().toISOString(),
                    },
                    {
                        id: 2,
                        candidateName: 'Priya Sharma',
                        email: 'priya@example.com',
                        phone: '+91-9876543210',
                        resumeFileLink: '#',
                        executionFitScore: 85.2,
                        founderConfidenceScore: 79.8,
                        relevanceScore: 81.4,
                        roleContext: 'Early_Startup_Execution',
                        interviewFocusAreas: 'Growth mindset; Startup experience',
                        riskNotes: '',
                        assignmentBrief: 'Product Feature Spec',
                        recommendation: 'Strong Yes',
                        resumeFeedback: 'Excellent startup experience...',
                        assignmentFeedback: '',
                        timestamp: new Date().toISOString(),
                    },
                    {
                        id: 3,
                        candidateName: 'Michael Chen',
                        email: 'michael@example.com',
                        phone: '+1-555-0202',
                        resumeFileLink: '#',
                        executionFitScore: 62.1,
                        founderConfidenceScore: 68.5,
                        relevanceScore: 58.9,
                        roleContext: 'Stable_Long_Term',
                        interviewFocusAreas: 'Leadership experience; Long-term commitment',
                        riskNotes: 'Multiple short tenures',
                        assignmentBrief: '',
                        recommendation: 'Maybe',
                        resumeFeedback: 'Good foundational skills...',
                        assignmentFeedback: '',
                        timestamp: new Date().toISOString(),
                    },
                ]);
            } finally {
                setLoading(false);
            }
        }

        fetchCandidates();
    }, [campaign]);


    const handleSelectCandidate = (candidate: CandidateRecord) => {
        router.push(`/candidate/${candidate.id}`);
    };

    return (
        <div className="flex min-h-screen bg-black">
            <Sidebar />

            <main className="flex-1 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold text-white mb-1">
                            {campaign === 'Candidates' ? 'All Candidates' : campaign}
                        </h1>
                        <p className="text-zinc-500 text-sm">
                            Candidates ranked by relevance score for {campaign}
                        </p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'table'
                                ? 'bg-white text-black'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Table
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'cards'
                                ? 'bg-white text-black'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Cards
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
                    </div>
                ) : viewMode === 'table' ? (
                    <RankingTable
                        candidates={candidates}
                        onSelectCandidate={handleSelectCandidate}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {candidates
                            .sort((a, b) => b.relevanceScore - a.relevanceScore)
                            .map((candidate) => (
                                <CandidateCard
                                    key={candidate.id}
                                    name={candidate.candidateName}
                                    email={candidate.email}
                                    relevanceScore={candidate.relevanceScore}
                                    executionFitScore={candidate.executionFitScore}
                                    founderConfidenceScore={candidate.founderConfidenceScore}
                                    recommendation={candidate.recommendation}
                                    roleContext={candidate.roleContext}
                                    timestamp={candidate.timestamp}
                                    onClick={() => handleSelectCandidate(candidate)}
                                />
                            ))}
                    </div>
                )}

            </main>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen bg-black">
                <Sidebar />
                <main className="flex-1 p-8 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
                </main>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

