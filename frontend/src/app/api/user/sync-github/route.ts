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

        const isFirstSync = !user.githubCommitsTotal && user.githubCommitsTotal !== 0 || user.githubCommitsTotal === 0 && !user.lastGithubSyncAt;
        
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Two aliases in one GraphQL call:
        // 1. recentContributions - last 7 days (only for first sync reward)
        // 2. allContributions - current GitHub year (used as the checkpoint for subsequent syncs)
        const query = `
          query($login: String!, $sevenDaysAgo: DateTime!) {
            user(login: $login) {
              recentContributions: contributionsCollection(from: $sevenDaysAgo) {
                totalCommitContributions
              }
              allContributions: contributionsCollection {
                totalCommitContributions
              }
            }
          }
        `;

        const variables = {
            login: user.githubUsername,
            sevenDaysAgo
        };

        const githubRes = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: user.githubAccessToken ? {
                'Authorization': `Bearer ${user.githubAccessToken}`,
                'Content-Type': 'application/json'
            } : {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        });

        if (!githubRes.ok) {
            console.error('GitHub GraphQL API error:', await githubRes.text());
            return NextResponse.json({ error: 'Failed to fetch from GitHub' }, { status: githubRes.status });
        }

        const jsonRes = await githubRes.json();
        
        if (jsonRes.errors) {
            console.error('GitHub GraphQL Errors:', jsonRes.errors);
            return NextResponse.json({ error: 'Failed to query GitHub profile.' }, { status: 400 });
        }

        // Current year total commits — used as IDempotent checkpoint
        const currentYearTotal: number = jsonRes.data?.user?.allContributions?.totalCommitContributions || 0;
        // Last 7 days commits — only used for first sync
        const last7DaysCommits: number = jsonRes.data?.user?.recentContributions?.totalCommitContributions || 0;

        const previousCheckpoint: number = user.githubCommitsTotal || 0;

        let newCommits = 0;

        if (isFirstSync) {
            // First time: only reward last 7 days worth of commits
            newCommits = last7DaysCommits;
        } else {
            // Subsequent syncs: diff against stored checkpoint
            // currentYearTotal can only go UP (GitHub only adds commits, doesn't remove)
            newCommits = Math.max(0, currentYearTotal - previousCheckpoint);
        }

        const pointsEarned = newCommits * 10;
        
        if (newCommits > 0) {
            user.points = (user.points || 0) + pointsEarned;
        }

        // ALWAYS update the checkpoint to current total, so next sync is idempotent
        // Even if we click sync 100 times with no new commits, this stays the same
        // and returns 0 new commits each time.
        user.githubCommitsTotal = currentYearTotal;
        user.lastGithubSyncAt = new Date();
        await user.save();

        return NextResponse.json({
            message: newCommits > 0 ? 'GitHub commits synced!' : 'No new commits since last sync.',
            newCommits,
            pointsEarned,
            totalPoints: user.points,
            isFirstSync
        });

    } catch (error) {
        console.error('Error syncing GitHub:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
