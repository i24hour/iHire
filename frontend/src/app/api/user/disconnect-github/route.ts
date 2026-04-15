import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Find the user and unset all github fields + reset points checkpoint
        const user = await User.findOneAndUpdate(
            { email: session.user.email },
            { 
                $unset: { 
                    githubId: "", 
                    githubUsername: "", 
                    githubAccessToken: "", 
                    lastGithubSyncAt: "",
                    githubCommitsTotal: ""
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
