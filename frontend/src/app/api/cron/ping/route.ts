import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import ITimeTask from '@/models/ITimeTask';

// This is an API route specifically designed to be hit by a cron job or uptime monitoring tool
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[CRON] Ping received at', new Date().toISOString());

        // Connect to MongoDB
        await connectDB();

        let autoCompletedCount = 0;

        // Execute a minimal query to keep the database cluster awake
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            await mongoose.connection.db.command({ ping: 1 });
            console.log('[CRON] MongoDB ping successful');
            
            // 400-Hour Safety Clamp
            // Identify and automatically complete any tasks that have been running for >= 400 hours (1,440,000 seconds)
            const activeTasks = await ITimeTask.find({ enabled: true, completed: false });
            const now = Date.now();

            for (const task of activeTasks) {
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
                    const runningSince = (now - task.startTime) / 1000;
                    elapsedSeconds = Math.floor((task.pausedElapsed || 0) + runningSince);
                }

                // Threshold Check: 400 hours = 1,440,000 seconds
                if (elapsedSeconds >= 1440000) {
                    task.completed = true;
                    task.enabled = false;
                    task.completedAt = now;
                    task.pausedElapsed = Math.floor(elapsedSeconds);
                    if (!task.events) task.events = [];
                    task.events.push({ type: 'complete', timestamp: now });
                    await task.save();
                    autoCompletedCount++;
                    console.log(`[CRON] Auto-completed task ${task._id} after exceeding 400 hours of runtime.`);
                }
            }
        }

        return NextResponse.json({
            status: 'ok',
            message: 'Site and Database are awake and running',
            autoCompletedTasks: autoCompletedCount,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('[CRON] Error during ping:', error.message);
        return NextResponse.json({
            status: 'error',
            message: 'Database ping failed',
            error: error.message
        }, { status: 500 });
    }
}
