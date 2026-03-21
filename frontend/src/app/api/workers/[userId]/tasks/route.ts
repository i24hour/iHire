import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import ITimeTask from '@/models/ITimeTask';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> } | { params: { userId: string } }
) {
    try {
        // Authentication intentionally removed so anyone can view a worker's public profile tasks
        // const session = await getServerSession(authOptions);

        // Await params if it's a promise (Next.js 15+ routing)
        const params = await context.params;
        const targetUserId = decodeURIComponent(params.userId);

        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findOne({ email: targetUserId }).lean() as any;

        const tasks = await ITimeTask.find({
            userId: targetUserId,
            isPublic: { $ne: false } // Default is true, so we only filter out explicit false
        }).sort({ createdAt: -1 });

        return NextResponse.json({ 
            tasks, 
            user: {
                username: user?.username || targetUserId.split('@')[0],
                image: user?.image || null
            } 
        });
    } catch (error) {
        console.error('Error fetching tasks for worker:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks for worker' }, { status: 500 });
    }
}
