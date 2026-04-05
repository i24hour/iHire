import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Idea from '@/models/Idea';
import Reply from '@/models/Reply';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

// GET /api/ideas/[ideaId]/replies
// Rules:
// - Public replies: everyone can see if the idea is public or they are the idea owner
// - Private replies: only the creator of the reply and the owner of the idea can see
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ideaId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { ideaId } = await params;
        await connectDB();

        const idea = await Idea.findById(ideaId);
        if (!idea) {
            return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
        }

        const userEmail = session?.user?.email;
        const isIdeaOwner = userEmail === idea.createdBy;

        let query: any = { ideaId };

        if (isIdeaOwner) {
            // Idea owner can see ALL replies to their idea
            // No additional filter needed beyond ideaId
        } else if (userEmail) {
            // Logged in user: see public replies OR their own private replies
            query.$or = [
                { isPublic: true },
                { createdBy: userEmail, isPublic: false },
            ];
        } else {
            // Not logged in: only public replies
            query.isPublic = true;
        }

        const replies = await Reply.find(query).sort({ createdAt: 1 }).lean();

        // Attach usernames to replies
        const userEmails = Array.from(new Set(replies.map((r: any) => r.createdBy)));
        const users = await User.find({ userId: { $in: userEmails } }, 'userId username').lean();
        const userMap = users.reduce((acc: any, user: any) => {
            acc[user.userId] = user.username || user.userId;
            return acc;
        }, {});

        const repliesWithUsernames = replies.map((r: any) => ({
            ...r,
            username: userMap[r.createdBy] || r.createdBy,
        }));

        return NextResponse.json({ replies: repliesWithUsernames });
    } catch (error) {
        console.error('Error fetching replies:', error);
        return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }
}

// POST /api/ideas/[ideaId]/replies
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ ideaId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ideaId } = await params;
        const body = await request.json();
        const { content, isPublic } = body;

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
        }

        await connectDB();

        const idea = await Idea.findById(ideaId);
        if (!idea) {
            return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
        }

        const reply = await Reply.create({
            ideaId,
            content: content.trim(),
            createdBy: session.user.email,
            isPublic: isPublic !== false, // default true
        });

        return NextResponse.json({ reply }, { status: 201 });
    } catch (error) {
        console.error('Error creating reply:', error);
        return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }
}
