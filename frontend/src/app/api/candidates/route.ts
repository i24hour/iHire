import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/sheets-client';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const campaign = searchParams.get('campaign') || 'Candidates'; // Default to 'Candidates' tab

    console.log(`API /candidates called for campaign: ${campaign}`);

    try {
        const candidates = await getCandidates(campaign);
        console.log(`Candidates fetched for [${campaign}]:`, candidates.length);
        return NextResponse.json({ candidates });
    } catch (error: any) {
        console.error('Error fetching candidates:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch candidates',
                details: error?.message || String(error),
                candidates: []
            },
            { status: 500 }
        );
    }
}
