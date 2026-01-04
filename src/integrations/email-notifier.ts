// ============================================
// Email Notifier - Candidate & Founder Notifications
// ============================================

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from 'dotenv';
import type { CandidateFeedback, InternalVerdict, ExternalVerdict } from '../types/index.js';

config();

interface EmailConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
}

export class EmailNotifier {
    private transporter: Transporter;
    private fromAddress: string;
    private founderEmail: string;

    constructor(customConfig?: Partial<EmailConfig>) {
        const host = customConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = customConfig?.port || parseInt(process.env.SMTP_PORT || '587');
        const user = customConfig?.user || process.env.SMTP_USER || '';
        const pass = customConfig?.pass || process.env.SMTP_PASS || '';

        this.fromAddress = customConfig?.from || process.env.EMAIL_FROM || user;
        this.founderEmail = process.env.FOUNDER_EMAIL || '';

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
    }

    private formatFeedbackHTML(feedback: CandidateFeedback): string {
        let html = '<div style="font-family: Arial, sans-serif; line-height: 1.6;">';

        if (feedback.strengths.length > 0) {
            html += `
        <h3 style="color: #2e7d32;">What Stood Out in Your Profile</h3>
        <ul>
          ${feedback.strengths.map(s => `<li>${s}</li>`).join('')}
        </ul>
      `;
        }

        if (feedback.gaps.length > 0) {
            html += `
        <h3 style="color: #f57c00;">Areas That Were Unclear or Missing</h3>
        <ul>
          ${feedback.gaps.map(g => `<li>${g}</li>`).join('')}
        </ul>
      `;
        }

        if (feedback.recommendations.length > 0) {
            html += `
        <h3 style="color: #1976d2;">Recommendations for Strengthening Your Profile</h3>
        <ul>
          ${feedback.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      `;
        }

        if (feedback.growthTrajectoryNote) {
            html += `
        <p style="margin-top: 20px; padding: 15px; background-color: #e3f2fd; border-radius: 8px;">
          <strong>Growth Perspective:</strong> ${feedback.growthTrajectoryNote}
        </p>
      `;
        }

        html += '</div>';
        return html;
    }

    async sendCandidateFeedback(
        email: string,
        candidateName: string,
        feedback: CandidateFeedback,
        nextSteps: string[]
    ): Promise<void> {
        if (!email) {
            console.warn('No email address for candidate, skipping notification');
            return;
        }

        const stageTitle = feedback.stage === 'resume'
            ? 'Application Review Feedback'
            : 'Assignment Submission Feedback';

        const nextStepsHTML = nextSteps.length > 0
            ? `
        <h3 style="color: #6a1b9a;">Next Steps</h3>
        <ul>
          ${nextSteps.map(s => `<li>${s}</li>`).join('')}
        </ul>
      `
            : '';

        const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Hi ${candidateName.split(' ')[0]},</h2>
        
        <p>Thank you for your interest in this role. We've carefully reviewed your ${feedback.stage === 'resume' ? 'application' : 'assignment submission'} and wanted to share some constructive feedback.</p>
        
        ${this.formatFeedbackHTML(feedback)}
        
        ${nextStepsHTML}
        
        <p style="margin-top: 30px; color: #666;">
          Best regards,<br>
          The Hiring Team
        </p>
      </div>
    `;

        await this.transporter.sendMail({
            from: this.fromAddress,
            to: email,
            subject: `${stageTitle} - Thank you for your application`,
            html,
        });

        console.log(`Sent feedback email to ${email}`);
    }

    async notifyFounder(verdict: InternalVerdict): Promise<void> {
        if (!this.founderEmail) {
            console.warn('No founder email configured, skipping notification');
            return;
        }

        const scoreColor = verdict.relevanceScore.score >= 70 ? '#2e7d32'
            : verdict.relevanceScore.score >= 50 ? '#f57c00'
                : '#c62828';

        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">New Candidate Processed</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${verdict.candidateName}</h3>
          <p>
            Email: ${verdict.email || 'N/A'}<br>
            Phone: ${verdict.phone || 'N/A'}
          </p>
          <p>
            <a href="${verdict.resumeFileLink}" style="color: #1976d2;">View Resume</a>
          </p>
        </div>

        <h3>Scores</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Execution Fit</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${verdict.executionFitScore.score.toFixed(1)}/100</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Founder Confidence</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${verdict.founderConfidenceScore.score.toFixed(1)}/100</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Relevance Score</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; color: ${scoreColor}; font-weight: bold;">
              ${verdict.relevanceScore.score.toFixed(1)}/100
            </td>
          </tr>
        </table>

        <h3>Recommendation: <span style="color: ${verdict.recommendation === 'Strong Yes' ? '#2e7d32' :
                verdict.recommendation === 'Yes' ? '#388e3c' :
                    verdict.recommendation === 'Maybe' ? '#f57c00' : '#c62828'
            }">${verdict.recommendation}</span></h3>

        ${verdict.interviewFocusAreas.length > 0 ? `
          <h4>Interview Focus Areas</h4>
          <ul>
            ${verdict.interviewFocusAreas.map(a => `<li>${a}</li>`).join('')}
          </ul>
        ` : ''}

        ${verdict.riskNotes.length > 0 ? `
          <h4 style="color: #c62828;">Risk Notes</h4>
          <ul>
            ${verdict.riskNotes.map(r => `<li>${r}</li>`).join('')}
          </ul>
        ` : ''}

        ${verdict.assignment ? `
          <h4>Assignment Assigned</h4>
          <p><strong>${verdict.assignment.title}</strong></p>
          <p>${verdict.assignment.objective}</p>
        ` : ''}

        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          Processed at: ${verdict.timestamp.toISOString()}
        </p>
      </div>
    `;

        await this.transporter.sendMail({
            from: this.fromAddress,
            to: this.founderEmail,
            subject: `[${verdict.recommendation}] New Candidate: ${verdict.candidateName} (${verdict.relevanceScore.score.toFixed(0)}/100)`,
            html,
        });

        console.log(`Sent founder notification for ${verdict.candidateName}`);
    }

    async verify(): Promise<boolean> {
        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error('Email configuration error:', error);
            return false;
        }
    }
}

// Factory function
export function createEmailNotifier(): EmailNotifier {
    return new EmailNotifier();
}
