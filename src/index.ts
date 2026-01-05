// ============================================
// Hiring Intelligence System - Entry Point
// ============================================

import { config } from 'dotenv';
import { createServer } from 'http';
import { createDriveMonitor } from './integrations/google-drive.js';
import { createWorkflowOrchestrator } from './workflow/orchestrator.js';
import type { JDSpec } from './types/index.js';

config();

// Health check status
let systemStatus = {
    healthy: true,
    jdLoaded: false,
    lastPoll: null as Date | null,
    processedCount: 0,
};

// Simple HTTP server for Railway health checks
const PORT = process.env.PORT || 3001;
const server = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            ...systemStatus,
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
});

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       🎯 HIRING INTELLIGENCE SYSTEM                        ║');
    console.log('║       Production-Grade Multi-Agent Analysis                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();

    // Initialize components
    const driveMonitor = createDriveMonitor();
    const orchestrator = createWorkflowOrchestrator();

    console.log(`📊 Relevance Threshold: ${orchestrator.getRelevanceThreshold()}`);
    console.log('🔄 Starting continuous monitoring...\n');

    // Get JD first
    let jdSpec: JDSpec | null = null;

    try {
        const jdData = await driveMonitor.getJobDescription();
        if (jdData) {
            jdSpec = await orchestrator.processJD({
                buffer: jdData.buffer,
                fileName: jdData.file.name,
            });
        } else {
            console.error('❌ No Job Description found. Please upload a JD PDF to the /Job_Description folder.');
            console.log('   Waiting for JD to be uploaded...\n');
        }
    } catch (error) {
        console.error('❌ Failed to load JD:', error);
        process.exit(1);
    }

    // Start polling for new resumes
    await driveMonitor.startPolling(async (resume) => {
        // Check for JD if we don't have one
        if (!jdSpec) {
            const jdData = await driveMonitor.getJobDescription();
            if (jdData) {
                jdSpec = await orchestrator.processJD({
                    buffer: jdData.buffer,
                    fileName: jdData.file.name,
                });
            } else {
                console.warn('⚠️ Skipping resume - no JD available');
                return;
            }
        }

        try {
            await orchestrator.processResume(
                {
                    buffer: resume.buffer,
                    fileId: resume.file.id,
                    fileName: resume.file.name,
                    fileLink: resume.file.webViewLink || '',
                    hash: resume.hash,
                },
                jdSpec
            );
        } catch (error) {
            console.error(`❌ Failed to process ${resume.file.name}:`, error);
        }
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Received SIGTERM, shutting down...');
    process.exit(0);
});

// Run
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
