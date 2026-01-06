// API Route: Send Assignment Email
import { NextRequest, NextResponse } from 'next/server';
import { sendAssignmentEmail } from '@/lib/email-service';
import { getCandidates } from '@/lib/sheets-client';

// Generate a detailed assignment based on JD requirements
function generateDetailedAssignment(candidateName: string, roleContext: string): {
    title: string;
    description: string;
    techStack: string[];
    requirements: string[];
    timeEstimate: string;
    submissionInstructions: string;
} {
    // Full-Stack Developer Assignment
    return {
        title: 'Build a Real-Time Task Management Dashboard',
        description: `Create a mini task management application that demonstrates your full-stack development skills. The application should allow users to create, update, and track tasks with real-time updates. Focus on clean architecture, responsive design, and efficient data handling.`,
        techStack: [
            'React.js / Next.js',
            'TypeScript',
            'Node.js / Express',
            'PostgreSQL or MongoDB',
            'Tailwind CSS or styled-components',
            'WebSocket (optional for real-time)',
        ],
        requirements: [
            'User authentication (simple JWT or session-based)',
            'CRUD operations for tasks (Create, Read, Update, Delete)',
            'Task filtering and search functionality',
            'Responsive design that works on mobile and desktop',
            'Clean, well-documented code with proper error handling',
            'Basic unit tests for critical functions',
            'README with setup instructions and architecture overview',
        ],
        timeEstimate: '4-6 hours (can be spread over 2-3 days)',
        submissionInstructions: `
            <ol>
                <li>Create a GitHub repository for your project</li>
                <li>Include a clear README with:
                    <ul>
                        <li>Setup instructions</li>
                        <li>Tech stack decisions and why</li>
                        <li>Any assumptions made</li>
                    </ul>
                </li>
                <li>Reply to this email with:
                    <ul>
                        <li>GitHub repository link</li>
                        <li>Live demo link (optional, but appreciated)</li>
                    </ul>
                </li>
            </ol>
        `,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { candidateId, candidateEmail, candidateName, recommendation, roleContext } = body;

        // Validate: Only send to Maybe, Yes or Strong Yes candidates
        if (!['Maybe', 'Yes', 'Strong Yes'].includes(recommendation)) {
            return NextResponse.json(
                { error: 'Assignments can only be sent to Maybe, Yes or Strong Yes candidates' },
                { status: 400 }
            );
        }

        if (!candidateEmail) {
            return NextResponse.json(
                { error: 'Candidate email not found' },
                { status: 400 }
            );
        }

        // Generate detailed assignment
        const assignment = generateDetailedAssignment(candidateName, roleContext);

        // Send email
        const result = await sendAssignmentEmail({
            candidateName,
            candidateEmail,
            assignmentTitle: assignment.title,
            assignmentDescription: assignment.description,
            techStack: assignment.techStack,
            requirements: assignment.requirements,
            timeEstimate: assignment.timeEstimate,
            submissionInstructions: assignment.submissionInstructions,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Assignment sent to ${candidateEmail}`,
        });
    } catch (error: any) {
        console.error('Send assignment error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
