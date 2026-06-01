import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { ACTIVE_TASK_RUNTIME_LIMIT_SECONDS, autoCancelExpiredActiveTasks } from '@/lib/itime-runtime';

// This is an API route specifically designed to be hit by a cron job or uptime monitoring tool
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[CRON] Ping received at', new Date().toISOString());

        // Connect to MongoDB
        await connectDB();

        let autoCancelledCount = 0;

        // Execute a minimal query to keep the database cluster awake
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            await mongoose.connection.db.command({ ping: 1 });
            console.log('[CRON] MongoDB ping successful');
            
            autoCancelledCount = await autoCancelExpiredActiveTasks();
            if (autoCancelledCount > 0) {
                console.log(`[CRON] Auto-cancelled ${autoCancelledCount} active task(s) after exceeding ${ACTIVE_TASK_RUNTIME_LIMIT_SECONDS / 3600} hours of runtime.`);
            }
        }

        return NextResponse.json({
            status: 'ok',
            message: 'Site and Database are awake and running',
            autoCancelledTasks: autoCancelledCount,
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
