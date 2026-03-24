import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Chain from '@/models/IChain';
import User from '@/models/User';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const VISIT_WINDOW_MS = 3 * 60 * 60 * 1000;

const enforceVisitWindow = (chain: any, now: number) => {
    let hasTimedOutMember = false;
    let earliestTimeoutAt = now;

    chain.members = chain.members.map((member: any) => {
        if (!member.isWorking || !member.lastStartedAt) return member;

        const lastVisitAt = member.lastVisitAt || member.lastStartedAt;
        const timeoutAt = lastVisitAt + VISIT_WINDOW_MS;
        if (now <= timeoutAt) return member;

        const contributedUntil = Math.max(member.lastStartedAt, timeoutAt);
        const elapsed = Math.floor((contributedUntil - member.lastStartedAt) / 1000);
        if (elapsed > 0) {
            member.contributionTime += elapsed;
        }

        member.isWorking = false;
        member.lastStartedAt = undefined;
        hasTimedOutMember = true;
        earliestTimeoutAt = Math.min(earliestTimeoutAt, timeoutAt);
        return member;
    });

    if (hasTimedOutMember) {
        const activeMembers = chain.members.filter((member: any) => member.isWorking).length;
        if (activeMembers === 0 && chain.status === 'Active') {
            if (chain.lastStartedAt) {
                const chainElapsed = Math.floor((Math.max(chain.lastStartedAt, earliestTimeoutAt) - chain.lastStartedAt) / 1000);
                if (chainElapsed > 0) {
                    chain.totalTime += chainElapsed;
                    if (chain.totalTime > (chain.maxTime || 0)) {
                        chain.maxTime = chain.totalTime;
                    }
                }
            }
            chain.status = 'Burst';
            chain.burstAt = earliestTimeoutAt;
            chain.lastStartedAt = undefined;
        }
    }

    return hasTimedOutMember;
};

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chainId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { chainId } = await params;
        await connectDB();
        const chainDoc = await Chain.findById(chainId) as any;
        const chain = chainDoc?.toObject?.() || chainDoc;
        if (!chain) {
            return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
        }

        const now = Date.now();
        let shouldPersist = false;

        if (session?.user?.email && chainDoc?.members) {
            const visitingMember = chainDoc.members.find((member: any) => member.userId === session.user?.email);
            if (visitingMember && (!visitingMember.lastVisitAt || (now - visitingMember.lastVisitAt) > 60_000)) {
                visitingMember.lastVisitAt = now;
                shouldPersist = true;
            }
        }

        if (chainDoc && enforceVisitWindow(chainDoc, now)) {
            shouldPersist = true;
        }

        if (shouldPersist) {
            await chainDoc.save();
            const refreshed = chainDoc.toObject();
            chain.status = refreshed.status;
            chain.totalTime = refreshed.totalTime;
            chain.maxTime = refreshed.maxTime;
            chain.lastStartedAt = refreshed.lastStartedAt;
            chain.members = refreshed.members;
        }

        // Fetch latest user info (username, image) for all members
        const memberEmails = chain.members.map((m: any) => m.userId);
        const users = await User.find({ email: { $in: memberEmails } }).lean() as any[];
        const emailToUserMap = new Map();
        users.forEach(u => emailToUserMap.set(u.email, u));

        // Calculate live totalTime for Active status
        if (chain.status === 'Active' && chain.lastStartedAt) {
            chain.totalTime += Math.floor((now - chain.lastStartedAt) / 1000);
            chain.lastStartedAt = now;
        }

        // Calculate live contributionTime and update user info for each member
        chain.members = chain.members.map((member: any) => {
            const user = emailToUserMap.get(member.userId);
            if (user) {
                member.name = user.username || member.name;
                member.image = user.image || member.image;
            }

            if (member.isWorking && member.lastStartedAt) {
                member.contributionTime += Math.floor((now - member.lastStartedAt) / 1000);
                member.lastStartedAt = now;
            }
            return member;
        });

        // We don't save back during GET to avoid unnecessary writes, but we return calculated values
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
        const { isWorking, newMemberIdentifier, parentId } = body;

        await connectDB();

        const chain = await Chain.findById(chainId);
        if (!chain) {
            return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
        }

        const memberIndex = chain.members.findIndex((m: any) => m.userId === session.user?.email);
        if (memberIndex === -1) {
            return NextResponse.json({ error: 'Not a member of this chain' }, { status: 403 });
        }

        if (newMemberIdentifier) {
            const memberIdToFind = newMemberIdentifier.trim().toLowerCase();
            // Find the user to add
            const userToAdd = await User.findOne({ 
                $or: [
                    { email: memberIdToFind },
                    { username: { $regex: `^${escapeRegex(memberIdToFind)}$`, $options: 'i' } }
                ] 
            }).lean() as any;

            if (!userToAdd?.email) {
                return NextResponse.json({ error: 'User not found in database' }, { status: 400 });
            }

            const userId = userToAdd.email;

            // Check if already a member
            if (chain.members.find((m: any) => m.userId === userId)) {
                return NextResponse.json({ error: 'User is already a member of this chain' }, { status: 400 });
            }

            chain.members.push({
                userId: userId,
                name: userToAdd?.username || userId.split('@')[0],
                image: userToAdd?.image || null,
                isWorking: false,
                contributionTime: 0,
                lastVisitAt: Date.now(),
                parentId: parentId || session.user?.email,
                isStarter: false,
            });

            await chain.save();
            return NextResponse.json({ chain });
        }

        if (chain.status === 'Burst') {
            return NextResponse.json({ error: 'Chain has already burst' }, { status: 400 });
        }

        const now = Date.now();
        enforceVisitWindow(chain, now);
        const member = chain.members[memberIndex];

        // Calculation logic
        if (isWorking !== undefined && member.isWorking !== isWorking) {
            if (member.isWorking) {
                // Was working, now stopping
                if (member.lastStartedAt) {
                    member.contributionTime += Math.floor((now - member.lastStartedAt) / 1000);
                }
                member.lastStartedAt = undefined;
            } else {
                // Was not working, now starting
                member.lastStartedAt = now;
            }
            member.isWorking = isWorking;
            if (isWorking) {
                member.lastVisitAt = now;
            }
        }

        // Update other working members' contributionTime to now so it's persisted correctly
        chain.members = chain.members.map((m: any, idx: number) => {
            if (idx !== memberIndex && m.isWorking && m.lastStartedAt) {
                m.contributionTime += Math.floor((now - m.lastStartedAt) / 1000);
                m.lastStartedAt = now;
            }
            return m;
        });

        // Update chain total time if it was active
        const currentlyActiveMembersCount = chain.members.filter((m: any) => m.isWorking).length;
        
        if (currentlyActiveMembersCount > 0) {
            if (chain.lastStartedAt) {
                chain.totalTime += Math.floor((now - chain.lastStartedAt) / 1000);
            }
            chain.lastStartedAt = now;
            chain.status = 'Active';
            // Update maxTime if current totalTime is higher
            if (chain.totalTime > (chain.maxTime || 0)) {
                chain.maxTime = chain.totalTime;
            }
        } else {
            // No one is working
            if (chain.status === 'Active') {
                if (chain.lastStartedAt) {
                    chain.totalTime += Math.floor((now - chain.lastStartedAt) / 1000);
                }
                chain.lastStartedAt = undefined;
                
                // Update maxTime before potential burst
                if (chain.totalTime > (chain.maxTime || 0)) {
                    chain.maxTime = chain.totalTime;
                }

                // If the last person just stopped, the chain bursts
                if (isWorking === false) {
                    chain.status = 'Burst';
                    chain.burstAt = now;
                } else {
                    chain.status = 'Idle';
                }
            } else {
                 // Already Idle or just created
                 chain.lastStartedAt = undefined;
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
