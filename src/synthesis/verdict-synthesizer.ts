// ============================================
// Verdict Synthesizer - Final Output Generation
// ============================================

import type {
    CandidateProfile,
    JDSpec,
    ExecutionFitScore,
    FounderConfidenceScore,
    RelevanceScore,
    CandidateFeedback,
    Assignment,
    InternalVerdict,
    ExternalVerdict,
} from '../types/index.js';

export class VerdictSynthesizer {

    /**
     * Generate the internal (founder-facing) verdict with all scores and analysis
     */
    generateInternalVerdict(
        candidate: CandidateProfile,
        jdSpec: JDSpec,
        executionFit: ExecutionFitScore,
        founderConfidence: FounderConfidenceScore,
        relevance: RelevanceScore,
        assignment?: Assignment
    ): InternalVerdict {
        // Determine recommendation
        const recommendation = this.determineRecommendation(relevance.score);

        // Generate interview focus areas
        const interviewFocusAreas = this.generateInterviewFocusAreas(
            executionFit,
            founderConfidence,
            jdSpec
        );

        // Identify risk notes
        const riskNotes = this.generateRiskNotes(executionFit, founderConfidence, candidate);

        return {
            candidateName: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            resumeFileLink: candidate.resumeFileLink,
            executionFitScore: executionFit,
            founderConfidenceScore: founderConfidence,
            relevanceScore: relevance,
            interviewFocusAreas,
            riskNotes,
            assignment,
            recommendation,
            timestamp: new Date(),
        };
    }

    /**
     * Generate the external (candidate-facing) verdict with no scores
     */
    generateExternalVerdict(
        feedback: CandidateFeedback,
        relevance: RelevanceScore
    ): ExternalVerdict {
        const nextSteps = this.generateNextSteps(feedback.stage, relevance.passedThreshold);

        return {
            feedback,
            nextSteps,
        };
    }

    private determineRecommendation(
        relevanceScore: number
    ): 'Strong Yes' | 'Yes' | 'Maybe' | 'Not Now' {
        if (relevanceScore >= 80) return 'Strong Yes';
        if (relevanceScore >= 65) return 'Yes';
        if (relevanceScore >= 50) return 'Maybe';
        return 'Not Now';
    }

    private generateInterviewFocusAreas(
        executionFit: ExecutionFitScore,
        founderConfidence: FounderConfidenceScore,
        jdSpec: JDSpec
    ): string[] {
        const areas: string[] = [];

        // Technical areas to probe
        if (executionFit.metrics.S < 0.7) {
            const missingSkills = jdSpec.nonNegotiableSkills.slice(0, 3).join(', ');
            areas.push(`Verify depth in: ${missingSkills}`);
        }

        if (executionFit.metrics.D < 0.6) {
            areas.push('Probe technical depth with real-world scenarios');
        }

        if (executionFit.metrics.W < 0.6) {
            areas.push('Explore transferable experience from different domains');
        }

        // Behavioral areas
        if (founderConfidence.metrics.O < 0.6) {
            areas.push('Assess ownership mindset with past examples of initiative');
        }

        if (founderConfidence.metrics.P < 0.6 && jdSpec.pressureLevel !== 'Low') {
            areas.push('Explore how they handled high-pressure situations');
        }

        if (founderConfidence.metrics.L < 0.6) {
            areas.push('Discuss career goals and commitment expectations');
        }

        if (founderConfidence.metrics.G < 0.6) {
            areas.push('Understand their learning approach and growth mindset');
        }

        // Role-specific areas
        if (jdSpec.ambiguityLevel === 'High') {
            areas.push('Test comfort with ambiguity and unstructured problems');
        }

        if (jdSpec.ownershipLevel === 'Very High') {
            areas.push('Discuss experience driving projects end-to-end');
        }

        // Limit to top 5 most important
        return areas.slice(0, 5);
    }

    private generateRiskNotes(
        executionFit: ExecutionFitScore,
        founderConfidence: FounderConfidenceScore,
        candidate: CandidateProfile
    ): string[] {
        const risks: string[] = [];

        // Technical risks
        if (executionFit.metrics.R >= 0.4) {
            risks.push(executionFit.metrics.justifications.riskPenalty);
        }

        // Experience risks
        if (candidate.workExperience.length === 0) {
            risks.push('No prior work experience listed');
        }

        // Job hopping check
        const shortStints = candidate.workExperience.filter(exp => {
            const duration = exp.duration.toLowerCase();
            return duration.includes('month') && !duration.includes('12') && !duration.includes('18');
        });

        if (shortStints.length >= 2) {
            risks.push(`Multiple short-term roles (${shortStints.length} positions < 1 year)`);
        }

        // Longevity risks
        if (founderConfidence.metrics.L < 0.4) {
            risks.push(founderConfidence.metrics.justifications.longevity);
        }

        // Contact info risks
        if (!candidate.email) {
            risks.push('No email address found in resume');
        }

        return risks.filter(r => r && r.length > 0);
    }

    private generateNextSteps(
        stage: 'resume' | 'assignment',
        passed: boolean
    ): string[] {
        if (stage === 'resume') {
            if (passed) {
                return [
                    'You will receive an assignment to complete at your convenience.',
                    'The assignment is designed to simulate real work and is time-boxed.',
                    'Feel free to reach out if you have any questions about the assignment.',
                ];
            } else {
                return [
                    'We encourage you to continue building your experience in the areas mentioned.',
                    'Consider taking on projects that demonstrate the skills discussed.',
                    'Feel free to reapply in the future as your experience grows.',
                    'Connect with us on LinkedIn to stay updated on future opportunities.',
                ];
            }
        } else {
            if (passed) {
                return [
                    'Your submission has been reviewed and you will hear from us regarding next steps.',
                    'If you have any questions about the process, feel free to reach out.',
                ];
            } else {
                return [
                    'Thank you for completing the assignment and investing your time.',
                    'We encourage you to continue developing in the areas mentioned.',
                    'Your effort is appreciated and we hope this feedback is helpful.',
                    'Feel free to reapply in the future as your skills evolve.',
                ];
            }
        }
    }
}

export function createVerdictSynthesizer(): VerdictSynthesizer {
    return new VerdictSynthesizer();
}
