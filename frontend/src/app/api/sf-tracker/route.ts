import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import SFTracker from '@/models/SFTracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const targets = await SFTracker.find({ userId: session.user.email }).sort({ createdAt: -1 });

        return NextResponse.json({ targets });
    } catch (error) {
        console.error('Error fetching SF Tracker targets:', error);
        return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { target, successCondition } = body;

        if (!target?.trim() || !successCondition?.trim()) {
            return NextResponse.json({ error: 'Target and success condition are required' }, { status: 400 });
        }

        await connectDB();
        
        const newTarget = await SFTracker.create({
            userId: session.user.email,
            target: target.trim(),
            successCondition: successCondition.trim(),
            status: 'Pending',
        });

        return NextResponse.json({ target: newTarget }, { status: 201 });
    } catch (error) {
        console.error('Error creating SF Tracker target:', error);
        return NextResponse.json({ error: 'Failed to create target' }, { status: 500 });
    }
}
