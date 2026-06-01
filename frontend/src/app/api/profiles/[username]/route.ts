import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { serializePublicProfile } from '@/lib/profile-utils';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;
        await connectDB();

        const user = await User.findOne({ username: username.toLowerCase() }).lean();
        if (!user) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const profile = serializePublicProfile(user as Parameters<typeof serializePublicProfile>[0]);
        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        return NextResponse.json({ profile });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}
