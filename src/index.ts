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

    // Start polling for new resumes in campaigns
    await driveMonitor.startPolling(async (campaign, jd, resume) => {
        try {
            // Process JD for this campaign (cached internally)
            const jdSpec = await orchestrator.processJD(campaign.id, {
                buffer: jd.buffer,
                fileName: jd.fileName,
            });

            // Process Resume
            await orchestrator.processResume(
                campaign,
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
            console.error(`❌ Failed to process ${resume.file.name} in [${campaign.name}]:`, error);
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
