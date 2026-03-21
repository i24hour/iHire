import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Chain from '@/models/IChain';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chainId: string }> }
) {
    try {
        const { chainId } = await params;
        await connectDB();
        const chain = await Chain.findById(chainId);
        if (!chain) {
            return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
        }
        return NextResponse.json({ chain });
    } catch (error) {
        console.error('Error fetching chain detail:', error);
        return NextResponse.json({ error: 'Failed to fetch chain detail' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ chainId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { chainId } = await params;
        const body = await request.json();
        const { isWorking } = body;

        await connectDB();

        const chain = await Chain.findById(chainId);
        if (!chain) {
            return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
        }

        if (chain.status === 'Burst') {
            return NextResponse.json({ error: 'Chain has already burst' }, { status: 400 });
        }

        const memberIndex = chain.members.findIndex((m: any) => m.userId === session.user?.email);
        if (memberIndex === -1) {
            return NextResponse.json({ error: 'Not a member of this chain' }, { status: 403 });
        }

        const now = Date.now();
        const member = chain.members[memberIndex];

        // Calculation logic
        if (member.isWorking !== isWorking) {
            if (member.isWorking) {
                // Was working, now stopping
                if (member.lastStartedAt) {
                    member.contributionTime += Math.floor((now - member.lastStartedAt) / 1000);
                }
            } else {
                // Was not working, now starting
                member.lastStartedAt = now;
            }
            member.isWorking = isWorking;
        }

        // Update chain total time if it was active
        const currentlyActiveMembersCount = chain.members.filter((m: any) => m.isWorking).length;
        
        if (currentlyActiveMembersCount > 0) {
            if (chain.lastStartedAt) {
                chain.totalTime += Math.floor((now - chain.lastStartedAt) / 1000);
            }
            chain.lastStartedAt = now;
            chain.status = 'Active';
        } else {
            // No one is working
            if (chain.status === 'Active') {
                if (chain.lastStartedAt) {
                    chain.totalTime += Math.floor((now - chain.lastStartedAt) / 1000);
                }
                chain.lastStartedAt = undefined;
                
                // If the last person just stopped, the chain bursts
                if (isWorking === false) {
                    chain.status = 'Burst';
                    chain.burstAt = now;
                } else {
                    chain.status = 'Idle';
                }
            }
        }

        await chain.save();
        return NextResponse.json({ chain });
    } catch (error) {
        console.error('Error updating chain/work status:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ chainId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { chainId } = await params;
        await connectDB();

        const chain = await Chain.findById(chainId);
        if (!chain) {
            return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
        }

        // Only creator can delete, or if createdBy is not set, allow anyone for now (backward compatibility)
        if (chain.createdBy && chain.createdBy !== session.user.email) {
            return NextResponse.json({ error: 'Only the creator can delete this chain' }, { status: 403 });
        }

        await Chain.findByIdAndDelete(chainId);
        return NextResponse.json({ message: 'Chain deleted successfully' });
    } catch (error) {
        console.error('Error deleting chain:', error);
        return NextResponse.json({ error: 'Failed to delete chain' }, { status: 500 });
    }
}
