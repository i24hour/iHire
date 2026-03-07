import { NextResponse } from 'next/server';
// import { getCampaigns } from '@/lib/sheets-client';

// Google Sheets integration disabled — was causing Vercel serverless timeout
export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ campaigns: [] });
}
