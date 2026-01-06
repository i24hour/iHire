import { NextResponse } from 'next/server';
import { getCampaigns } from '@/lib/sheets-client';

export async function GET() {
    console.log('API /campaigns called');

    try {
        const campaigns = await getCampaigns();
        console.log('Campaigns fetched:', campaigns);
        return NextResponse.json({ campaigns });
    } catch (error: any) {
        console.error('Error fetching campaigns:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch campaigns',
                details: error?.message || String(error),
                campaigns: []
            },
            { status: 500 }
        );
    }
}
