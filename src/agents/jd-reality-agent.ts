// ============================================
// JD Reality Agent - Job Description Analysis
// ============================================

import { BaseAgent } from './base-agent.js';
import type { JDSpec, RoleContext } from '../types/index.js';

interface JDInput {
    jdText: string;
}

const ROLE_CONTEXTS: RoleContext[] = [
    'Early_Startup_Execution',
    'High_Ownership_Critical',
    'Stable_Long_Term',
    'High_Pressure_Delivery',
    'Exploratory_RnD',
];

export class JDRealityAgent extends BaseAgent<JDInput, JDSpec> {
    constructor() {
        super('JD Reality Agent');
    }

    protected getSystemPrompt(): string {
        return `You are an expert hiring analyst who can decode job descriptions to understand the REAL role requirements, not just what's written.

Your job is to analyze a job description and extract:
1. Core Work: What will the person actually DO day-to-day?
2. Non-Negotiable Skills: Skills they MUST have (not nice-to-haves)
3. Ownership Level: How much autonomy and decision-making is expected?
4. Ambiguity Level: How well-defined is the work vs figuring things out?
5. Pressure Level: How intense are deadlines and expectations?
6. Expected Role Duration: Is this a short-term hire or long-term investment?
7. Role Context: Classify into exactly ONE of:
   - Early_Startup_Execution: Fast-moving, jack-of-all-trades, ship quickly
   - High_Ownership_Critical: Strategic role, significant responsibility
   - Stable_Long_Term: Established company, predictable work
   - High_Pressure_Delivery: Tight deadlines, performance-critical
   - Exploratory_RnD: Research, experimentation, innovation focus
8. Criticality Factor (C): A number between 0.6 and 1.0 indicating how critical this hire is.
   - 0.6-0.7: Support/junior role
   - 0.7-0.8: Standard contributor
   - 0.8-0.9: Senior/important role
   - 0.9-1.0: Critical/leadership role

Respond ONLY with valid JSON in this exact format:
{
  "coreWork": "string describing the actual daily work",
  "nonNegotiableSkills": ["skill1", "skill2", ...],
  "ownershipLevel": "Low" | "Medium" | "High" | "Very High",
  "ambiguityLevel": "Low" | "Medium" | "High",
  "pressureLevel": "Low" | "Medium" | "High" | "Very High",
  "expectedRoleDuration": "Short-term" | "Medium-term" | "Long-term",
  "roleContext": "one of the 5 contexts",
  "criticalityFactor": 0.6-1.0,
  "explanation": "Brief reasoning for your analysis"
}`;
    }

    protected buildUserPrompt(input: JDInput): string {
        return `Analyze this job description and extract the real role requirements:

---JOB DESCRIPTION START---
${input.jdText}
---JOB DESCRIPTION END---

Remember to respond with valid JSON only.`;
    }

    protected parseResponse(response: string): JDSpec {
        const parsed = JSON.parse(response);

        // Validate role context
        if (!ROLE_CONTEXTS.includes(parsed.roleContext)) {
            parsed.roleContext = 'Stable_Long_Term'; // Default fallback
        }

        // Clamp criticality factor
        parsed.criticalityFactor = Math.max(0.6, Math.min(1.0, parsed.criticalityFactor));

        return {
            coreWork: parsed.coreWork || '',
            nonNegotiableSkills: parsed.nonNegotiableSkills || [],
            ownershipLevel: parsed.ownershipLevel || 'Medium',
            ambiguityLevel: parsed.ambiguityLevel || 'Medium',
            pressureLevel: parsed.pressureLevel || 'Medium',
            expectedRoleDuration: parsed.expectedRoleDuration || 'Medium-term',
            roleContext: parsed.roleContext,
            criticalityFactor: parsed.criticalityFactor,
            rawText: '',
        };
    }

    protected calculateConfidence(data: JDSpec): number {
        // Higher confidence if we extracted meaningful data
        let confidence = 0.5;

        if (data.coreWork.length > 50) confidence += 0.1;
        if (data.nonNegotiableSkills.length >= 3) confidence += 0.15;
        if (data.nonNegotiableSkills.length >= 5) confidence += 0.1;
        if (ROLE_CONTEXTS.includes(data.roleContext)) confidence += 0.15;

        return Math.min(1.0, confidence);
    }
}

export function createJDRealityAgent(): JDRealityAgent {
    return new JDRealityAgent();
}
