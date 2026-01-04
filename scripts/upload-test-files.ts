// Script to upload test files to Google Drive
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config();

async function uploadTestFiles() {
    // Load credentials
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || './credentials.json';
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const jdFolderId = process.env.GOOGLE_DRIVE_JD_FOLDER_ID;
    const resumesFolderId = process.env.GOOGLE_DRIVE_RESUMES_FOLDER_ID;

    console.log('📤 Uploading test files to Google Drive...\n');

    // Upload JD
    const jdPath = './test_files/sample_jd.pdf';
    if (fs.existsSync(jdPath)) {
        console.log('Uploading JD...');
        const jdResult = await drive.files.create({
            requestBody: {
                name: 'sample_jd.pdf',
                parents: [jdFolderId!],
            },
            media: {
                mimeType: 'application/pdf',
                body: fs.createReadStream(jdPath),
            },
        });
        console.log(`✅ JD uploaded: ${jdResult.data.name} (ID: ${jdResult.data.id})`);
    }

    // Upload high-match resume
    const resume1Path = './test_files/sample_resume_high_match.pdf';
    if (fs.existsSync(resume1Path)) {
        console.log('Uploading high-match resume...');
        const r1Result = await drive.files.create({
            requestBody: {
                name: 'sample_resume_high_match.pdf',
                parents: [resumesFolderId!],
            },
            media: {
                mimeType: 'application/pdf',
                body: fs.createReadStream(resume1Path),
            },
        });
        console.log(`✅ Resume uploaded: ${r1Result.data.name} (ID: ${r1Result.data.id})`);
    }

    // Upload low-match resume
    const resume2Path = './test_files/sample_resume_low_match.pdf';
    if (fs.existsSync(resume2Path)) {
        console.log('Uploading low-match resume...');
        const r2Result = await drive.files.create({
            requestBody: {
                name: 'sample_resume_low_match.pdf',
                parents: [resumesFolderId!],
            },
            media: {
                mimeType: 'application/pdf',
                body: fs.createReadStream(resume2Path),
            },
        });
        console.log(`✅ Resume uploaded: ${r2Result.data.name} (ID: ${r2Result.data.id})`);
    }

    console.log('\n✅ All test files uploaded successfully!');
    console.log('\n🔄 The backend should now detect and process these files automatically.');
}

uploadTestFiles().catch(console.error);
