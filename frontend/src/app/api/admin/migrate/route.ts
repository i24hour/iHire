import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { buildDefaultUsernameFromEmail, getAvailableUsername } from '@/lib/username';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        // Simple security check: check if the user is Priyanshu (adjust as needed)
        const allowedAdmins = ['priyanshu85953@gmail.com', 'admin@infinwork.app'];
        if (!session || !session.user || !allowedAdmins.includes(session.user.email || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const users = await User.find({ email: { $exists: true, $ne: null } });
        
        let updatedCount = 0;
        const results = [];
        
        for (const user of users) {
            const originalUsername = user.username;
            const normalizedUsername = originalUsername?.trim().toLowerCase();
            const fallbackUsername = buildDefaultUsernameFromEmail(user.email);
            const targetBase = normalizedUsername || fallbackUsername;

            if (!targetBase) {
                continue;
            }

            const needsUpdate = !originalUsername || originalUsername !== targetBase;
            if (needsUpdate) {
                const oldUsername = originalUsername || '(empty)';
                const conflictingUser = await User.findOne({
                    username: targetBase,
                    _id: { $ne: user._id }
                }).lean();

                const finalUsername = conflictingUser
                    ? await getAvailableUsername(targetBase, user.email)
                    : targetBase;

                user.username = finalUsername;
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
