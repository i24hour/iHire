import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/sheets-client';

export async function GET() {
    console.log('API /candidates called');
    console.log('ENV SHEETS_ID:', process.env.GOOGLE_SHEETS_OUTPUT_ID ? 'SET' : 'NOT SET');
    console.log('ENV CREDENTIALS:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ? 'SET (length: ' + process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.length + ')' : 'NOT SET');

    try {
        const candidates = await getCandidates();
        console.log('Candidates fetched:', candidates.length);
        return NextResponse.json({ candidates });
    } catch (error) {
        console.error('Error fetching candidates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch candidates', candidates: [] },
            { status: 500 }
        );
    }
}
