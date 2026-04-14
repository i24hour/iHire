import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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

        // Fetch Public Events from GitHub
        const githubRes = await fetch(`https://api.github.com/users/${user.githubUsername}/events/public`, {
            headers: user.githubAccessToken ? {
                'Authorization': `Bearer ${user.githubAccessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            } : {
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!githubRes.ok) {
            console.error('GitHub API error:', await githubRes.text());
            return NextResponse.json({ error: 'Failed to fetch from GitHub' }, { status: githubRes.status });
        }

        const events = await githubRes.json();
        
        // Filter events
        // 1. Must be PushEvent
        // 2. Must be newer than lastGithubSyncAt (if exists)
        let totalNewCommits = 0;
        const lastSync = user.lastGithubSyncAt ? new Date(user.lastGithubSyncAt).getTime() : 0;
        
        // If it's the first sync, we only want to reward commits from the last 7 days so they don't get 1,000,000 points instantly
        const cutoffTime = lastSync > 0 ? lastSync : Date.now() - (7 * 24 * 60 * 60 * 1000); 

        for (const event of events) {
            if (event.type === 'PushEvent') {
                const eventDate = new Date(event.created_at).getTime();
                if (eventDate > cutoffTime) {
                    totalNewCommits += event.payload.commits?.length || 0;
                }
            }
        }

        const pointsEarned = totalNewCommits * 10;
        
        // Update user
        user.points = (user.points || 0) + pointsEarned;
        user.lastGithubSyncAt = new Date();
        await user.save();

        return NextResponse.json({
            message: 'GitHub commits synced',
            newCommits: totalNewCommits,
            pointsEarned,
            totalPoints: user.points
        });

    } catch (error) {
        console.error('Error syncing GitHub:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
