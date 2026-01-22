import { Sidebar } from '@/components/Sidebar';
import { getCandidates, CandidateRecord } from '@/lib/sheets-client';
import Link from 'next/link';
import { ITimeTracker } from '@/components/ITimeTracker';

export default async function Home() {
  let candidates: CandidateRecord[] = [];
  try {
    candidates = await getCandidates();
  } catch (error) {
    console.error('Failed to fetch candidates during build/render:', error);
    // Fallback to empty array so build doesn't fail
    candidates = [];
  }

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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Sidebar />

      <main className="flex-1 p-8">
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
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
            <div className="text-sm text-gray-400 mb-2">Total Candidates</div>
            <div className="text-4xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/50 to-green-900/50 backdrop-blur-xl rounded-2xl border border-emerald-500/30 p-6">
            <div className="text-sm text-emerald-300 mb-2">Strong Yes</div>
            <div className="text-4xl font-bold text-emerald-400">{stats.strongYes}</div>
          </div>

          <div className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-6">
            <div className="text-sm text-amber-300 mb-2">Maybe / Review</div>
            <div className="text-4xl font-bold text-amber-400">{stats.maybe}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6">
            <div className="text-sm text-purple-300 mb-2">Avg. Relevance</div>
            <div className="text-4xl font-bold text-purple-400">{stats.avgRelevance}</div>
          </div>
        </div>

        {/* iTime Tracker */}
        <div className="mb-8">
          <ITimeTracker />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Candidates */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Top Candidates</h2>
              <Link href="/dashboard" className="text-sm text-purple-400 hover:text-purple-300">
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              {topCandidates.map((candidate, index) => (
                <div key={candidate.id} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{candidate.candidateName}</div>
                    <div className="text-sm text-gray-500">{candidate.roleContext.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${candidate.relevanceScore >= 70 ? 'text-emerald-400' :
                      candidate.relevanceScore >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                      {candidate.relevanceScore.toFixed(1)}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${candidate.recommendation === 'Strong Yes' ? 'bg-emerald-500/20 text-emerald-400' :
                      candidate.recommendation === 'Yes' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
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
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recommendation Breakdown</h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400">Strong Yes</span>
                  <span className="text-sm text-emerald-400">{stats.strongYes}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.strongYes / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400">Yes</span>
                  <span className="text-sm text-green-400">{stats.yes}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.yes / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400">Maybe</span>
                  <span className="text-sm text-amber-400">{stats.maybe}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.maybe / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400">Not Now</span>
                  <span className="text-sm text-red-400">{stats.notNow}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.notNow / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-sm font-medium text-white">Drive Monitor</div>
                <div className="text-xs text-gray-500">Watching for new resumes</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-sm font-medium text-white">AI Agents</div>
                <div className="text-xs text-gray-500">6 agents ready</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
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
