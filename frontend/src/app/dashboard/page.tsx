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

interface ITimeTask {
    id: number;
    title: string;
    description: string;
    createdAt: number;
    elapsedSeconds: number;
    enabled: boolean;
}

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const campaign = searchParams.get('campaign') || 'Candidates';

    const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<ITimeTask[]>([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = window.localStorage.getItem('itime-tasks');
            if (stored) {
                const parsed = JSON.parse(stored) as ITimeTask[];
                if (Array.isArray(parsed)) {
                    setTasks(parsed);
                }
            }
        } catch (error) {
            console.warn('Failed to load iTime tasks:', error);
        }
    }, []);

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

    useEffect(() => {
        const interval = setInterval(() => {
            setTasks((prev) =>
                prev.map((task) =>
                    task.enabled
                        ? { ...task, elapsedSeconds: task.elapsedSeconds + 1 }
                        : task
                )
            );
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem('itime-tasks', JSON.stringify(tasks));
        } catch (error) {
            console.warn('Failed to save iTime tasks:', error);
        }
    }, [tasks]);

    const handleAddTask = () => {
        if (!taskTitle.trim()) return;

        const newTask: ITimeTask = {
            id: Date.now(),
            title: taskTitle.trim(),
            description: taskDescription.trim(),
            createdAt: Date.now(),
            elapsedSeconds: 0,
            enabled: true,
        };

        setTasks((prev) => [newTask, ...prev]);
        setTaskTitle('');
        setTaskDescription('');
    };

    const toggleTask = (taskId: number) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId
                    ? { ...task, enabled: !task.enabled }
                    : task
            )
        );
    };

    const formatElapsed = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const pad = (value: number) => value.toString().padStart(2, '0');
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    };

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

                {/* iTime Task Tracker */}
                <div className="mt-10 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-white">iTime</h2>
                            <p className="text-sm text-zinc-500">Add tasks and track time live.</p>
                        </div>
                        <span className="text-xs text-zinc-500">{tasks.length} tasks</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <input
                            type="text"
                            placeholder="Task title"
                            value={taskTitle}
                            onChange={(event) => setTaskTitle(event.target.value)}
                            className="px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <input
                            type="text"
                            placeholder="Task description"
                            value={taskDescription}
                            onChange={(event) => setTaskDescription(event.target.value)}
                            className="px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <button
                            onClick={handleAddTask}
                            className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                            disabled={!taskTitle.trim()}
                        >
                            Add Task
                        </button>
                    </div>

                    <div className="space-y-3">
                        {tasks.length === 0 ? (
                            <div className="text-center text-zinc-500 py-6">No tasks yet. Add your first task above.</div>
                        ) : (
                            tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex flex-col md:flex-row md:items-center gap-4 bg-black/40 border border-zinc-800 rounded-xl p-4"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-medium">{task.title}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${task.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700/40 text-zinc-400'}`}>
                                                {task.enabled ? 'Running' : 'Disabled'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-500 mt-1">{task.description || 'No description provided.'}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-lg font-semibold text-white tabular-nums">
                                            {formatElapsed(task.elapsedSeconds)}
                                        </div>
                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${task.enabled
                                                ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                                                : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
                                                }`}
                                        >
                                            {task.enabled ? 'Disable' : 'Enable'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
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

