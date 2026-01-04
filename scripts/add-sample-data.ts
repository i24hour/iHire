// Script to add sample candidate data directly to Google Sheet
import { google } from 'googleapis';
import * as fs from 'fs';
import { config } from 'dotenv';

config();

const SAMPLE_CANDIDATES = [
    // HIGH MATCH - Senior Full Stack Developer
    {
        name: 'PRIYANSHU SHARMA',
        email: 'priyanshu.sharma@email.com',
        phone: '+91-9876543210',
        resumeLink: 'https://drive.google.com/file/d/sample1',
        executionFit: 85.2,
        founderConfidence: 82.5,
        relevanceScore: 82.8,
        roleContext: 'High_Ownership_Critical',
        interviewFocus: 'System design depth; AI/ML integration experience; Leadership capability',
        riskNotes: '',
        assignment: 'Design a scalable resume processing pipeline',
        recommendation: 'Strong Yes',
        resumeFeedback: 'STRENGTHS:\n• 5+ years full-stack experience with React, Node.js, Python\n• Strong AWS/GCP cloud expertise\n• Proven AI/ML integration skills\n• Excellent startup experience\n\nGAPS:\n• None significant\n\nRECOMMENDATIONS:\n• Schedule technical interview immediately',
        assignmentFeedback: '',
    },
    // MEDIUM-HIGH MATCH - Strong Backend
    {
        name: 'ANITA GUPTA',
        email: 'anita.gupta@email.com',
        phone: '+91-9876543211',
        resumeLink: 'https://drive.google.com/file/d/sample2',
        executionFit: 72.8,
        founderConfidence: 68.5,
        relevanceScore: 70.2,
        roleContext: 'High_Ownership_Critical',
        interviewFocus: 'Frontend skills depth; React/Next.js proficiency',
        riskNotes: 'Frontend experience limited to 2 years',
        assignment: 'Build a real-time dashboard component',
        recommendation: 'Yes',
        resumeFeedback: 'STRENGTHS:\n• Strong Python and Node.js backend skills\n• PostgreSQL and MongoDB expertise\n• Docker/Kubernetes experience\n\nGAPS:\n• Frontend experience needs strengthening\n\nRECOMMENDATIONS:\n• Assess React skills in interview',
        assignmentFeedback: '',
    },
    // MEDIUM MATCH - Growing Developer
    {
        name: 'VIKRAM SINGH',
        email: 'vikram.singh@email.com',
        phone: '+91-9876543212',
        resumeLink: 'https://drive.google.com/file/d/sample3',
        executionFit: 58.5,
        founderConfidence: 62.3,
        relevanceScore: 58.9,
        roleContext: 'Early_Startup_Execution',
        interviewFocus: 'Growth trajectory; Learning speed; Cloud platform basics',
        riskNotes: 'Only 3 years experience; Limited cloud exposure',
        assignment: '',
        recommendation: 'Maybe',
        resumeFeedback: 'STRENGTHS:\n• Solid JavaScript/TypeScript foundation\n• Quick learner with growth mindset\n• React experience\n\nGAPS:\n• Limited backend experience\n• No cloud/DevOps exposure\n\nRECOMMENDATIONS:\n• Consider for junior role',
        assignmentFeedback: '',
    },
    // LOW MATCH - Already processed
    {
        name: 'RAHUL VERMA',
        email: 'rahul.v@email.com',
        phone: '+91-9876543213',
        resumeLink: 'https://drive.google.com/file/d/sample4',
        executionFit: 3.5,
        founderConfidence: 30.5,
        relevanceScore: 16.1,
        roleContext: 'High_Ownership_Critical',
        interviewFocus: 'Verify depth in: 4+ years professional experience, React.js, Node.js',
        riskNotes: 'Significant skill gaps; Limited experience',
        assignment: '',
        recommendation: 'Not Now',
        resumeFeedback: 'STRENGTHS:\n• WordPress development\n• Basic web skills\n\nGAPS:\n• No React/Node.js experience\n• No cloud experience\n• Only 2 years experience\n\nRECOMMENDATIONS:\n• Pass - major skill gaps',
        assignmentFeedback: '',
    },
    // VERY LOW MATCH - Fresh Graduate
    {
        name: 'AMIT KUMAR',
        email: 'amit.kumar@email.com',
        phone: '+91-9876543214',
        resumeLink: 'https://drive.google.com/file/d/sample5',
        executionFit: 12.0,
        founderConfidence: 25.0,
        relevanceScore: 18.5,
        roleContext: 'High_Ownership_Critical',
        interviewFocus: '',
        riskNotes: 'Fresh graduate; No professional experience',
        assignment: '',
        recommendation: 'Not Now',
        resumeFeedback: 'STRENGTHS:\n• Strong academic background (B.Tech CS)\n• Enthusiasm for learning\n\nGAPS:\n• No professional experience\n• Limited practical skills\n\nRECOMMENDATIONS:\n• Pass - needs more experience',
        assignmentFeedback: '',
    },
];

async function addSampleData() {
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || './credentials.json';
    const spreadsheetId = process.env.GOOGLE_SHEETS_OUTPUT_ID;

    if (!spreadsheetId) {
        console.error('GOOGLE_SHEETS_OUTPUT_ID not set');
        process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // First, clear existing data (keep headers)
    console.log('Clearing existing data...');
    try {
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Candidates!A2:O100',
        });
    } catch (e) {
        console.log('Could not clear, sheet may be empty');
    }

    // Add sample data
    console.log('Adding sample candidates...');
    const rows = SAMPLE_CANDIDATES.map(c => [
        c.name,
        c.email,
        c.phone,
        c.resumeLink,
        c.executionFit.toFixed(1),
        c.founderConfidence.toFixed(1),
        c.relevanceScore.toFixed(1),
        c.roleContext,
        c.interviewFocus,
        c.riskNotes,
        c.assignment,
        c.recommendation,
        c.resumeFeedback,
        c.assignmentFeedback,
        new Date().toISOString(),
    ]);

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Candidates!A:O',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: rows,
        },
    });

    console.log(`✅ Added ${SAMPLE_CANDIDATES.length} sample candidates to Google Sheet`);
    console.log('\nCandidates added:');
    SAMPLE_CANDIDATES.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name} - ${c.relevanceScore}% - ${c.recommendation}`);
    });
}

addSampleData().catch(console.error);
