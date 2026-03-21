import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Chain from '@/models/IChain';
import ITimeTask from '@/models/ITimeTask';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectDB();
        let chains = await Chain.find().sort({ maxTime: -1, createdAt: -1 });

        const now = Date.now();
        // Calculate live totalTime for Active status chains
        chains = chains.map((chain: any) => {
            if (chain.status === 'Active' && chain.lastStartedAt) {
                const liveTotalTime = chain.totalTime + Math.floor((now - chain.lastStartedAt) / 1000);
                chain.totalTime = liveTotalTime;
                // Temporarily update maxTime for ranking in UI if it's currently higher
                if (liveTotalTime > (chain.maxTime || 0)) {
                    chain.maxTime = liveTotalTime;
                }
            }
            return chain;
        });

        // Re-sort in memory because live updates might change the order
        chains.sort((a: any, b: any) => (b.maxTime || 0) - (a.maxTime || 0));

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

        // Add creator to the member list if not already there
        const allMemberEmails = [...new Set([...memberEmails, session.user.email])];

        // Get unique users for the emails from our User model
        const members = await Promise.all(allMemberEmails.map(async (email: string) => {
            const user = await User.findOne({ email }).lean() as any;
            
            return {
                userId: email,
                name: user?.username || email.split('@')[0],
                image: user?.image || null,
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
            createdBy: session.user.email, // Optional: tracking who created it
        });

        return NextResponse.json({ chain }, { status: 201 });
    } catch (error) {
        console.error('Error creating chain:', error);
        return NextResponse.json({ error: 'Failed to create chain' }, { status: 500 });
    }
}
