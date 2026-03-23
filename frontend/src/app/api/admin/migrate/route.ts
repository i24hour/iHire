import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        // Simple security check: check if the user is Priyanshu (adjust as needed)
        const allowedAdmins = ['priyanshu85953@gmail.com', 'admin@infinwork.app'];
        if (!session || !session.user || !allowedAdmins.includes(session.user.email || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const users = await User.find({ username: { $exists: true, $ne: null } });
        
        let updatedCount = 0;
        const results = [];
        
        for (const user of users) {
            const normalizedUsername = user.username?.trim().toLowerCase();
            if (normalizedUsername && user.username !== normalizedUsername) {
                const oldUsername = user.username;
                const conflictingUser = await User.findOne({
                    username: normalizedUsername,
                    _id: { $ne: user._id }
                }).lean();

                if (conflictingUser) {
                    results.push({
                        old: oldUsername,
                        new: normalizedUsername,
                        status: 'error',
                        error: 'Conflict: normalized username already exists'
                    });
                    continue;
                }

                user.username = normalizedUsername;
                try {
                    await user.save();
                    results.push({ old: oldUsername, new: user.username, status: 'success' });
                    updatedCount++;
                } catch (err: any) {
                    results.push({ old: oldUsername, status: 'error', error: err?.message || 'Failed to update username' });
                }
            }
        }
        
        return NextResponse.json({ 
            message: `Migration completed. Updated ${updatedCount} users.`,
            results 
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
