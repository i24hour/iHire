
import { SheetsWriter } from '../src/integrations/google-sheets.js';
import { config } from 'dotenv';

config();

async function main() {
    console.log('🔄 Updating Google Sheet headers...');

    try {
        const writer = new SheetsWriter();
        // We need to access the private sheets instance or just use the public methods if available.
        // Since SheetsWriter encapsulates the logic, let's just use the raw googleapis here for the specific update
        // or extend SheetsWriter. 
        // Actually, let's just use the SheetsWriter to get auth and then do a raw update if possible, 
        // but SheetsWriter doesn't expose the client.
        // Let's just copy the auth logic or make a small standalone script that uses the same env vars.

        // Wait, I can just use the SheetsWriter if I modify it to allow header updates, 
        // but for a one-off script, it's easier to just replicate the auth and update.

        // Let's use the existing SheetsWriter class but we might need to make the sheets property public or add a method.
        // Easier: Just create a standalone script that does the auth and update.
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// actually, let's just write a script that imports the auth from a helper or just duplicates it for simplicity 
// since we want to run this via npx tsx.

import { google } from 'googleapis';
import * as fs from 'fs';

async function updateHeaders() {
    console.log('🔄 Connecting to Google Sheets...');

    // Auth logic (copied from google-sheets.ts for standalone execution)
    let auth;
    let credentials = null;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
        credentials = JSON.parse(decoded);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_SERVICE_ACCOUNT_JSON.startsWith('{')) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
        const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || './credentials.json';
        if (fs.existsSync(credentialsPath)) {
            credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
        }
    }

    if (credentials) {
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    } else {
        auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_OUTPUT_ID;

    if (!spreadsheetId) {
        throw new Error('GOOGLE_SHEETS_OUTPUT_ID is not set');
    }

    const HEADERS = [
        'Candidate Name',
        'Email',
        'Phone',
        'Resume File Link',
        'Execution Fit Score',
        'Founder Confidence Score',
        'Relevance Score',
        'Role Context',
        'Interview Focus Areas',
        'Risk Notes',
        'Assignment Brief',
        'Recommendation',
        'Resume Feedback',
        'Assignment Feedback',
        'Timestamp', // Ensure this is here
    ];

    console.log('📝 Updating headers in "Candidates!A1:O1"...');

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Candidates!A1:O1',
        valueInputOption: 'RAW',
        requestBody: {
            values: [HEADERS],
        },
    });

    console.log('✅ Headers updated successfully!');
    console.log('Headers set to:', HEADERS.join(', '));
}

updateHeaders().catch(console.error);
