import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import ITimeTask from '@/models/ITimeTask';
import { syncGithubForUser } from '@/lib/github-sync';
import { getScoreBreakdownAtTime } from '@/lib/score';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.githubUsername) {
            return NextResponse.json({ error: 'GitHub account not connected.' }, { status: 400 });
        }

        const result = await syncGithubForUser(user, { force: true });
        const refreshedUser = await User.findById(user._id).lean();
        const tasks = await ITimeTask.find({ userId: session.user.email }).lean();
        const scoreBreakdown = getScoreBreakdownAtTime(
            tasks,
            Date.now(),
            refreshedUser?.points || 0,
            refreshedUser?.githubPointsLastUpdatedAt || refreshedUser?.githubConnectedAt || null,
            refreshedUser?.githubPointsHistory || null
        );

        return NextResponse.json({
            message: result.newCommits > 0 ? 'GitHub commits synced!' : 'No new commits since last sync.',
            newCommits: result.newCommits,
            pointsEarned: result.pointsEarned,
            githubPoints: scoreBreakdown.githubPoints,
            totalPoints: scoreBreakdown.totalScore,
            isFirstSync: result.isFirstSync,
            lastGithubSyncAt: result.lastGithubSyncAt,
            githubPointsLastUpdatedAt: result.githubPointsLastUpdatedAt,
            githubPointsHistory: refreshedUser?.githubPointsHistory || [],
        });
    } catch (error) {
        console.error('Error syncing GitHub:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
