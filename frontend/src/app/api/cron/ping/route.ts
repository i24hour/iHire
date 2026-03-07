import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// This is an API route specifically designed to be hit by a cron job or uptime monitoring tool
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[CRON] Ping received at', new Date().toISOString());

        // Connect to MongoDB
        await connectDB();

        // Execute a minimal query to keep the database cluster awake
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            await mongoose.connection.db.command({ ping: 1 });
            console.log('[CRON] MongoDB ping successful');
        }

        return NextResponse.json({
            status: 'ok',
            message: 'Site and Database are awake and running',
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
