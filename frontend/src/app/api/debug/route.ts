import { NextResponse } from 'next/server';

export async function GET() {
    let clientEmail = 'NOT_SET';
    try {
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
            const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
            const creds = JSON.parse(decoded);
            clientEmail = creds.client_email;
        }
    } catch (e) {
        clientEmail = 'ERROR_PARSING';
    }

    return NextResponse.json({
        sheetsId: process.env.GOOGLE_SHEETS_OUTPUT_ID || 'NOT_SET',
        clientEmail,
        credentialsLength: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ? process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.length : 0,
        nodeEnv: process.env.NODE_ENV,
    });
}
