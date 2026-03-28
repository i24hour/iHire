import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SFTracker from '@/models/SFTracker';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const decodedUserId = decodeURIComponent(userId);
        
        await connectDB();

        // 1. Fetch User Profile mapping directly for metadata
        const profile = await User.findOne({ email: decodedUserId }).lean() as any;
        const userProfile = {
            username: profile?.username || decodedUserId.split('@')[0],
            image: profile?.image || null,
            email: decodedUserId
        };

        // 2. Fetch User's SF targets mapping
        const rawTargets = await SFTracker.find({ userId: decodedUserId }).sort({ createdAt: -1 }).lean() as any[];

        // 3. SECURE DATA SCRUBBING
        // We MUST enforce privacy. No target strings, success conditions, or failure reasons leak here.
        const sanitizedTargets = rawTargets.map(target => ({
            _id: target._id,
            status: target.status,
            createdAt: target.createdAt,
            updatedAt: target.updatedAt,
            // Censorship Overrides:
            target: "🔒 Hidden for Privacy",
            successCondition: "🔒 Classified Objective",
            failureReason: target.failureReason ? "🔒 Private Reflection Logged" : ""
        }));

        // Compute aggregations directly
        const stats = {
            totalTasks: sanitizedTargets.length,
            successTasks: sanitizedTargets.filter(t => t.status === 'Success').length,
            failureTasks: sanitizedTargets.filter(t => t.status === 'Failure').length,
        };

        return NextResponse.json({
            user: userProfile,
            stats,
            targets: sanitizedTargets
        });

    } catch (error) {
        console.error('Error fetching Read-Only user SF data:', error);
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
}
