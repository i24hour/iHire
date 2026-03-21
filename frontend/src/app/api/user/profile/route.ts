import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Chain from '@/models/IChain';
import ITimeTask from '@/models/ITimeTask';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { image } = await request.json();
        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        // Validate image is Base64 (simple check)
        if (!image.startsWith('data:image/')) {
            return NextResponse.json({ error: 'Invalid image format. Expected Base64 data URL.' }, { status: 400 });
        }

        await connectDB();

        const userEmail = session.user.email;

        // Update all chains where this user is a member
        // MongoDB updateMany with array filters is powerful for this
        await Chain.updateMany(
            { 'members.userId': userEmail },
            { $set: { 'members.$[elem].image': image } },
            { arrayFilters: [{ 'elem.userId': userEmail }] }
        );

        // Note: Since we don't have a User model, we might want to store it in ITimeTask as well 
        // if we ever use that as a source of truth for user info.
        // But for now, updating all chains is the most direct way to satisfy the requirement.

        return NextResponse.json({ success: true, image });
    } catch (error) {
        console.error('Error updating profile image:', error);
        return NextResponse.json({ error: 'Failed to update profile image' }, { status: 500 });
    }
}
