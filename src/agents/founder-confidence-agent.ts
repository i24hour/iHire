// ============================================
// Founder Confidence Agent - Behavioral Analysis
// ============================================

import { BaseAgent } from './base-agent.js';
import { FOUNDER_CONFIDENCE_WEIGHTS } from '../types/index.js';
import type {
    CandidateProfile,
    JDSpec,
    FounderMetrics,
    FounderConfidenceScore,
    RoleContext
} from '../types/index.js';

interface FounderInput {
    candidate: CandidateProfile;
    jdSpec: JDSpec;
}

export class FounderConfidenceAgent extends BaseAgent<FounderInput, FounderConfidenceScore> {
    constructor() {
        super('Founder Confidence Agent');
    }

    protected getSystemPrompt(): string {
        return `You are an expert talent evaluator, advising founders and hiring managers.

Analyze candidate profiles for behavioral signals that indicate work style and fit.

Compute these NORMALIZED metrics (each must be between 0.0 and 1.0):

1. O (Ownership Signal): How much initiative and autonomy does this person take?
   - Look for: leading projects, making decisions, going beyond job scope
   - 0.0-0.3: Follows instructions, limited initiative
   - 0.3-0.6: Some initiative when guided
   - 0.6-0.8: Regularly takes ownership
   - 0.8-1.0: Strong evidence of driving outcomes independently

2. L (Longevity Probability): How likely is this person to stay and commit?
   - Look for: tenure patterns, job changes, career trajectory coherence
   - 0.0-0.3: Frequent job changes, unclear commitment
   - 0.3-0.6: Average tenure, some concerns
   - 0.6-0.8: Stable history, reasonable moves
   - 0.8-1.0: Strong track record of commitment

3. P (Pressure Handling): How well do they handle deadlines and high-stakes situations?
   - Look for: delivery track record, crisis handling, challenging project experience
   - 0.0-0.3: No evidence of pressure experience
   - 0.3-0.6: Some experience, unclear performance
   - 0.6-0.8: Demonstrated ability to deliver under pressure
   - 0.8-1.0: Thrives in high-pressure environments

4. G (Growth Trajectory): How strong is their learning and adaptation curve?
   - Look for: skill evolution, increasing responsibility, adaptation to new domains
   - 0.0-0.3: Stagnant growth, same level roles
   - 0.3-0.6: Gradual growth
   - 0.6-0.8: Clear upward trajectory
   - 0.8-1.0: Exceptional growth, rapid advancement

For each metric, provide clear justification from the candidate's history.

Respond ONLY with valid JSON:
{
  "O": 0.0-1.0,
  "L": 0.0-1.0,
  "P": 0.0-1.0,
  "G": 0.0-1.0,
  "justifications": {
    "ownership": "explanation for O score",
    "longevity": "explanation for L score",
    "pressureHandling": "explanation for P score",
    "growthTrajectory": "explanation for G score"
  }
}`;
    }

    protected buildUserPrompt(input: FounderInput): string {
        const { candidate, jdSpec } = input;

        const workExpDetail = candidate.workExperience
            .map(exp => {
                const achievements = exp.achievements.length > 0
                    ? `\n    Achievements: ${exp.achievements.join('; ')}`
                    : '';
                return `- ${exp.title} at ${exp.company} (${exp.duration})
    Responsibilities: ${exp.responsibilities.slice(0, 4).join('; ')}${achievements}`;
            })
            .join('\n');

        return `Evaluate this candidate's behavioral signals for founder confidence:

---ROLE CONTEXT---
Role Type: ${jdSpec.roleContext}
Ownership Expected: ${jdSpec.ownershipLevel}
Pressure Level: ${jdSpec.pressureLevel}
Ambiguity Level: ${jdSpec.ambiguityLevel}
Expected Duration: ${jdSpec.expectedRoleDuration}

---CANDIDATE HISTORY---
Name: ${candidate.name}

Work Experience:
${workExpDetail || 'None listed'}

Projects: ${candidate.projects.length} projects listed
${candidate.projects.map(p => `- ${p.name}: ${p.description?.substring(0, 100)}`).join('\n')}

---TASK---
Compute O, L, P, G metrics (all 0.0-1.0) with justifications.
Respond with valid JSON only.`;
    }

    protected parseResponse(response: string): FounderConfidenceScore {
        const parsed = JSON.parse(response);

        // We need the role context to be set later
        // Return partial data that will be completed in execute()
        return {
            score: 0, // Will be calculated
            metrics: {
                O: Math.max(0, Math.min(1, parsed.O || 0)),
                L: Math.max(0, Math.min(1, parsed.L || 0)),
                P: Math.max(0, Math.min(1, parsed.P || 0)),
                G: Math.max(0, Math.min(1, parsed.G || 0)),
                justifications: {
                    ownership: parsed.justifications?.ownership || '',
                    longevity: parsed.justifications?.longevity || '',
                    pressureHandling: parsed.justifications?.pressureHandling || '',
                    growthTrajectory: parsed.justifications?.growthTrajectory || '',
                },
            },
            weights: { wO: 0, wL: 0, wP: 0, wG: 0 }, // Will be set
            roleContext: 'Stable_Long_Term', // Will be set
            explanation: '',
        };
    }

    async execute(input: FounderInput): Promise<{
        data: FounderConfidenceScore;
        explanation: string;
        confidence: number;
    }> {
        const result = await super.execute(input);
        const { data } = result;
        const { metrics } = data;

        // Get weights based on role context
        const roleContext = input.jdSpec.roleContext;
        const weights = FOUNDER_CONFIDENCE_WEIGHTS[roleContext];

        // Compute Founder Confidence score
        const score = 100 * (
            weights.wO * metrics.O +
            weights.wL * metrics.L +
            weights.wP * metrics.P +
            weights.wG * metrics.G
        );

        // Update the result with computed values
        data.score = Math.max(0, Math.min(100, score));
        data.weights = weights;
        data.roleContext = roleContext;
        data.explanation = this.generateExplanation(metrics, weights, roleContext, score);

        return result;
    }

    private generateExplanation(
        metrics: FounderMetrics,
        weights: { wO: number; wL: number; wP: number; wG: number },
        roleContext: RoleContext,
        score: number
    ): string {
        const parts: string[] = [];

        // Highlight the most weighted metric for this role context
        const weightedMetrics = [
            { name: 'Ownership', value: metrics.O, weight: weights.wO },
            { name: 'Longevity', value: metrics.L, weight: weights.wL },
            { name: 'Pressure Handling', value: metrics.P, weight: weights.wP },
            { name: 'Growth', value: metrics.G, weight: weights.wG },
        ].sort((a, b) => b.weight - a.weight);

        const primaryMetric = weightedMetrics[0];
        parts.push(`For ${roleContext.replace(/_/g, ' ')}, ${primaryMetric.name} is weighted highest (${(primaryMetric.weight * 100).toFixed(0)}%).`);

        if (primaryMetric.value >= 0.7) {
            parts.push(`Candidate scores well (${(primaryMetric.value * 100).toFixed(0)}%) on this key dimension.`);
        } else if (primaryMetric.value < 0.4) {
            parts.push(`Concern: Candidate scores low (${(primaryMetric.value * 100).toFixed(0)}%) on this critical dimension.`);
        }

        parts.push(`Founder Confidence Score: ${score.toFixed(1)}/100`);

        return parts.join(' ');
    }

    protected calculateConfidence(data: FounderConfidenceScore): number {
        const hasJustifications = Object.values(data.metrics.justifications)
            .every(j => j.length > 20);

        return hasJustifications ? 0.8 : 0.6;
    }
}

export function createFounderConfidenceAgent(): FounderConfidenceAgent {
    return new FounderConfidenceAgent();
}
