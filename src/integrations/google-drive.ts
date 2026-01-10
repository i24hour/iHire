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
    private rootFolderId: string;
    private processedHashes: Map<string, ProcessedFile>;
    private hashStorePath: string;

    constructor() {
        // Initialize Google Drive client
        const auth = this.getAuth();
        this.drive = google.drive({ version: 'v3', auth });

        this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';
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

    async listFoldersInRoot(): Promise<DriveFile[]> {
        if (!this.rootFolderId) return [];

        const response = await this.drive.files.list({
            q: `'${this.rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
            orderBy: 'name',
        });

        return (response.data.files || []) as DriveFile[];
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

    async getCampaigns(): Promise<{ id: string; name: string; jdFile?: DriveFile; jdBuffer?: Buffer }[]> {
        const folders = await this.listFoldersInRoot();
        console.log(`📁 Found ${folders.length} folders in root:`, folders.map(f => f.name).join(', '));
        const campaigns = [];

        for (const folder of folders) {
            // Find JD in this folder
            const files = await this.listPDFsInFolder(folder.id);
            console.log(`  📂 Folder [${folder.name}]: ${files.length} PDFs found`);

            // Heuristic: JD is either named "JD" or "Job Description" OR it's the oldest PDF if explicitly marked
            // For now, let's assume the JD has "JD" or "Job Description" in the name (case insensitive)
            // OR if there's only one file and it's a PDF, treat it as JD? No, that's risky.
            // Let's look for "JD" in the name.
            console.log(`    📄 PDFs:`, files.map(f => f.name).join(', '));
            const jdFile = files.find(f =>
                f.name.toLowerCase().includes('jd') ||
                f.name.toLowerCase().includes('job description') ||
                f.name.toLowerCase().includes('job_description')
            );

            if (jdFile) {
                console.log(`    ✅ JD Found: ${jdFile.name}`);
                try {
                    const jdBuffer = await this.downloadFile(jdFile.id);
                    campaigns.push({
                        id: folder.id,
                        name: folder.name,
                        jdFile,
                        jdBuffer
                    });
                } catch (e) {
                    console.error(`Failed to download JD for ${folder.name}:`, e);
                }
            } else {
                // console.log(`No JD found in folder: ${folder.name}`);
            }
        }

        return campaigns;
    }

    async getNewResumesForCampaign(campaignId: string, jdFileId: string): Promise<{ file: DriveFile; buffer: Buffer; hash: string }[]> {
        const files = await this.listPDFsInFolder(campaignId);
        const newFiles: { file: DriveFile; buffer: Buffer; hash: string }[] = [];

        for (const file of files) {
            // Skip the JD file itself
            if (file.id === jdFileId) continue;

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

    async startPolling(
        onNewResume: (campaign: { id: string; name: string }, jd: { buffer: Buffer; fileName: string }, resume: { file: DriveFile; buffer: Buffer; hash: string }) => Promise<void>,
        intervalMs?: number
    ): Promise<void> {
        const interval = intervalMs || parseInt(process.env.DRIVE_POLL_INTERVAL || '30000');

        console.log(`Starting Drive monitor, polling every ${interval / 1000}s...`);

        const poll = async () => {
            try {
                if (!this.rootFolderId) {
                    console.warn('⚠️ GOOGLE_DRIVE_ROOT_FOLDER_ID is not set. Please set it to watch for campaigns.');
                    return;
                }

                const campaigns = await this.getCampaigns();

                for (const campaign of campaigns) {
                    if (!campaign.jdFile || !campaign.jdBuffer) continue;

                    const newResumes = await this.getNewResumesForCampaign(campaign.id, campaign.jdFile.id);

                    for (const resume of newResumes) {
                        console.log(`Processing new resume in [${campaign.name}]: ${resume.file.name}`);
                        await onNewResume(
                            { id: campaign.id, name: campaign.name },
                            { buffer: campaign.jdBuffer, fileName: campaign.jdFile.name },
                            resume
                        );
                        this.markAsProcessed(resume.file.id, resume.hash);
                    }
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
