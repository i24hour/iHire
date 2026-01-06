// ============================================
// Assignment Generation Agent
// ============================================

import { BaseAgent } from './base-agent.js';
import type { CandidateProfile, JDSpec, Assignment } from '../types/index.js';

interface AssignmentInput {
    candidate: CandidateProfile;
    jdSpec: JDSpec;
    executionFitScore: number;
}

// New: JD-only input for standard assignments
interface JDOnlyInput {
    jdSpec: JDSpec;
}

export class AssignmentGenerationAgent extends BaseAgent<AssignmentInput | JDOnlyInput, Assignment> {
    constructor() {
        super('Assignment Generation Agent');
    }

    protected getSystemPrompt(): string {
        return `You are an expert at creating job-realistic assignments that fairly evaluate candidates.

Design assignments that:
1. Simulate REAL work the candidate would do in this role
2. Are time-boxed and respectful of candidate's time (typically 2-6 hours)
3. Have clear evaluation criteria
4. Include both required and optional (stretch) components
5. Test the skills most relevant to the role
6. Allow candidates to demonstrate problem-solving, not just implementation

IMPORTANT RULES:
- Assignment should be specific to this role, not generic
- Include context that helps candidates understand the problem
- Make evaluation criteria transparent
- Optional parts should allow strong candidates to shine
- Never make assignments that require proprietary knowledge

Respond ONLY with valid JSON:
{
  "title": "Assignment Title",
  "objective": "What the candidate should accomplish",
  "context": "Background context and why this matters",
  "requirements": ["Required deliverable 1", "Required deliverable 2", ...],
  "evaluationCriteria": ["How we'll evaluate criterion 1", ...],
  "optionalParts": ["Optional stretch goal 1", ...],
  "timeboxHours": 2-6,
  "deliverables": ["What to submit"]
}`;
    }

    // New: Generate assignment based only on JD (standard for all candidates)
    public buildJDOnlyPrompt(jdSpec: JDSpec): string {
        return `Design a job-realistic, role-specific assignment for this position:

---ROLE DETAILS---
Role Context: ${jdSpec.roleContext.replace(/_/g, ' ')}
Core Work: ${jdSpec.coreWork}
Required Skills: ${jdSpec.nonNegotiableSkills.join(', ')}
Ownership Level: ${jdSpec.ownershipLevel}
Pressure Level: ${jdSpec.pressureLevel}
Ambiguity Level: ${jdSpec.ambiguityLevel}

---ASSIGNMENT REQUIREMENTS---
Create a practical, time-boxed assignment that:
1. Tests the core skills required for this role: ${jdSpec.nonNegotiableSkills.slice(0, 3).join(', ')}
2. Simulates real work for ${jdSpec.roleContext.replace(/_/g, ' ')} context
3. Is completable in 3-6 hours
4. Has clear deliverables and evaluation criteria
5. Is challenging but fair for candidates at this level

The assignment should be ROLE-SPECIFIC, NOT GENERIC. Make it directly relevant to "${jdSpec.coreWork}".

Respond with valid JSON only.`;
    }

    protected buildUserPrompt(input: AssignmentInput | JDOnlyInput): string {
        // Check if this is JD-only input
        if (!('candidate' in input)) {
            return this.buildJDOnlyPrompt(input.jdSpec);
        }

        // Legacy: candidate-specific prompt (kept for backwards compatibility)
        const { candidate, jdSpec, executionFitScore } = input as AssignmentInput;

        // Identify skill gaps to probe
        const candidateSkills = candidate.skills.map(s => s.name.toLowerCase());
        const requiredSkills = jdSpec.nonNegotiableSkills;
        const skillsToTest = requiredSkills.filter(
            rs => !candidateSkills.some(cs => cs.includes(rs.toLowerCase()))
        );

        return `Design a job-realistic assignment for this candidate/role:

---ROLE---
Core Work: ${jdSpec.coreWork}
Required Skills: ${jdSpec.nonNegotiableSkills.join(', ')}
Role Context: ${jdSpec.roleContext}
Ownership Level: ${jdSpec.ownershipLevel}
Pressure Level: ${jdSpec.pressureLevel}

---CANDIDATE CONTEXT---
Name: ${candidate.name}
Current Execution Fit Score: ${executionFitScore.toFixed(1)}/100
Experience Areas: ${candidate.workExperience.map(e => e.title).join(', ') || 'Entry level'}
Skills (claimed): ${candidate.skills.slice(0, 10).map(s => s.name).join(', ')}

${skillsToTest.length > 0 ? `Skills to verify: ${skillsToTest.join(', ')}` : ''}

---TASK---
Create a realistic, time-boxed assignment that:
1. Tests skills relevant to ${jdSpec.roleContext.replace(/_/g, ' ')}
2. Allows demonstration of ${jdSpec.ownershipLevel} ownership
3. Is completable in 2-6 hours
4. Has clear deliverables

Respond with valid JSON only.`;
    }

    protected parseResponse(response: string): Assignment {
        const parsed = JSON.parse(response);

        return {
            title: parsed.title || 'Technical Assessment',
            objective: parsed.objective || '',
            context: parsed.context || '',
            requirements: parsed.requirements || [],
            evaluationCriteria: parsed.evaluationCriteria || [],
            optionalParts: parsed.optionalParts || [],
            timeboxHours: Math.max(2, Math.min(6, parsed.timeboxHours || 4)),
            deliverables: parsed.deliverables || [],
        };
    }

    protected calculateConfidence(data: Assignment): number {
        let confidence = 0.5;

        if (data.objective.length > 50) confidence += 0.1;
        if (data.requirements.length >= 2) confidence += 0.15;
        if (data.evaluationCriteria.length >= 3) confidence += 0.15;
        if (data.optionalParts.length >= 1) confidence += 0.1;

        return Math.min(1.0, confidence);
    }

    // New: Generate standard assignment for a JD
    async generateStandardAssignment(jdSpec: JDSpec): Promise<Assignment> {
        console.log('  📝 Generating standard assignment for this role...');
        const result = await this.execute({ jdSpec });
        return result.data;
    }
}

export function createAssignmentGenerationAgent(): AssignmentGenerationAgent {
    return new AssignmentGenerationAgent();
}

