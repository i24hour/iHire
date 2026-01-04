// ============================================
// Technical Checking Agent - Execution Fit Analysis
// ============================================

import { BaseAgent } from './base-agent.js';
import type {
    CandidateProfile,
    JDSpec,
    TechnicalMetrics,
    ExecutionFitScore
} from '../types/index.js';

interface TechnicalInput {
    candidate: CandidateProfile;
    jdSpec: JDSpec;
}

export class TechnicalCheckingAgent extends BaseAgent<TechnicalInput, ExecutionFitScore> {
    constructor() {
        super('Technical Checking Agent');
    }

    protected getSystemPrompt(): string {
        return `You are an expert technical evaluator. Analyze candidate profiles against job requirements.

Compute these NORMALIZED metrics (each must be between 0.0 and 1.0):

1. S (Skill Relevance): How well do the candidate's skills match the non-negotiable requirements?
   - 0.0-0.3: Few relevant skills
   - 0.3-0.6: Some relevant skills, gaps in key areas
   - 0.6-0.8: Most required skills present
   - 0.8-1.0: Strong match with evidence

2. D (Depth Evidence): How deep is the candidate's expertise in relevant areas?
   - Consider: years of experience, complexity of projects, leadership in technical decisions
   - 0.0-0.3: Surface-level experience
   - 0.3-0.6: Working knowledge
   - 0.6-0.8: Solid experience with evidence
   - 0.8-1.0: Deep expertise with significant achievements

3. W (Work Similarity): How similar is their past work to this role's core work?
   - 0.0-0.3: Very different domain/type of work
   - 0.3-0.6: Some overlap
   - 0.6-0.8: Similar work context
   - 0.8-1.0: Highly relevant previous work

4. R (Risk Penalty): What risks are present?
   - Job hopping, gaps without explanation, inconsistencies, overstatements
   - 0.0-0.2: No significant risks
   - 0.2-0.4: Minor concerns
   - 0.4-0.6: Moderate risks
   - 0.6-1.0: Significant red flags

For each metric, provide a clear justification.

Respond ONLY with valid JSON:
{
  "S": 0.0-1.0,
  "D": 0.0-1.0,
  "W": 0.0-1.0,
  "R": 0.0-1.0,
  "justifications": {
    "skillRelevance": "explanation for S score",
    "depthEvidence": "explanation for D score",
    "workSimilarity": "explanation for W score",
    "riskPenalty": "explanation for R score"
  }
}`;
    }

    protected buildUserPrompt(input: TechnicalInput): string {
        const { candidate, jdSpec } = input;

        const workExpSummary = candidate.workExperience
            .map(exp => `- ${exp.title} at ${exp.company} (${exp.duration}): ${exp.responsibilities.slice(0, 3).join(', ')}`)
            .join('\n');

        const projectSummary = candidate.projects
            .map(proj => `- ${proj.name}: ${proj.description} [${proj.technologies.join(', ')}]`)
            .join('\n');

        const skillsList = candidate.skills
            .map(s => `${s.name} (${s.confidence} confidence${s.yearsOfExperience ? `, ${s.yearsOfExperience}y` : ''})`)
            .join(', ');

        return `Evaluate this candidate against the job requirements:

---JOB REQUIREMENTS---
Core Work: ${jdSpec.coreWork}
Non-Negotiable Skills: ${jdSpec.nonNegotiableSkills.join(', ')}
Ownership Level: ${jdSpec.ownershipLevel}
Role Context: ${jdSpec.roleContext}

---CANDIDATE PROFILE---
Name: ${candidate.name}

Work Experience:
${workExpSummary || 'None listed'}

Projects:
${projectSummary || 'None listed'}

Skills: ${skillsList || 'None listed'}

Education: ${candidate.education.join(', ') || 'Not specified'}

---TASK---
Compute S, D, W, R metrics (all 0.0-1.0) with justifications.
Respond with valid JSON only.`;
    }

    protected parseResponse(response: string): ExecutionFitScore {
        const parsed = JSON.parse(response);

        // Clamp all values to [0, 1]
        const S = Math.max(0, Math.min(1, parsed.S || 0));
        const D = Math.max(0, Math.min(1, parsed.D || 0));
        const W = Math.max(0, Math.min(1, parsed.W || 0));
        const R = Math.max(0, Math.min(1, parsed.R || 0));

        // Compute Execution Fit: 100 × (0.35S + 0.30D + 0.25W − 0.10R)
        const score = 100 * (0.35 * S + 0.30 * D + 0.25 * W - 0.10 * R);

        const metrics: TechnicalMetrics = {
            S,
            D,
            W,
            R,
            justifications: {
                skillRelevance: parsed.justifications?.skillRelevance || '',
                depthEvidence: parsed.justifications?.depthEvidence || '',
                workSimilarity: parsed.justifications?.workSimilarity || '',
                riskPenalty: parsed.justifications?.riskPenalty || '',
            },
        };

        return {
            score: Math.max(0, Math.min(100, score)),
            metrics,
            explanation: this.generateExplanation(metrics, score),
        };
    }

    private generateExplanation(metrics: TechnicalMetrics, score: number): string {
        const parts: string[] = [];

        if (metrics.S >= 0.7) {
            parts.push('Strong skill alignment with requirements.');
        } else if (metrics.S >= 0.4) {
            parts.push('Partial skill match with some gaps.');
        } else {
            parts.push('Limited relevant skills for this role.');
        }

        if (metrics.D >= 0.7) {
            parts.push('Deep technical expertise demonstrated.');
        } else if (metrics.D >= 0.4) {
            parts.push('Moderate depth in relevant areas.');
        }

        if (metrics.R >= 0.4) {
            parts.push(`Risk factors identified: ${metrics.justifications.riskPenalty}`);
        }

        parts.push(`Execution Fit Score: ${score.toFixed(1)}/100`);

        return parts.join(' ');
    }

    protected calculateConfidence(data: ExecutionFitScore): number {
        // Higher confidence if justifications are substantive
        const hasJustifications = Object.values(data.metrics.justifications)
            .every(j => j.length > 20);

        return hasJustifications ? 0.85 : 0.65;
    }
}

export function createTechnicalCheckingAgent(): TechnicalCheckingAgent {
    return new TechnicalCheckingAgent();
}
