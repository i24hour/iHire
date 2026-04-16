import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Find the user and unset all github fields + reset points checkpoint
        await User.findOneAndUpdate(
            { email: session.user.email },
            { 
                $unset: { 
                    githubId: "", 
                    githubUsername: "", 
                    githubAccessToken: "", 
                    githubConnectedAt: "",
                    lastGithubSyncAt: "",
                    githubCommitsTotal: "",
                    githubPointsLastUpdatedAt: "",
                    githubSyncLockUntil: ""
                },
                $set: {
                    points: 0  // Reset GitHub gamification points
                }
            },
            { new: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting GitHub:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
