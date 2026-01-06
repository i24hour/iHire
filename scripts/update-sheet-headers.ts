// Script to update Google Sheet headers with Date as first column
import { google } from 'googleapis';
import * as fs from 'fs';
import { config } from 'dotenv';

config();

const HEADERS = [
    'Date',
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
];

async function updateHeaders() {
    console.log('🔄 Setting up new Google Sheet headers...');

    // Auth
    let credentials = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
        credentials = JSON.parse(decoded);
    } else {
        const credentialsPath = './credentials.json';
        if (fs.existsSync(credentialsPath)) {
            credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
        }
    }

    if (!credentials) {
        throw new Error('No credentials found');
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_OUTPUT_ID;

    if (!spreadsheetId) {
        throw new Error('GOOGLE_SHEETS_OUTPUT_ID is not set');
    }

    console.log('📝 Writing headers to "Candidates!A1:O1"...');

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Candidates!A1:O1',
        valueInputOption: 'RAW',
        requestBody: {
            values: [HEADERS],
        },
    });

    console.log('✅ Headers updated successfully!');
    console.log('New column order:');
    HEADERS.forEach((h, i) => console.log(`  ${String.fromCharCode(65 + i)}: ${h}`));
}

updateHeaders().catch(console.error);
