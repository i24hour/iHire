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
        const { name, members: memberIdentifiers, whatsappLink } = body;

        if (!name || !memberIdentifiers || !Array.isArray(memberIdentifiers)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectDB();

        // Add creator to the member list
        const allMemberIdentifiers = [...new Set([...memberIdentifiers, session.user.email])];

        const membersFromDb = await User.find({
            $or: [
                { email: { $in: allMemberIdentifiers } },
                { username: { $in: allMemberIdentifiers } },
            ],
        }).lean() as any[];

        const resolvedIdentifiers = new Set<string>();
        membersFromDb.forEach((user) => {
            if (user.email) resolvedIdentifiers.add(user.email);
            if (user.username) resolvedIdentifiers.add(user.username);
        });

        const missingIdentifiers = allMemberIdentifiers.filter((identifier) => !resolvedIdentifiers.has(identifier));
        if (missingIdentifiers.length > 0) {
            return NextResponse.json({
                error: `User not found: ${missingIdentifiers.join(', ')}`,
            }, { status: 400 });
        }

        // Get unique users for the identifiers (email or username)
        const members = await Promise.all(allMemberIdentifiers.map(async (identifier: string) => {
            const user = await User.findOne({ 
                $or: [
                    { email: identifier },
                    { username: identifier }
                ] 
            }).lean() as any;
            
            const userId = user!.email;

            return {
                userId: userId,
                name: user?.username || userId.split('@')[0],
                image: user?.image || null,
                isWorking: false,
                contributionTime: 0,
                parentId: userId === session.user?.email ? null : session.user?.email, // Creator is root
                isStarter: true,
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
