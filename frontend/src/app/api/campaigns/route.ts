import { NextResponse } from 'next/server';
import { getCampaigns } from '@/lib/sheets-client';

// Increase function timeout for Pro plans (default 10s for Hobby)
export const maxDuration = 30;

export async function GET() {
    console.log('API /campaigns called');
    console.log('GOOGLE_SHEETS_OUTPUT_ID:', process.env.GOOGLE_SHEETS_OUTPUT_ID ? 'SET' : 'NOT SET');

    try {
        const startTime = Date.now();
        const campaigns = await getCampaigns();
        console.log(`Campaigns fetched in ${Date.now() - startTime}ms:`, campaigns);
        return NextResponse.json({ campaigns });
    } catch (error: unknown) {
        console.error('Error fetching campaigns:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            {
                error: 'Failed to fetch campaigns',
                details: message,
                campaigns: []
            },
            { status: 500 }
        );
    }
}
