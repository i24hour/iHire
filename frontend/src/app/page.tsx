import { Sidebar } from '@/components/Sidebar';
// import { getCandidates, CandidateRecord } from '@/lib/sheets-client';
import Link from 'next/link';

interface CandidateRecord {
  id: number;
  candidateName: string;
  recommendation: string;
  relevanceScore: number;
  roleContext: string;
}

export default async function Home() {
  // Google Sheets fetching disabled — was causing Vercel serverless timeout
  const candidates: CandidateRecord[] = [];

  const stats = {
    total: candidates.length,
    strongYes: candidates.filter(c => c.recommendation === 'Strong Yes').length,
    yes: candidates.filter(c => c.recommendation === 'Yes').length,
    maybe: candidates.filter(c => c.recommendation === 'Maybe').length,
    notNow: candidates.filter(c => c.recommendation === 'Not Now').length,
    avgRelevance: candidates.length > 0
      ? (candidates.reduce((sum, c) => sum + c.relevanceScore, 0) / candidates.length).toFixed(1)
      : '0',
  };

  const topCandidates = [...candidates]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Dashboard Overview
          </h1>
          <p className="text-gray-400">
            Real-time hiring intelligence across all candidates
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-black  rounded-2xl border border-white/10 p-6">
            <div className="text-sm text-gray-400 mb-2">Total Candidates</div>
            <div className="text-4xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-black  rounded-2xl border border-white/20 p-6">
            <div className="text-sm text-zinc-300 mb-2">Strong Yes</div>
            <div className="text-4xl font-bold text-white">{stats.strongYes}</div>
          </div>

          <div className="bg-black  rounded-2xl border border-white/20 p-6">
            <div className="text-sm text-zinc-300 mb-2">Maybe / Review</div>
            <div className="text-4xl font-bold text-white">{stats.maybe}</div>
          </div>

          <div className="bg-black  rounded-2xl border border-white/20 p-6">
            <div className="text-sm text-zinc-300 mb-2">Avg. Relevance</div>
            <div className="text-4xl font-bold text-white">{stats.avgRelevance}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Candidates */}
          <div className="bg-black  rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Top Candidates</h2>
              <Link href="/dashboard" className="text-sm text-white hover:text-zinc-300">
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              {topCandidates.map((candidate, index) => (
                <div key={candidate.id} className="flex items-center gap-4 p-3 bg-black rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-600 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{candidate.candidateName}</div>
                    <div className="text-sm text-gray-500">{candidate.roleContext.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${candidate.relevanceScore >= 70 ? 'text-white' :
                      candidate.relevanceScore >= 50 ? 'text-white' : 'text-white'
                      }`}>
                      {candidate.relevanceScore.toFixed(1)}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${candidate.recommendation === 'Strong Yes' ? 'bg-white/10 text-white' :
                      candidate.recommendation === 'Yes' ? 'bg-white/10 text-white' :
                        'bg-white/5 text-gray-400'
                      }`}>
                      {candidate.recommendation}
                    </span>
                  </div>
                </div>
              ))}

              {topCandidates.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No candidates processed yet
                </div>
              )}
            </div>
          </div>

          {/* Recommendation Breakdown */}
          <div className="bg-black  rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recommendation Breakdown</h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400">Strong Yes</span>
                  <span className="text-sm text-white">{stats.strongYes}</span>
                </div>
                <div className="h-2 bg-black rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-500 to-zinc-600 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.strongYes / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400">Yes</span>
                  <span className="text-sm text-white">{stats.yes}</span>
                </div>
                <div className="h-2 bg-black rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-900 to-zinc-900 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.yes / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400">Maybe</span>
                  <span className="text-sm text-white">{stats.maybe}</span>
                </div>
                <div className="h-2 bg-black rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-500 to-zinc-600 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.maybe / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400">Not Now</span>
                  <span className="text-sm text-white">{stats.notNow}</span>
                </div>
                <div className="h-2 bg-black rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-500 to-zinc-600 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.notNow / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-black  rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* <div className="flex items-center gap-3 p-4 bg-black rounded-xl">
              <div className="w-3 h-3 rounded-full bg-zinc-300 animate-pulse" />
              <div>
                <div className="text-sm font-medium text-white">Drive Monitor</div>
                <div className="text-xs text-gray-500">Watching for new resumes</div>
              </div>
            </div> */}
            <div className="flex items-center gap-3 p-4 bg-black rounded-xl">
              <div className="w-3 h-3 rounded-full bg-zinc-300 animate-pulse" />
              <div>
                <div className="text-sm font-medium text-white">AI Agents</div>
                <div className="text-xs text-gray-500">6 agents ready</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-black rounded-xl">
              <div className="w-3 h-3 rounded-full bg-zinc-300 animate-pulse" />
              <div>
                <div className="text-sm font-medium text-white">Notifications</div>
                <div className="text-xs text-gray-500">Email alerts active</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
