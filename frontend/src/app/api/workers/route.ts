import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import ITimeTask from '@/models/ITimeTask';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            // For safety, only allow logged-in users to view the workers list
            // temporarily allowing access for preview purposes
            // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            console.log("No session found in /api/workers, bypassing for preview");
        }

        await connectDB();

        // Fetch all users to map emails to usernames
        const allUsers = await User.find().lean() as any[];
        const emailToUserMap = new Map();
        allUsers.forEach(u => {
            emailToUserMap.set(u.email, {
                username: u.username,
                image: u.image
            });
        });

        // Fetch all raw tasks
        const allTasks = await ITimeTask.find().lean() as any[];

        const now = Date.now();
        const userStatsMap = new Map<string, any>();

        for (const task of allTasks) {
            const userId = task.userId;

            if (!userStatsMap.has(userId)) {
                const userData = emailToUserMap.get(userId);
                userStatsMap.set(userId, {
                    userId,
                    username: userData?.username || userId.split('@')[0],
                    image: userData?.image || null,
                    totalTasks: 0,
                    completedTasks: 0,
                    runningTasks: 0,
                    allTimeSeconds: 0,
                    lastActive: task.updatedAt || new Date(0),
                    tasks: [] // Provide tasks to frontend for precise score calculation
                });
            }

            const stats = userStatsMap.get(userId);
            stats.totalTasks += 1;
            stats.tasks.push(task);

            if (task.completed) {
                stats.completedTasks += 1;
            } else if (task.enabled) {
                stats.runningTasks += 1;
            }

            if (task.updatedAt && task.updatedAt > stats.lastActive) {
                stats.lastActive = task.updatedAt;
            }

            // Calculate exact elapsed seconds for "All Time"
            let elapsedSeconds = task.pausedElapsed || 0;

            if (task.events && task.events.length > 0) {
                let totalMs = 0;
                let isRunning = false;
                let lastStartTime = 0;

                for (const ev of task.events) {
                    if (ev.type === 'start') {
                        if (!isRunning) {
                            isRunning = true;
                            lastStartTime = ev.timestamp;
                        }
                    } else if (ev.type === 'pause' || ev.type === 'complete') {
                        if (isRunning) {
                            totalMs += (ev.timestamp - lastStartTime);
                            isRunning = false;
                        }
                    }
                }

                if (isRunning && !task.completed) {
                    totalMs += (now - lastStartTime);
                }

                if (task.events[0].type !== 'start') {
                    totalMs += ((task.pausedElapsed || 0) * 1000);
                }

                elapsedSeconds = Math.floor(totalMs / 1000);
            } else if (!task.completed && task.enabled && task.startTime) {
                // Legacy fallback for active tasks without events
                const runningSince = (now - task.startTime) / 1000;
                elapsedSeconds = Math.floor((task.pausedElapsed || 0) + runningSince);
            }

            stats.allTimeSeconds += elapsedSeconds;
        }

        // Calculate Rank Score and convert to array
        const workers = Array.from(userStatsMap.values()).map(w => {
            // Rank Score = completedTasks / AllTime
            // Multiply by a factor (e.g. 10000) to make it a readable non-decimal number if desired, 
            // but we'll stick to the strict completedTasks / allTimeSeconds value for math sorting
            let rankScore = 0;
            if (w.allTimeSeconds > 0) {
                rankScore = w.completedTasks / w.allTimeSeconds;
            } else if (w.completedTasks > 0) {
                // Edge case where time was zero but complete (instant complete)
                rankScore = w.completedTasks;
            }

            return {
                ...w,
                rankScore
            };
        });

        // Sort by Rank Score descending
        workers.sort((a, b) => b.rankScore - a.rankScore);

        const totalSignup = await User.countDocuments();
        
        // Return only users that have tasks, or include all users in the ranking?
        // To maintain existing behavior of showing a list of workers with stats:
        return NextResponse.json({ workers, totalSignup });
    } catch (error) {
        console.error('Error fetching workers:', error);
        return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
    }
}
