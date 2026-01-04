// ============================================
// Type Definitions for Hiring Intelligence System
// ============================================

// Role Context Categories
export type RoleContext =
    | 'Early_Startup_Execution'
    | 'High_Ownership_Critical'
    | 'Stable_Long_Term'
    | 'High_Pressure_Delivery'
    | 'Exploratory_RnD';

// ============================================
// JD Reality Agent Types
// ============================================

export interface JDSpec {
    coreWork: string;
    nonNegotiableSkills: string[];
    ownershipLevel: 'Low' | 'Medium' | 'High' | 'Very High';
    ambiguityLevel: 'Low' | 'Medium' | 'High';
    pressureLevel: 'Low' | 'Medium' | 'High' | 'Very High';
    expectedRoleDuration: 'Short-term' | 'Medium-term' | 'Long-term';
    roleContext: RoleContext;
    criticalityFactor: number; // C ∈ [0.6, 1.0]
    rawText: string;
}

// ============================================
// Resume Structuring Agent Types
// ============================================

export interface ExtractedSkill {
    name: string;
    confidence: 'Low' | 'Medium' | 'High';
    yearsOfExperience?: number;
    lastUsed?: string;
}

export interface WorkExperience {
    company: string;
    title: string;
    duration: string;
    responsibilities: string[];
    achievements: string[];
    technologies: string[];
}

export interface Project {
    name: string;
    description: string;
    technologies: string[];
    impact?: string;
    url?: string;
}

export interface CandidateProfile {
    name: string;
    email: string | null;
    phone: string | null;
    resumeFileLink: string;
    resumeHash: string;
    workExperience: WorkExperience[];
    projects: Project[];
    skills: ExtractedSkill[];
    education: string[];
    rawText: string;
    extractedAt: Date;
}

// ============================================
// Technical Checking Agent Types
// ============================================

export interface TechnicalMetrics {
    S: number; // Skill relevance (0-1)
    D: number; // Depth evidence (0-1)
    W: number; // Work similarity (0-1)
    R: number; // Risk penalty (0-1)
    justifications: {
        skillRelevance: string;
        depthEvidence: string;
        workSimilarity: string;
        riskPenalty: string;
    };
}

export interface ExecutionFitScore {
    score: number; // 0-100
    metrics: TechnicalMetrics;
    explanation: string;
}

// ============================================
// Founder Confidence Agent Types
// ============================================

export interface FounderMetrics {
    O: number; // Ownership signal (0-1)
    L: number; // Longevity probability (0-1)
    P: number; // Pressure handling (0-1)
    G: number; // Growth trajectory (0-1)
    justifications: {
        ownership: string;
        longevity: string;
        pressureHandling: string;
        growthTrajectory: string;
    };
}

export interface FounderConfidenceScore {
    score: number; // 0-100
    metrics: FounderMetrics;
    weights: { wO: number; wL: number; wP: number; wG: number };
    roleContext: RoleContext;
    explanation: string;
}

// ============================================
// Relevance Synthesizer Types
// ============================================

export interface RelevanceScore {
    score: number; // 0-100
    executionFit: number;
    founderConfidence: number;
    criticalityFactor: number;
    alpha: number;
    beta: number;
    passedThreshold: boolean;
    explanation: string;
}

// ============================================
// Assignment Types
// ============================================

export interface Assignment {
    title: string;
    objective: string;
    context: string;
    requirements: string[];
    evaluationCriteria: string[];
    optionalParts: string[];
    timeboxHours: number;
    deliverables: string[];
}

export interface AssignmentEvaluation {
    depthDelta: number;
    workSimilarityDelta: number;
    pressureHandlingDelta: number;
    strengths: string[];
    weaknesses: string[];
    validatedClaims: string[];
    disprovedClaims: string[];
}

// ============================================
// Candidate Feedback Types
// ============================================

export interface CandidateFeedback {
    stage: 'resume' | 'assignment';
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    growthTrajectoryNote?: string;
    // Never includes: scores, rejection language, comparisons
}

// ============================================
// Verdict Types
// ============================================

export interface InternalVerdict {
    candidateName: string;
    email: string | null;
    phone: string | null;
    resumeFileLink: string;
    executionFitScore: ExecutionFitScore;
    founderConfidenceScore: FounderConfidenceScore;
    relevanceScore: RelevanceScore;
    interviewFocusAreas: string[];
    riskNotes: string[];
    assignment?: Assignment;
    assignmentEvaluation?: AssignmentEvaluation;
    recommendation: 'Strong Yes' | 'Yes' | 'Maybe' | 'Not Now';
    timestamp: Date;
}

export interface ExternalVerdict {
    feedback: CandidateFeedback;
    nextSteps: string[];
    // No scores, no comparisons, no rejection language
}

// ============================================
// Processing State
// ============================================

export interface ProcessingResult {
    candidateProfile: CandidateProfile;
    jdSpec: JDSpec;
    executionFit: ExecutionFitScore;
    founderConfidence: FounderConfidenceScore;
    relevance: RelevanceScore;
    resumeFeedback: CandidateFeedback;
    assignment?: Assignment;
    assignmentFeedback?: CandidateFeedback;
    internalVerdict: InternalVerdict;
    externalVerdict: ExternalVerdict;
}

// ============================================
// Weight Matrices
// ============================================

export const FOUNDER_CONFIDENCE_WEIGHTS: Record<RoleContext, { wO: number; wL: number; wP: number; wG: number }> = {
    Early_Startup_Execution: { wO: 0.35, wL: 0.15, wP: 0.30, wG: 0.20 },
    High_Ownership_Critical: { wO: 0.40, wL: 0.20, wP: 0.25, wG: 0.15 },
    Stable_Long_Term: { wO: 0.20, wL: 0.40, wP: 0.15, wG: 0.25 },
    High_Pressure_Delivery: { wO: 0.20, wL: 0.15, wP: 0.45, wG: 0.20 },
    Exploratory_RnD: { wO: 0.25, wL: 0.15, wP: 0.20, wG: 0.40 },
};

export const RELEVANCE_WEIGHTS: Record<RoleContext, { alpha: number; beta: number }> = {
    Early_Startup_Execution: { alpha: 0.55, beta: 0.45 },
    High_Ownership_Critical: { alpha: 0.45, beta: 0.55 },
    Stable_Long_Term: { alpha: 0.60, beta: 0.40 },
    High_Pressure_Delivery: { alpha: 0.50, beta: 0.50 },
    Exploratory_RnD: { alpha: 0.40, beta: 0.60 },
};
