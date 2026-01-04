// ============================================
// Relevance Score Synthesizer
// ============================================

import { RELEVANCE_WEIGHTS } from '../types/index.js';
import type {
    RoleContext,
    ExecutionFitScore,
    FounderConfidenceScore,
    RelevanceScore
} from '../types/index.js';

const RELEVANCE_THRESHOLD = parseInt(process.env.RELEVANCE_THRESHOLD || '60');

export class RelevanceSynthesizer {

    /**
     * Compute the final relevance score.
     * 
     * Formula: Relevance = (α·Execution_Fit + β·Founder_Confidence) × C
     * 
     * Where:
     * - α, β are context-dependent weights
     * - C is the Role Criticality Factor from JD analysis
     */
    synthesize(
        executionFit: ExecutionFitScore,
        founderConfidence: FounderConfidenceScore,
        criticalityFactor: number,
        roleContext: RoleContext
    ): RelevanceScore {
        // Get context-specific weights
        const { alpha, beta } = RELEVANCE_WEIGHTS[roleContext];

        // Compute weighted combination
        const baseScore = alpha * executionFit.score + beta * founderConfidence.score;

        // Apply criticality factor
        const relevanceScore = baseScore * criticalityFactor;

        // Check against threshold
        const passedThreshold = relevanceScore >= RELEVANCE_THRESHOLD;

        // Generate explanation
        const explanation = this.generateExplanation(
            executionFit.score,
            founderConfidence.score,
            relevanceScore,
            alpha,
            beta,
            criticalityFactor,
            roleContext,
            passedThreshold
        );

        return {
            score: Math.max(0, Math.min(100, relevanceScore)),
            executionFit: executionFit.score,
            founderConfidence: founderConfidence.score,
            criticalityFactor,
            alpha,
            beta,
            passedThreshold,
            explanation,
        };
    }

    private generateExplanation(
        efScore: number,
        fcScore: number,
        relevance: number,
        alpha: number,
        beta: number,
        C: number,
        roleContext: RoleContext,
        passed: boolean
    ): string {
        const parts: string[] = [];

        // Describe the weighting
        const efWeight = (alpha * 100).toFixed(0);
        const fcWeight = (beta * 100).toFixed(0);
        parts.push(`For ${roleContext.replace(/_/g, ' ')}, Execution Fit is weighted ${efWeight}% and Founder Confidence ${fcWeight}%.`);

        // Component scores
        parts.push(`Execution Fit: ${efScore.toFixed(1)}/100, Founder Confidence: ${fcScore.toFixed(1)}/100.`);

        // Criticality impact
        if (C < 0.8) {
            parts.push(`Role criticality factor (${C.toFixed(2)}) indicates a support-level position.`);
        } else if (C >= 0.9) {
            parts.push(`High role criticality (${C.toFixed(2)}) reflects a senior/critical position.`);
        }

        // Final verdict
        parts.push(`Final Relevance Score: ${relevance.toFixed(1)}/100.`);

        if (passed) {
            parts.push(`Candidate passes the interview-worthiness threshold (≥${RELEVANCE_THRESHOLD}).`);
        } else {
            parts.push(`Candidate below interview threshold (${RELEVANCE_THRESHOLD}). Constructive feedback will be provided.`);
        }

        return parts.join(' ');
    }

    getThreshold(): number {
        return RELEVANCE_THRESHOLD;
    }
}

export function createRelevanceSynthesizer(): RelevanceSynthesizer {
    return new RelevanceSynthesizer();
}
