import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Chain from '@/models/IChain';
import ITimeTask from '@/models/ITimeTask';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const chains = await Chain.find().sort({ createdAt: -1 });
        return NextResponse.json({ chains });
    } catch (error) {
        console.error('Error fetching chains:', error);
        return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, memberEmails, whatsappLink } = body;

        if (!name || !memberEmails || !Array.isArray(memberEmails)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectDB();

        // Get unique users for the emails
        // Since we don't have a formal User model, we'll look at ITimeTask to find names or just use emails
        const members = await Promise.all(memberEmails.map(async (email: string) => {
            // Try to find a task by this user to get their name
            const task = await ITimeTask.findOne({ userId: email });
            return {
                userId: email,
                name: email.split('@')[0],
                isWorking: false,
                contributionTime: 0,
            };
        }));

        const chain = await Chain.create({
            name,
            whatsappLink,
            members,
            status: 'Idle',
            totalTime: 0,
        });

        return NextResponse.json({ chain }, { status: 201 });
    } catch (error) {
        console.error('Error creating chain:', error);
        return NextResponse.json({ error: 'Failed to create chain' }, { status: 500 });
    }
}
