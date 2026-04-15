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

        // Determine the 'from' date for the GraphQL query
        const lastSyncDate = user.lastGithubSyncAt ? new Date(user.lastGithubSyncAt) : null;
        
        // If it's the first sync, we only want to reward commits from the last 7 days so they don't get massive points
        let fromDate = lastSyncDate;
        if (!fromDate) {
            fromDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
        } else {
            // Add 1 second so we don't accidentally double-count a commit that occurred at the exact millisecond of the last sync
            fromDate = new Date(fromDate.getTime() + 1000);
        }

        // GraphQL Query for contributionsCollection
        const query = `
          query($login: String!, $from: DateTime!) {
            user(login: $login) {
              contributionsCollection(from: $from) {
                totalCommitContributions
              }
            }
          }
        `;

        const variables = {
            login: user.githubUsername,
            from: fromDate.toISOString()
        };

        const githubRes = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: user.githubAccessToken ? {
                'Authorization': `Bearer ${user.githubAccessToken}`,
                'Content-Type': 'application/json'
            } : {
                'Content-Type': 'application/json' // Will likely fail without token, but fallback
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

        const totalNewCommits = jsonRes.data?.user?.contributionsCollection?.totalCommitContributions || 0;
        const pointsEarned = totalNewCommits * 10;
        
        // Update user
        user.points = (user.points || 0) + pointsEarned;
        
        // Save the exact current time as the new sync cursor
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
