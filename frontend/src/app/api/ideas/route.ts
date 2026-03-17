import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Idea from '@/models/Idea';

export const dynamic = 'force-dynamic';

// GET /api/ideas
// Returns all public ideas + the logged-in user's own private ideas
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        await connectDB();

        let query: any;

        if (session?.user?.email) {
            // Logged in: see all public ideas + own private ideas
            query = {
                $or: [
                    { isPublic: true },
                    { createdBy: session.user.email, isPublic: false },
                ],
            };
        } else {
            // Not logged in: only public ideas
            query = { isPublic: true };
        }

        const ideas = await Idea.find(query).sort({ createdAt: -1 }).lean();

        return NextResponse.json({ ideas });
    } catch (error) {
        console.error('Error fetching ideas:', error);
        return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
    }
}

// POST /api/ideas
// Create a new idea (must be logged in)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, details, isPublic } = body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        await connectDB();

        const idea = await Idea.create({
            title: title.trim(),
            details: (details || '').trim(),
            isPublic: isPublic !== false, // default true
            createdBy: session.user.email,
        });

        return NextResponse.json({ idea }, { status: 201 });
    } catch (error) {
        console.error('Error creating idea:', error);
        return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 });
    }
}
