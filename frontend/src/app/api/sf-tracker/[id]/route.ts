import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import SFTracker from '@/models/SFTracker';

export const dynamic = 'force-dynamic';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, failureReason } = body;

        if (!['Success', 'Failure'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        if (status === 'Failure' && !failureReason?.trim()) {
            return NextResponse.json({ error: 'Failure reason is required when marking as Failure' }, { status: 400 });
        }

        await connectDB();

        const target = await SFTracker.findById(id);
        if (!target) {
            return NextResponse.json({ error: 'Target not found' }, { status: 404 });
        }

        if (target.userId !== session.user.email) {
            return NextResponse.json({ error: 'Unauthorized to modify this target' }, { status: 403 });
        }

        target.status = status;
        if (status === 'Failure') {
            target.failureReason = failureReason.trim();
        }

        await target.save();

        return NextResponse.json({ target });
    } catch (error) {
        console.error('Error updating SF Tracker target:', error);
        return NextResponse.json({ error: 'Failed to update target' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const target = await SFTracker.findById(id);
        if (!target) {
            return NextResponse.json({ error: 'Target not found' }, { status: 404 });
        }

        if (target.userId !== session.user.email) {
            return NextResponse.json({ error: 'Unauthorized to delete this target' }, { status: 403 });
        }

        await SFTracker.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Target deleted successfully' });
    } catch (error) {
        console.error('Error deleting SF Tracker target:', error);
        return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 });
    }
}
