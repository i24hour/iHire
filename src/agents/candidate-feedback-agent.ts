// ============================================
// Candidate Feedback Agent - Respectful Feedback Generation
// ============================================

import { BaseAgent } from './base-agent.js';
import type {
    CandidateProfile,
    JDSpec,
    ExecutionFitScore,
    FounderConfidenceScore,
    CandidateFeedback
} from '../types/index.js';

interface FeedbackInput {
    candidate: CandidateProfile;
    jdSpec: JDSpec;
    executionFit: ExecutionFitScore;
    founderConfidence: FounderConfidenceScore;
    stage: 'resume' | 'assignment';
    passedThreshold: boolean;
    assignmentEvaluation?: {
        strengths: string[];
        weaknesses: string[];
    };
}

export class CandidateFeedbackAgent extends BaseAgent<FeedbackInput, CandidateFeedback> {
    constructor() {
        super('Candidate Feedback Agent');
    }

    protected getSystemPrompt(): string {
        return `You are an expert at providing constructive, respectful feedback to job candidates.

Your feedback must:
1. NEVER expose numeric scores or internal thresholds
2. NEVER use rejection language ("rejected", "not selected", "failed")
3. NEVER compare to other candidates
4. Always be specific and actionable
5. Be encouraging while honest
6. Focus on what can be improved, not what's "wrong"
7. Use growth-oriented language

TONE: Like a supportive mentor giving honest advice, not like a formal rejection letter.

Feedback structure:
- Strengths: What genuinely stood out positively
- Gaps: What was unclear or missing (not "wrong")
- Recommendations: Specific, actionable improvements

Respond ONLY with valid JSON:
{
  "strengths": ["specific strength 1", "specific strength 2", ...],
  "gaps": ["what was unclear or missing 1", ...],
  "recommendations": ["actionable recommendation 1", ...],
  "growthTrajectoryNote": "overall note about growth potential (optional)"
}`;
    }

    protected buildUserPrompt(input: FeedbackInput): string {
        const { candidate, jdSpec, executionFit, founderConfidence, stage, passedThreshold, assignmentEvaluation } = input;

        let context = '';

        if (stage === 'resume') {
            context = `
---RESUME ANALYSIS SUMMARY---
Skill Match: ${this.scoreToQualitative(executionFit.metrics.S)}
Experience Depth: ${this.scoreToQualitative(executionFit.metrics.D)}
Work Relevance: ${this.scoreToQualitative(executionFit.metrics.W)}
Ownership Evidence: ${this.scoreToQualitative(founderConfidence.metrics.O)}
Growth Trajectory: ${this.scoreToQualitative(founderConfidence.metrics.G)}

Key observations:
- ${executionFit.metrics.justifications.skillRelevance}
- ${executionFit.metrics.justifications.depthEvidence}
- ${founderConfidence.metrics.justifications.ownership}`;
        } else if (stage === 'assignment' && assignmentEvaluation) {
            context = `
---ASSIGNMENT EVALUATION SUMMARY---
Demonstrated strengths: ${assignmentEvaluation.strengths.join(', ')}
Areas needing work: ${assignmentEvaluation.weaknesses.join(', ')}`;
        }

        const outcomeContext = passedThreshold
            ? 'Candidate is moving forward in the process.'
            : 'Candidate did not meet threshold for this role, but feedback should be constructive.';

        return `Generate candidate feedback for ${candidate.name}:

---ROLE---
${jdSpec.coreWork}
Required Skills: ${jdSpec.nonNegotiableSkills.join(', ')}

---CANDIDATE---
Experience: ${candidate.workExperience.length} roles
Projects: ${candidate.projects.length} projects
Skills listed: ${candidate.skills.length}

${context}

---CONTEXT---
Stage: ${stage === 'resume' ? 'Resume Review' : 'Assignment Review'}
${outcomeContext}

---TASK---
Generate respectful, specific, actionable feedback.
Remember: NO scores, NO rejection language, NO comparisons.
Respond with valid JSON only.`;
    }

    private scoreToQualitative(score: number): string {
        if (score >= 0.8) return 'Strong';
        if (score >= 0.6) return 'Good';
        if (score >= 0.4) return 'Moderate';
        if (score >= 0.2) return 'Limited';
        return 'Minimal';
    }

    protected parseResponse(response: string): CandidateFeedback {
        const parsed = JSON.parse(response);

        return {
            stage: 'resume', // Will be set in execute
            strengths: this.cleanFeedbackItems(parsed.strengths || []),
            gaps: this.cleanFeedbackItems(parsed.gaps || []),
            recommendations: this.cleanFeedbackItems(parsed.recommendations || []),
            growthTrajectoryNote: parsed.growthTrajectoryNote || undefined,
        };
    }

    private cleanFeedbackItems(items: string[]): string[] {
        // Remove any items that might contain scores or negative language
        const bannedPatterns = [
            /\d+%/,
            /\d+\/\d+/,
            /score/i,
            /reject/i,
            /fail/i,
            /not selected/i,
            /other candidates/i,
        ];

        return items
            .filter(item => !bannedPatterns.some(pattern => pattern.test(item)))
            .map(item => item.trim())
            .filter(item => item.length > 0);
    }

    async execute(input: FeedbackInput): Promise<{
        data: CandidateFeedback;
        explanation: string;
        confidence: number;
    }> {
        const result = await super.execute(input);
        result.data.stage = input.stage;
        return result;
    }

    protected calculateConfidence(data: CandidateFeedback): number {
        let confidence = 0.6;

        if (data.strengths.length >= 2) confidence += 0.1;
        if (data.gaps.length >= 1) confidence += 0.1;
        if (data.recommendations.length >= 2) confidence += 0.1;
        if (data.growthTrajectoryNote) confidence += 0.1;

        return Math.min(1.0, confidence);
    }
}

export function createCandidateFeedbackAgent(): CandidateFeedbackAgent {
    return new CandidateFeedbackAgent();
}
