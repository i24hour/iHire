import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const user = await User.findOne({ email: session.user.email });

        return NextResponse.json({ 
            username: user?.username || '', 
            email: session.user.email 
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username } = await request.json();
        
        if (!username || username.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters long' }, { status: 400 });
        }

        // Basic character validation
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
        }

        await connectDB();

        // Check if username is already taken by someone else
        const existingUser = await User.findOne({ 
            username: { $regex: new RegExp(`^${username}$`, 'i') }, 
            email: { $ne: session.user.email } 
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
        }

        // Upsert the user document
        const updatedUser = await User.findOneAndUpdate(
            { email: session.user.email },
            { $set: { username: username } },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, username: updatedUser.username });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
