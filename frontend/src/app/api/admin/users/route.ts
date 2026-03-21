import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        // This is a sensitive route, but user asked for it to see the database.
        // In a real app, you'd check for an admin flag here.
        // For now, we allow it so the user can verify their data.

        await connectDB();
        const users = await User.find().sort({ createdAt: -1 }).lean();
        
        return NextResponse.json({ 
            count: users.length,
            users 
        });
    } catch (error) {
        console.error('Error in admin users API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
