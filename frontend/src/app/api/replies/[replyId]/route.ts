import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectMongo from '@/lib/mongodb';
import Reply from '@/models/Reply';

export async function PATCH(req: Request, context: { params: Promise<{ replyId: string }> }) {
    try {
        const { replyId } = await context.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { isPublic } = await req.json();

        await connectMongo();
        
        const reply = await Reply.findById(replyId);
        if (!reply) {
            return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
        }

        if (reply.createdBy !== session.user.email) {
            return NextResponse.json({ error: 'Unauthorized to edit this reply' }, { status: 403 });
        }

        reply.isPublic = isPublic;
        await reply.save();

        return NextResponse.json({ success: true, reply });
    } catch (error) {
        console.error('Failed to update reply:', error);
        return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
    }
}
