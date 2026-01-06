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
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        year: 'numeric',
        hour12: true,
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

    async initialize(targetSheetName?: string): Promise<void> {
        const sheetName = targetSheetName || this.sheetName;

        try {
            // First, check if the sheet tab exists
            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const sheetExists = spreadsheet.data.sheets?.some(
                (sheet) => sheet.properties?.title === sheetName
            );

            if (!sheetExists) {
                console.log(`Creating new sheet tab: ${sheetName}`);
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: sheetName,
                                    },
                                },
                            },
                        ],
                    },
                });

                // Add headers
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [HEADERS],
                    },
                });
            } else {
                // Check if headers exist
                try {
                    const response = await this.sheets.spreadsheets.values.get({
                        spreadsheetId: this.spreadsheetId,
                        range: `${sheetName}!A1:O1`,
                    });

                    const existingHeaders = response.data.values?.[0];

                    if (!existingHeaders || existingHeaders.length === 0) {
                        // Add headers
                        await this.sheets.spreadsheets.values.update({
                            spreadsheetId: this.spreadsheetId,
                            range: `${sheetName}!A1`,
                            valueInputOption: 'RAW',
                            requestBody: {
                                values: [HEADERS],
                            },
                        });
                        console.log(`Initialized headers for ${sheetName}`);
                    }
                } catch {
                    // Ignore error
                }
            }
        } catch (error) {
            console.error('Error initializing sheet:', error);
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
        assignmentFeedback?: CandidateFeedback,
        campaignName?: string
    ): Promise<void> {
        const targetSheet = campaignName || this.sheetName;
        await this.initialize(targetSheet);

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
            range: `${targetSheet}!A:O`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [row],
            },
        });

        console.log(`Added candidate ${verdict.candidateName} to sheet [${targetSheet}]`);
    }

    async getAllCandidates(campaignName?: string): Promise<Record<string, unknown>[]> {
        const targetSheet = campaignName || this.sheetName;
        await this.initialize(targetSheet);

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${targetSheet}!A:O`,
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
        } catch (error) {
            console.warn(`Could not fetch candidates from [${targetSheet}]:`, error);
            return [];
        }
    }

    /**
     * Check if a resume file link already exists in the Sheet
     * Used to prevent duplicate processing
     */
    /**
     * Check if a resume file link already exists in the Sheet
     * Used to prevent duplicate processing
     */
    async isResumeAlreadyProcessed(resumeFileLink: string, campaignName?: string): Promise<boolean> {
        const targetSheet = campaignName || this.sheetName;
        await this.initialize(targetSheet);

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${targetSheet}!E:E`, // Resume File Link is column E (5th column after Date)
            });

            const rows = response.data.values || [];
            // Skip header row, check if any row contains this file link
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][0].includes(resumeFileLink.split('/d/')[1]?.split('/')[0] || resumeFileLink)) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.warn('Could not check for duplicates:', error);
            return false; // If we can't check, allow processing
        }
    }
}

// Factory function
export function createSheetsWriter(spreadsheetId?: string): SheetsWriter {
    return new SheetsWriter(spreadsheetId);
}
