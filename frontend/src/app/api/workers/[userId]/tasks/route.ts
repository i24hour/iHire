import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import ITimeTask from '@/models/ITimeTask';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> } | { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params if it's a promise (Next.js 15+ routing)
        const params = await context.params;
        const targetUserId = decodeURIComponent(params.userId);

        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        await connectDB();

        const tasks = await ITimeTask.find({
            userId: targetUserId
        }).sort({ createdAt: -1 });

        return NextResponse.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks for worker:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks for worker' }, { status: 500 });
    }
}
