// ============================================
// Workflow Orchestrator - Main Processing Pipeline
// ============================================

import { config } from 'dotenv';
import type {
    CandidateProfile,
    JDSpec,
    ProcessingResult,
} from '../types/index.js';

// Agents
import { createJDRealityAgent } from '../agents/jd-reality-agent.js';
import { createResumeStructuringAgent } from '../agents/resume-structuring-agent.js';
import { createTechnicalCheckingAgent } from '../agents/technical-checking-agent.js';
import { createFounderConfidenceAgent } from '../agents/founder-confidence-agent.js';
import { createAssignmentGenerationAgent } from '../agents/assignment-generation-agent.js';
import { createCandidateFeedbackAgent } from '../agents/candidate-feedback-agent.js';

// Synthesizers
import { createRelevanceSynthesizer } from '../synthesis/relevance-synthesizer.js';
import { createVerdictSynthesizer } from '../synthesis/verdict-synthesizer.js';

// Integrations
import { extractTextFromPDF } from '../integrations/pdf-extractor.js';
import { createSheetsWriter } from '../integrations/google-sheets.js';
import { createEmailNotifier } from '../integrations/email-notifier.js';

config();

interface ResumeInput {
    buffer: Buffer;
    fileId: string;
    fileName: string;
    fileLink: string;
    hash: string;
}

interface JDInput {
    buffer: Buffer;
    fileName: string;
}

export class WorkflowOrchestrator {
    // Agents
    private jdRealityAgent = createJDRealityAgent();
    private resumeStructuringAgent = createResumeStructuringAgent();
    private technicalCheckingAgent = createTechnicalCheckingAgent();
    private founderConfidenceAgent = createFounderConfidenceAgent();
    private assignmentGenerationAgent = createAssignmentGenerationAgent();
    private candidateFeedbackAgent = createCandidateFeedbackAgent();

    // Synthesizers
    private relevanceSynthesizer = createRelevanceSynthesizer();
    private verdictSynthesizer = createVerdictSynthesizer();

    // Integrations
    private sheetsWriter = createSheetsWriter();
    private emailNotifier = createEmailNotifier();

    // Cached JD specs by Campaign ID
    private cachedJDSpecs: Map<string, JDSpec> = new Map();
    private cachedJDHashes: Map<string, string> = new Map();

    async processJD(campaignId: string, jdInput: JDInput): Promise<JDSpec> {
        // Check if we have cached results for this JD in this campaign
        const jdTextRaw = await extractTextFromPDF(jdInput.buffer);
        const jdHash = this.simpleHash(jdTextRaw);

        if (this.cachedJDSpecs.has(campaignId) && this.cachedJDHashes.get(campaignId) === jdHash) {
            return this.cachedJDSpecs.get(campaignId)!;
        }

        console.log(`\n📋 Processing JD for Campaign [${campaignId}]: ${jdInput.fileName}`);

        // Analyze JD with agent
        const jdResult = await this.jdRealityAgent.execute({ jdText: jdTextRaw });
        const jdSpec: JDSpec = {
            ...jdResult.data,
            rawText: jdTextRaw,
        };

        console.log(`  Role Context: ${jdSpec.roleContext}`);
        console.log(`  Criticality Factor: ${jdSpec.criticalityFactor}`);

        // Generate standard assignment for this JD (same for all candidates)
        try {
            const standardAssignment = await this.assignmentGenerationAgent.generateStandardAssignment(jdSpec);
            jdSpec.standardAssignment = standardAssignment;
            console.log(`  📝 Standard Assignment: ${standardAssignment.title}`);
        } catch (error) {
            console.error('  ⚠️ Failed to generate standard assignment:', error);
        }

        // Cache the result (with assignment)
        this.cachedJDSpecs.set(campaignId, jdSpec);
        this.cachedJDHashes.set(campaignId, jdHash);

        return jdSpec;
    }

    async processResume(
        campaign: { id: string; name: string },
        resumeInput: ResumeInput,
        jdSpec: JDSpec
    ): Promise<ProcessingResult | null> {
        console.log(`\n📄 Processing Resume for [${campaign.name}]: ${resumeInput.fileName}`);

        // Check for duplicates first
        const alreadyProcessed = await this.sheetsWriter.isResumeAlreadyProcessed(resumeInput.fileLink, campaign.name);
        if (alreadyProcessed) {
            console.log(`  ⏭️  Skipping - already processed (found in Sheet)`);
            return null;
        }

        // Step 1: Extract resume text
        console.log('  [1/7] Extracting text...');
        const resumeText = await extractTextFromPDF(resumeInput.buffer);

        // Step 2: Structure the resume
        console.log('  [2/7] Structuring resume...');
        const resumeResult = await this.resumeStructuringAgent.execute({
            resumeText,
            resumeFileLink: resumeInput.fileLink,
            resumeHash: resumeInput.hash,
        });
        const candidate = resumeResult.data;
        console.log(`    Name: ${candidate.name}`);
        console.log(`    Email: ${candidate.email || 'Not found'}`);

        // Step 3: Technical evaluation
        console.log('  [3/7] Evaluating technical fit...');
        const technicalResult = await this.technicalCheckingAgent.execute({
            candidate,
            jdSpec,
        });
        const executionFit = technicalResult.data;
        console.log(`    Execution Fit: ${executionFit.score.toFixed(1)}/100`);

        // Step 4: Founder confidence evaluation
        console.log('  [4/7] Evaluating founder confidence...');
        const founderResult = await this.founderConfidenceAgent.execute({
            candidate,
            jdSpec,
        });
        const founderConfidence = founderResult.data;
        console.log(`    Founder Confidence: ${founderConfidence.score.toFixed(1)}/100`);

        // Step 5: Synthesize relevance score
        console.log('  [5/7] Synthesizing relevance...');
        const relevance = this.relevanceSynthesizer.synthesize(
            executionFit,
            founderConfidence,
            jdSpec.criticalityFactor,
            jdSpec.roleContext
        );
        console.log(`    Relevance Score: ${relevance.score.toFixed(1)}/100`);
        console.log(`    Passed Threshold: ${relevance.passedThreshold ? 'Yes ✓' : 'No ✗'}`);

        // Step 6: Generate resume-stage feedback
        console.log('  [6/7] Generating feedback...');
        const feedbackInput = {
            candidate,
            jdSpec,
            executionFit,
            founderConfidence,
            stage: 'resume' as const,
            passedThreshold: relevance.passedThreshold,
        };
        const feedbackResult = await this.candidateFeedbackAgent.execute(feedbackInput);
        const resumeFeedback = feedbackResult.data;

        // Step 7: Use standard assignment from JD (same for all candidates)
        const assignment = jdSpec.standardAssignment;
        if (assignment) {
            console.log(`  [7/7] Using standard assignment: ${assignment.title}`);
        } else {
            console.log('  [7/7] No standard assignment available');
        }

        // Generate verdicts
        const internalVerdict = this.verdictSynthesizer.generateInternalVerdict(
            candidate,
            jdSpec,
            executionFit,
            founderConfidence,
            relevance,
            assignment
        );

        const externalVerdict = this.verdictSynthesizer.generateExternalVerdict(
            resumeFeedback,
            relevance
        );

        const result: ProcessingResult = {
            candidateProfile: candidate,
            jdSpec,
            executionFit,
            founderConfidence,
            relevance,
            resumeFeedback,
            assignment,
            internalVerdict,
            externalVerdict,
        };

        // Save to Google Sheets
        console.log('  💾 Saving to Google Sheets...');
        try {
            await this.sheetsWriter.appendCandidate(internalVerdict, resumeFeedback, undefined, campaign.name);
        } catch (error) {
            console.error('  ⚠️ Failed to save to sheets:', error);
        }

        // Send notifications
        console.log('  📧 Sending notifications...');
        try {
            // Notify founder
            await this.emailNotifier.notifyFounder(internalVerdict);

            // Send candidate feedback
            if (candidate.email) {
                await this.emailNotifier.sendCandidateFeedback(
                    candidate.email,
                    candidate.name,
                    resumeFeedback,
                    externalVerdict.nextSteps
                );
            }
        } catch (error) {
            console.error('  ⚠️ Email notification failed:', error);
        }

        console.log(`✅ Completed processing: ${candidate.name} - ${internalVerdict.recommendation}`);

        return result;
    }

    private simpleHash(text: string): string {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    getRelevanceThreshold(): number {
        return this.relevanceSynthesizer.getThreshold();
    }
}

export function createWorkflowOrchestrator(): WorkflowOrchestrator {
    return new WorkflowOrchestrator();
}
