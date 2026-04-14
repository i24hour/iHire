import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = (searchParams.get('q') || '').trim();

        if (!query) {
            return NextResponse.json({ users: [] });
        }

        await connectDB();

        const searchRegex = new RegExp(escapeRegex(query), 'i');

        const users = await User.find({
            $or: [
                { username: searchRegex },
                { email: searchRegex }
            ]
        })
        .select('username email image')
        .limit(10)
        .lean() as any[];

        const formattedUsers = users.map(user => ({
            email: user.email,
            username: user.username,
            image: user.image
        }));

        return NextResponse.json({ users: formattedUsers });
    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }
}
