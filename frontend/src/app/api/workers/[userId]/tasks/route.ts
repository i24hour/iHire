import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ITimeTask from '@/models/ITimeTask';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        // Authentication intentionally removed so anyone can view a worker's public profile tasks
        // const session = await getServerSession(authOptions);

        const params = await context.params;
        const targetUserId = decodeURIComponent(params.userId);

        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findOne({ email: targetUserId }).lean() as any;

        const tasks = await ITimeTask.find({
            userId: targetUserId
        }).sort({ createdAt: -1 });

        return NextResponse.json({ 
            tasks, 
            user: {
                username: user?.username || targetUserId.split('@')[0],
                image: user?.image || null,
                points: user?.points || 0,
                githubPointsLastUpdatedAt: user?.githubPointsLastUpdatedAt || user?.githubConnectedAt || null
            } 
        });
    } catch (error) {
        console.error('Error fetching tasks for worker:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks for worker' }, { status: 500 });
    }
}
