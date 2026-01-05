import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        sheetsId: process.env.GOOGLE_SHEETS_OUTPUT_ID ? 'SET' : 'NOT_SET',
        credentials: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ?
            `SET (${process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.length} chars)` :
            'NOT_SET',
        nodeEnv: process.env.NODE_ENV,
    });
}
