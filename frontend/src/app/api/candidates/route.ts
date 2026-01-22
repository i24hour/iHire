import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/sheets-client';

// Increase function timeout for Pro plans (default 10s for Hobby)
export const maxDuration = 30;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const campaign = searchParams.get('campaign') || 'Candidates'; // Default to 'Candidates' tab

    console.log(`API /candidates called for campaign: ${campaign}`);
    console.log('GOOGLE_SHEETS_OUTPUT_ID:', process.env.GOOGLE_SHEETS_OUTPUT_ID ? 'SET' : 'NOT SET');
    console.log('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ? 'SET' : 'NOT SET');

    try {
        const startTime = Date.now();
        const candidates = await getCandidates(campaign);
        console.log(`Candidates fetched for [${campaign}] in ${Date.now() - startTime}ms:`, candidates.length);
        return NextResponse.json({ candidates });
    } catch (error: unknown) {
        console.error('Error fetching candidates:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            {
                error: 'Failed to fetch candidates',
                details: message,
                candidates: []
            },
            { status: 500 }
        );
    }
}
