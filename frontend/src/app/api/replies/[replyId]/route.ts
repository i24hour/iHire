import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Reply from '@/models/Reply';

export const dynamic = 'force-dynamic';

// PATCH /api/replies/[replyId]
// Allows the creator of the reply to toggle visibility (public/private)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ replyId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { replyId } = await params;
        const body = await request.json();
        const { isPublic } = body;

        if (typeof isPublic !== 'boolean') {
            return NextResponse.json({ error: 'isPublic (boolean) is required' }, { status: 400 });
        }

        await connectDB();

        const reply = await Reply.findById(replyId);
        if (!reply) {
            return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
        }

        // Only the creator can change the privacy
        if (reply.createdBy !== session.user.email) {
            return NextResponse.json({ error: 'Only the creator can change privacy' }, { status: 403 });
        }

        reply.isPublic = isPublic;
        await reply.save();

        return NextResponse.json({ 
            success: true, 
            reply: { 
                _id: reply._id, 
                isPublic: reply.isPublic 
            } 
        });
    } catch (error) {
        console.error('Error updating reply privacy:', error);
        return NextResponse.json({ error: 'Failed to update reply privacy' }, { status: 500 });
    }
}
