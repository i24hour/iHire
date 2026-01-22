// Email Service using Gmail SMTP
import nodemailer from 'nodemailer';

// Create Gmail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

interface AssignmentEmailData {
    candidateName: string;
    candidateEmail: string;
    assignmentTitle: string;
    assignmentDescription: string;
    techStack: string[];
    requirements: string[];
    timeEstimate: string;
    submissionInstructions: string;
}

export async function sendAssignmentEmail(data: AssignmentEmailData): Promise<{ success: boolean; error?: string }> {
    const {
        candidateName,
        candidateEmail,
        assignmentTitle,
        assignmentDescription,
        techStack,
        requirements,
        timeEstimate,
        submissionInstructions,
    } = data;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #000; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .section { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .tech-badge { display: inline-block; background: #e5e5e5; color: #333; padding: 4px 12px; border-radius: 20px; margin: 3px; font-size: 14px; }
        .requirement { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .footer { background: #000; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
        h1 { margin: 0; font-size: 24px; }
        h2 { color: #000; margin-top: 0; }
        .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Technical Assignment</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Congratulations on progressing to the next stage!</p>
    </div>
    
    <div class="content">
        <p>Dear <strong>${candidateName}</strong>,</p>
        
        <p>We were impressed with your profile and would like to move forward with a technical assessment. This assignment will help us understand your practical skills and approach to problem-solving.</p>
        
        <div class="section">
            <h2>📋 ${assignmentTitle}</h2>
            <p>${assignmentDescription}</p>
        </div>
        
        <div class="section">
            <h2>🛠️ Tech Stack</h2>
            <div>
                ${techStack.map(tech => `<span class="tech-badge">${tech}</span>`).join('')}
            </div>
        </div>
        
        <div class="section">
            <h2>✅ Requirements</h2>
            ${requirements.map(req => `<div class="requirement">• ${req}</div>`).join('')}
        </div>
        
        <div class="highlight">
            <strong>⏰ Time Estimate:</strong> ${timeEstimate}<br>
            <small>Take your time to do quality work. We value clean code over speed.</small>
        </div>
        
        <div class="section">
            <h2>📤 Submission</h2>
            <p>${submissionInstructions}</p>
        </div>
        
        <p>If you have any questions, feel free to reply to this email.</p>
        
        <p>Best of luck! 🚀</p>
    </div>
    
    <div class="footer">
        <p>iHire - Multi-Agent Hiring Intelligence System</p>
    </div>
</body>
</html>
    `;

    try {
        await transporter.sendMail({
            from: `"iHire" <${process.env.GMAIL_USER}>`,
            to: candidateEmail,
            subject: `Technical Assignment: ${assignmentTitle}`,
            html: htmlContent,
        });

        console.log(`✅ Assignment email sent to ${candidateEmail}`);
        return { success: true };
    } catch (error: unknown) {
        console.error('Failed to send email:', error);
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}
