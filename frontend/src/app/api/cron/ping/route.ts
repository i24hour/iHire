import { NextResponse } from 'next/server';

// This is an API route specifically designed to be hit by a cron job or uptime monitoring tool
export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('[CRON] Ping received at', new Date().toISOString());
    return NextResponse.json({
        status: 'ok',
        message: 'Site is awake and running',
        timestamp: new Date().toISOString()
    });
}
