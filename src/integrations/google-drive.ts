// ============================================
// Google Drive Integration - Continuous Monitoring
// ============================================

import { google, drive_v3 } from 'googleapis';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config();

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    webViewLink?: string;
}

interface ProcessedFile {
    fileId: string;
    hash: string;
    processedAt: Date;
}

export class DriveMonitor {
    private drive: drive_v3.Drive;
    private resumesFolderId: string;
    private jdFolderId: string;
    private processedHashes: Map<string, ProcessedFile>;
    private hashStorePath: string;

    constructor() {
        // Initialize Google Drive client
        const auth = this.getAuth();
        this.drive = google.drive({ version: 'v3', auth });

        this.resumesFolderId = process.env.GOOGLE_DRIVE_RESUMES_FOLDER_ID || '';
        this.jdFolderId = process.env.GOOGLE_DRIVE_JD_FOLDER_ID || '';
        this.hashStorePath = path.join(process.cwd(), '.processed_hashes.json');
        this.processedHashes = this.loadProcessedHashes();
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
                scopes: [
                    'https://www.googleapis.com/auth/drive.readonly',
                    'https://www.googleapis.com/auth/spreadsheets',
                ],
            });
        }

        // Fallback to application default credentials
        console.warn('No credentials found, using application default');
        return new google.auth.GoogleAuth({
            scopes: [
                'https://www.googleapis.com/auth/drive.readonly',
                'https://www.googleapis.com/auth/spreadsheets',
            ],
        });
    }

    private loadProcessedHashes(): Map<string, ProcessedFile> {
        try {
            if (fs.existsSync(this.hashStorePath)) {
                const data = JSON.parse(fs.readFileSync(this.hashStorePath, 'utf-8'));
                return new Map(Object.entries(data));
            }
        } catch (error) {
            console.warn('Could not load processed hashes, starting fresh:', error);
        }
        return new Map();
    }

    private saveProcessedHashes(): void {
        const data = Object.fromEntries(this.processedHashes);
        fs.writeFileSync(this.hashStorePath, JSON.stringify(data, null, 2));
    }

    async listPDFsInFolder(folderId: string): Promise<DriveFile[]> {
        const response = await this.drive.files.list({
            q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
            fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
            orderBy: 'modifiedTime desc',
        });

        return (response.data.files || []) as DriveFile[];
    }

    async downloadFile(fileId: string): Promise<Buffer> {
        const response = await this.drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );

        return Buffer.from(response.data as ArrayBuffer);
    }

    computeHash(buffer: Buffer): string {
        return createHash('sha256').update(buffer).digest('hex');
    }

    isAlreadyProcessed(hash: string): boolean {
        return this.processedHashes.has(hash);
    }

    markAsProcessed(fileId: string, hash: string): void {
        this.processedHashes.set(hash, {
            fileId,
            hash,
            processedAt: new Date(),
        });
        this.saveProcessedHashes();
    }

    async getNewResumes(): Promise<{ file: DriveFile; buffer: Buffer; hash: string }[]> {
        const files = await this.listPDFsInFolder(this.resumesFolderId);
        const newFiles: { file: DriveFile; buffer: Buffer; hash: string }[] = [];

        for (const file of files) {
            try {
                const buffer = await this.downloadFile(file.id);
                const hash = this.computeHash(buffer);

                if (!this.isAlreadyProcessed(hash)) {
                    newFiles.push({ file, buffer, hash });
                }
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
            }
        }

        return newFiles;
    }

    async getJobDescription(): Promise<{ file: DriveFile; buffer: Buffer } | null> {
        const files = await this.listPDFsInFolder(this.jdFolderId);

        if (files.length === 0) {
            console.warn('No JD PDF found in the JD folder');
            return null;
        }

        // Get the most recently modified JD
        const latestJD = files[0];
        const buffer = await this.downloadFile(latestJD.id);

        return { file: latestJD, buffer };
    }

    async startPolling(
        onNewResume: (resume: { file: DriveFile; buffer: Buffer; hash: string }) => Promise<void>,
        intervalMs?: number
    ): Promise<void> {
        const interval = intervalMs || parseInt(process.env.DRIVE_POLL_INTERVAL || '30000');

        console.log(`Starting Drive monitor, polling every ${interval / 1000}s...`);

        const poll = async () => {
            try {
                const newResumes = await this.getNewResumes();

                for (const resume of newResumes) {
                    console.log(`Processing new resume: ${resume.file.name}`);
                    await onNewResume(resume);
                    this.markAsProcessed(resume.file.id, resume.hash);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        // Initial poll
        await poll();

        // Continue polling
        setInterval(poll, interval);
    }
}

// Factory function
export function createDriveMonitor(): DriveMonitor {
    return new DriveMonitor();
}
