import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SFTracker from '@/models/SFTracker';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // Fetch all raw SF Tracker docs
        const allTargets = await SFTracker.find().lean() as any[];

        // Fetch all users to map emails to profiles (username, image)
        const allUsers = await User.find().lean() as any[];
        
        // Lazy registration not needed here, assuming they used the app
        const emailToUserMap = new Map();
        allUsers.forEach(u => {
            emailToUserMap.set(u.email, {
                username: u.username,
                image: u.image
            });
        });

        const userStatsMap = new Map<string, any>();

        // Init stats map with all users who have at least an entry, 
        // OR we can include all users overall. Let's include users who have targets.
        for (const target of allTargets) {
            const userId = target.userId;

            if (!userStatsMap.has(userId)) {
                const userData = emailToUserMap.get(userId);
                userStatsMap.set(userId, {
                    userId,
                    username: userData?.username || userId.split('@')[0],
                    image: userData?.image || null,
                    totalTasks: 0,
                    successTasks: 0,
                    failureTasks: 0,
                });
            }

            const stats = userStatsMap.get(userId);
            stats.totalTasks += 1;

            if (target.status === 'Success') {
                stats.successTasks += 1;
            } else if (target.status === 'Failure') {
                stats.failureTasks += 1;
            }
        }

        // Add any existing users who have 0 targets so they show up on ranking with 0
        allUsers.forEach(u => {
            if (!userStatsMap.has(u.email)) {
                userStatsMap.set(u.email, {
                    userId: u.email,
                    username: u.username || u.email.split('@')[0],
                    image: u.image || null,
                    totalTasks: 0,
                    successTasks: 0,
                    failureTasks: 0,
                });
            }
        });

        const leaderboard = Array.from(userStatsMap.values());

        // Sort by Success Tasks descending, then by Total Tasks descending
        leaderboard.sort((a, b) => {
            if (b.successTasks !== a.successTasks) {
                return b.successTasks - a.successTasks;
            }
            return b.totalTasks - a.totalTasks;
        });

        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error('Error fetching global SF Tracker leaderboard:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
