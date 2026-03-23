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
            if (user.username && user.username !== user.username.toLowerCase()) {
                const oldUsername = user.username;
                user.username = user.username.toLowerCase();
                try {
                    await user.save();
                    results.push({ old: oldUsername, new: user.username, status: 'success' });
                    updatedCount++;
                } catch (err) {
                    results.push({ old: oldUsername, status: 'error', error: err.message });
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
