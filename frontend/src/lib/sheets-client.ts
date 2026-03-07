// ============================================
// Google Sheets Client for Frontend
// ============================================

// import { google } from 'googleapis';

export interface CandidateRecord {
    id: number;
    candidateName: string;
    email: string;
    phone: string;
    resumeFileLink: string;
    executionFitScore: number;
    founderConfidenceScore: number;
    relevanceScore: number;
    roleContext: string;
    interviewFocusAreas: string;
    riskNotes: string;
    assignmentBrief: string;
    recommendation: string;
    resumeFeedback: string;
    assignmentFeedback: string;
    timestamp: string;
}

export async function getCampaigns(): Promise<string[]> {
    return [];
}

export async function getCandidates(campaignName: string = 'Candidates'): Promise<CandidateRecord[]> {
    return [];
}
