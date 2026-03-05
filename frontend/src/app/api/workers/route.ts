import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import ITimeTask from '@/models/ITimeTask';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            // For safety, only allow logged-in users to view the workers list
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Aggregate to find all unique users and their task counts
        const workers = await ITimeTask.aggregate([
            {
                $group: {
                    _id: "$userId",
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                        $sum: { $cond: ["$completed", 1, 0] }
                    },
                    lastActive: { $max: "$updatedAt" }
                }
            },
            {
                $project: {
                    userId: "$_id",
                    totalTasks: 1,
                    completedTasks: 1,
                    lastActive: 1,
                    _id: 0
                }
            },
            {
                $sort: { totalTasks: -1 } // Sort by most active
            }
        ]);

        return NextResponse.json({ workers });
    } catch (error) {
        console.error('Error fetching workers:', error);
        return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
    }
}
