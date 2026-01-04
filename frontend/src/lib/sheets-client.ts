// ============================================
// Google Sheets Client for Frontend
// ============================================

import { google, sheets_v4 } from 'googleapis';

export interface CandidateRecord {
    id: number;
    candidateName: string;
    email: string;
    phone: string;
    resumeFileLink: string;
    executionFitScore: number;
    founderConfidenceScore: number;
    relevanceScore: number;
    roleContext: string;
    interviewFocusAreas: string;
    riskNotes: string;
    assignmentBrief: string;
    recommendation: string;
    resumeFeedback: string;
    assignmentFeedback: string;
    timestamp: string;
}

export async function getCandidates(): Promise<CandidateRecord[]> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_OUTPUT_ID || '';

    if (!spreadsheetId) {
        console.error('GOOGLE_SHEETS_OUTPUT_ID not configured');
        return [];
    }

    let auth;

    try {
        let credentials = null;

        // Method 1: Base64 encoded credentials (for Vercel/serverless)
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
            const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
            credentials = JSON.parse(decoded);
        }

        // Method 2: Direct JSON string (alternative for serverless)
        else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_SERVICE_ACCOUNT_JSON.startsWith('{')) {
            credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        }

        // Method 3: File path (for local development)
        else {
            const fs = await import('fs');
            const path = await import('path');

            const possiblePaths = [
                process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
                path.join(process.cwd(), 'credentials.json'),
                path.join(process.cwd(), '..', 'credentials.json'),
            ].filter(p => p);

            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    credentials = JSON.parse(fs.readFileSync(p, 'utf-8'));
                    break;
                }
            }
        }

        if (credentials) {
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
        } else {
            console.error('No credentials found (file, base64, or JSON string)');
            return [];
        }
    } catch (error) {
        console.error('Error loading credentials:', error);
        return [];
    }

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Candidates!A:O',
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) {
            console.log('No candidate data in sheet yet');
            return [];
        }

        console.log(`Fetched ${rows.length - 1} candidates from Google Sheets`);

        return rows.slice(1).map((row, index) => ({
            id: index + 1,
            candidateName: row[0] || '',
            email: row[1] || '',
            phone: row[2] || '',
            resumeFileLink: row[3] || '',
            executionFitScore: parseFloat(row[4]) || 0,
            founderConfidenceScore: parseFloat(row[5]) || 0,
            relevanceScore: parseFloat(row[6]) || 0,
            roleContext: row[7] || '',
            interviewFocusAreas: row[8] || '',
            riskNotes: row[9] || '',
            assignmentBrief: row[10] || '',
            recommendation: row[11] || '',
            resumeFeedback: row[12] || '',
            assignmentFeedback: row[13] || '',
            timestamp: row[14] || '',
        }));
    } catch (error) {
        console.error('Failed to fetch candidates from sheet:', error);
        return [];
    }
}
