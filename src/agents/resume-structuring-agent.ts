// ============================================
// Resume Structuring Agent - Data Extraction
// ============================================

import { BaseAgent } from './base-agent.js';
import type { CandidateProfile, WorkExperience, Project, ExtractedSkill } from '../types/index.js';

interface ResumeInput {
    resumeText: string;
    resumeFileLink: string;
    resumeHash: string;
}

// Regex patterns for contact extraction
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

export class ResumeStructuringAgent extends BaseAgent<ResumeInput, CandidateProfile> {
    constructor() {
        super('Resume Structuring Agent');
    }

    private extractContactInfo(text: string): { email: string | null; phone: string | null } {
        const emails = text.match(EMAIL_REGEX);
        const phones = text.match(PHONE_REGEX);

        return {
            email: emails?.[0] || null,
            phone: phones?.[0]?.replace(/\s+/g, '') || null,
        };
    }

    protected getSystemPrompt(): string {
        return `You are an expert resume parser. Extract structured information from resumes accurately.

IMPORTANT RULES:
1. Do NOT infer skills that aren't explicitly mentioned or demonstrated in projects/experience
2. Mark confidence levels honestly:
   - High: Explicitly listed skill with evidence of use
   - Medium: Mentioned in context but limited detail
   - Low: Only briefly mentioned or implied
3. Extract actual achievements and responsibilities, not generic descriptions
4. If information is unclear or missing, leave it empty rather than guessing

Respond ONLY with valid JSON in this exact format:
{
  "name": "Full Name",
  "workExperience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "duration": "Start - End (e.g., 'Jan 2022 - Present')",
      "responsibilities": ["responsibility 1", ...],
      "achievements": ["quantified achievement if any", ...],
      "technologies": ["tech1", "tech2", ...]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "What it does",
      "technologies": ["tech1", ...],
      "impact": "Quantified impact if mentioned",
      "url": "URL if provided"
    }
  ],
  "skills": [
    {
      "name": "Skill Name",
      "confidence": "High" | "Medium" | "Low",
      "yearsOfExperience": number or null,
      "lastUsed": "year or 'current'"
    }
  ],
  "education": ["Degree, Institution, Year"],
  "explanation": "Brief notes on extraction quality"
}`;
    }

    protected buildUserPrompt(input: ResumeInput): string {
        return `Parse this resume and extract structured information:

---RESUME START---
${input.resumeText}
---RESUME END---

Remember:
- Only extract what's explicitly stated
- Mark skill confidence honestly
- Include all work experience and projects
- Respond with valid JSON only`;
    }

    protected parseResponse(response: string): CandidateProfile {
        let parsed;
        try {
            parsed = JSON.parse(response);
        } catch (e) {
            // Try to fix common JSON issues
            let fixedResponse = response;

            // Remove markdown code fences if present
            fixedResponse = fixedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Try to find and extract the JSON object
            const jsonMatch = fixedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                fixedResponse = jsonMatch[0];

                // Try to fix truncated arrays and strings
                // Count open/close braces and brackets
                let braceCount = 0;
                let bracketCount = 0;
                let inString = false;
                let lastChar = '';

                for (const char of fixedResponse) {
                    if (char === '"' && lastChar !== '\\') inString = !inString;
                    if (!inString) {
                        if (char === '{') braceCount++;
                        if (char === '}') braceCount--;
                        if (char === '[') bracketCount++;
                        if (char === ']') bracketCount--;
                    }
                    lastChar = char;
                }

                // Add missing closing brackets/braces
                while (bracketCount > 0) {
                    fixedResponse += ']';
                    bracketCount--;
                }
                while (braceCount > 0) {
                    fixedResponse += '}';
                    braceCount--;
                }

                // If we're in a string, close it
                if (inString) {
                    fixedResponse = fixedResponse.replace(/[^"]*$/, '"}');
                }
            }

            try {
                parsed = JSON.parse(fixedResponse);
            } catch {
                // Return minimal profile if parsing completely fails
                console.warn('Could not parse resume response, returning minimal profile');
                return {
                    name: 'Unable to Parse',
                    email: null,
                    phone: null,
                    resumeFileLink: '',
                    resumeHash: '',
                    workExperience: [],
                    projects: [],
                    skills: [],
                    education: [],
                    rawText: '',
                    extractedAt: new Date(),
                };
            }
        }

        return {
            name: parsed.name || 'Unknown',
            email: null, // Will be set from regex
            phone: null, // Will be set from regex
            resumeFileLink: '',
            resumeHash: '',
            workExperience: (parsed.workExperience || []).map((exp: Partial<WorkExperience>) => ({
                company: exp.company || '',
                title: exp.title || '',
                duration: exp.duration || '',
                responsibilities: exp.responsibilities || [],
                achievements: exp.achievements || [],
                technologies: exp.technologies || [],
            })),
            projects: (parsed.projects || []).map((proj: Partial<Project>) => ({
                name: proj.name || '',
                description: proj.description || '',
                technologies: proj.technologies || [],
                impact: proj.impact,
                url: proj.url,
            })),
            skills: (parsed.skills || []).map((skill: Partial<ExtractedSkill>) => ({
                name: skill.name || '',
                confidence: skill.confidence || 'Low',
                yearsOfExperience: skill.yearsOfExperience,
                lastUsed: skill.lastUsed,
            })),
            education: parsed.education || [],
            rawText: '',
            extractedAt: new Date(),
        };
    }

    async execute(input: ResumeInput): Promise<{
        data: CandidateProfile;
        explanation: string;
        confidence: number;
    }> {
        // First, extract contact info with regex (more reliable)
        const contactInfo = this.extractContactInfo(input.resumeText);

        // Then use LLM for structured extraction
        const result = await super.execute(input);

        // Merge regex-extracted contact with LLM results
        result.data.email = contactInfo.email;
        result.data.phone = contactInfo.phone;
        result.data.resumeFileLink = input.resumeFileLink;
        result.data.resumeHash = input.resumeHash;
        result.data.rawText = input.resumeText;

        return result;
    }

    protected calculateConfidence(data: CandidateProfile): number {
        let confidence = 0.4;

        if (data.name && data.name !== 'Unknown') confidence += 0.1;
        if (data.email) confidence += 0.1;
        if (data.workExperience.length > 0) confidence += 0.15;
        if (data.projects.length > 0) confidence += 0.1;
        if (data.skills.length >= 5) confidence += 0.15;

        return Math.min(1.0, confidence);
    }
}

export function createResumeStructuringAgent(): ResumeStructuringAgent {
    return new ResumeStructuringAgent();
}
