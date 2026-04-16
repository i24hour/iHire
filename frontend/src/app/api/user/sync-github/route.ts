import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { syncGithubForUser } from '@/lib/github-sync';

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

        return NextResponse.json({
            message: result.newCommits > 0 ? 'GitHub commits synced!' : 'No new commits since last sync.',
            newCommits: result.newCommits,
            pointsEarned: result.pointsEarned,
            totalPoints: result.totalPoints,
            isFirstSync: result.isFirstSync,
            lastGithubSyncAt: result.lastGithubSyncAt,
            githubPointsLastUpdatedAt: result.githubPointsLastUpdatedAt,
        });
    } catch (error) {
        console.error('Error syncing GitHub:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
