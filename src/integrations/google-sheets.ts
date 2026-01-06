// ============================================
// Google Sheets Integration - Output Storage
// ============================================

import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import { config } from 'dotenv';
import type { InternalVerdict, CandidateFeedback } from '../types/index.js';

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

function formatReadableDate(date: Date): string {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        year: 'numeric',
    });
}

export class SheetsWriter {
    private sheets: sheets_v4.Sheets;
    private spreadsheetId: string;
    private sheetName: string;
    private initialized: boolean = false;

    constructor(spreadsheetId?: string, sheetName: string = 'Candidates') {
        const auth = this.getAuth();
        this.sheets = google.sheets({ version: 'v4', auth });
        this.spreadsheetId = spreadsheetId || process.env.GOOGLE_SHEETS_OUTPUT_ID || '';
        this.sheetName = sheetName;
    }

    private getAuth() {
        let credentials = null;

        // Method 1: Base64 encoded credentials (for Railway/serverless)
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
            const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
            credentials = JSON.parse(decoded);
        }

        // Method 2: Direct JSON string
        else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_SERVICE_ACCOUNT_JSON.startsWith('{')) {
            credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        }

        // Method 3: File path (for local development)
        else {
            const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || './credentials.json';
            if (fs.existsSync(credentialsPath)) {
                credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
            }
        }

        if (credentials) {
            return new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
        }

        return new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // First, check if the sheet tab exists
            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const sheetExists = spreadsheet.data.sheets?.some(
                (sheet) => sheet.properties?.title === this.sheetName
            );

            // Create sheet if it doesn't exist
            if (!sheetExists) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: this.sheetName,
                                    },
                                },
                            },
                        ],
                    },
                });
                console.log(`Created new sheet tab: ${this.sheetName}`);
            }

            // Check if headers exist
            try {
                const response = await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: `${this.sheetName}!A1:O1`,
                });

                const existingHeaders = response.data.values?.[0];

                if (!existingHeaders || existingHeaders.length === 0) {
                    // Add headers
                    await this.sheets.spreadsheets.values.update({
                        spreadsheetId: this.spreadsheetId,
                        range: `${this.sheetName}!A1`,
                        valueInputOption: 'RAW',
                        requestBody: {
                            values: [HEADERS],
                        },
                    });
                    console.log('Initialized sheet with headers');
                }
            } catch {
                // Sheet newly created, add headers
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${this.sheetName}!A1`,
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [HEADERS],
                    },
                });
                console.log('Initialized sheet with headers');
            }

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing sheets:', error);
            throw error;
        }
    }

    private formatFeedback(feedback: CandidateFeedback): string {
        const parts: string[] = [];

        if (feedback.strengths.length > 0) {
            parts.push(`STRENGTHS:\n${feedback.strengths.map(s => `• ${s}`).join('\n')}`);
        }

        if (feedback.gaps.length > 0) {
            parts.push(`GAPS:\n${feedback.gaps.map(g => `• ${g}`).join('\n')}`);
        }

        if (feedback.recommendations.length > 0) {
            parts.push(`RECOMMENDATIONS:\n${feedback.recommendations.map(r => `• ${r}`).join('\n')}`);
        }

        if (feedback.growthTrajectoryNote) {
            parts.push(`GROWTH NOTE: ${feedback.growthTrajectoryNote}`);
        }

        return parts.join('\n\n');
    }

    async appendCandidate(
        verdict: InternalVerdict,
        resumeFeedback: CandidateFeedback,
        assignmentFeedback?: CandidateFeedback
    ): Promise<void> {
        await this.initialize();

        const row = [
            formatReadableDate(verdict.timestamp),
            verdict.candidateName,
            verdict.email || '',
            verdict.phone || '',
            verdict.resumeFileLink,
            verdict.executionFitScore.score.toFixed(1),
            verdict.founderConfidenceScore.score.toFixed(1),
            verdict.relevanceScore.score.toFixed(1),
            verdict.founderConfidenceScore.roleContext,
            verdict.interviewFocusAreas.join('; '),
            verdict.riskNotes.join('; '),
            verdict.assignment ? verdict.assignment.title : '',
            verdict.recommendation,
            this.formatFeedback(resumeFeedback),
            assignmentFeedback ? this.formatFeedback(assignmentFeedback) : '',
        ];

        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!A:O`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [row],
            },
        });

        console.log(`Added candidate ${verdict.candidateName} to sheet`);
    }

    async getAllCandidates(): Promise<Record<string, unknown>[]> {
        await this.initialize();

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!A:O`,
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) return []; // Only headers or empty

        const headers = rows[0];
        const candidates = rows.slice(1).map((row, index) => {
            const candidate: Record<string, unknown> = { id: index + 1 };
            headers.forEach((header: string, i: number) => {
                candidate[header.replace(/ /g, '_').toLowerCase()] = row[i] || '';
            });
            return candidate;
        });

        return candidates;
    }
}

// Factory function
export function createSheetsWriter(spreadsheetId?: string): SheetsWriter {
    return new SheetsWriter(spreadsheetId);
}
