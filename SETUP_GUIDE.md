# 🚀 Hiring Intelligence System - Setup Guide

## Quick Setup Checklist

### ✅ Already Completed
- [x] Google Drive API enabled
- [x] Google Sheets API enabled  
- [x] Service Account created (`hiring-intelligence`)
- [x] JSON Key downloaded

---

## Step 1: Service Account JSON File

1. Find the downloaded file: `gen-lang-client-0802391045-c4a342159b41.json`
   - Check your browser's download bar or Downloads folder
   
2. Copy it to the project:
   ```bash
   cp ~/Downloads/gen-lang-client-0802391045-*.json /Users/priyanshu/Desktop/Best_Resume_Ever/credentials.json
   ```

---

## Step 2: Create Google Drive Folders

1. Go to [Google Drive](https://drive.google.com)
2. Create a folder called `Hiring_Intelligence`
3. Inside it, create two subfolders:
   - `Resumes` (upload resume PDFs here)
   - `Job_Description` (put one JD PDF here)
4. Get the folder IDs from the URL:
   - Open each folder and copy the ID from the URL:
   - `https://drive.google.com/drive/folders/COPY_THIS_ID`

---

## Step 3: Share Folders with Service Account

**IMPORTANT**: Share both folders with your service account email:
```
hiring-intelligence@gen-lang-client-0802391045.iam.gserviceaccount.com
```

1. Right-click each folder → Share
2. Paste the service account email
3. Give "Editor" access

---

## Step 4: Create Google Sheet for Output

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet called `Hiring Intelligence Results`
3. Copy the Sheet ID from the URL:
   - `https://docs.google.com/spreadsheets/d/COPY_THIS_ID/edit`
4. Share the sheet with the service account email (Editor access)

---

## Step 5: Configure .env File

Edit `/Users/priyanshu/Desktop/Best_Resume_Ever/.env`:

```env
# Google Credentials
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Google Drive Folder IDs (get from folder URLs)
RESUMES_FOLDER_ID=paste_resumes_folder_id_here
JD_FOLDER_ID=paste_jd_folder_id_here

# Google Sheet ID (get from spreadsheet URL)
OUTPUT_SHEET_ID=paste_sheet_id_here

# LLM - Gemini (paste your API key)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Step 6: Run the System

```bash
# Terminal 1 - Backend
cd /Users/priyanshu/Desktop/Best_Resume_Ever
npm run dev

# Terminal 2 - Frontend  
cd /Users/priyanshu/Desktop/Best_Resume_Ever/frontend
npm run dev
```

Then open: http://localhost:3000

---

## Step 7: Test It!

1. Upload a resume PDF to your Google Drive `Resumes` folder
2. Watch the backend console - it should detect and process the file
3. Check the Google Sheet for results
4. Refresh the dashboard to see updated data

---

## 🛠️ Troubleshooting

**"Permission denied" error:**
- Make sure you shared folders/sheets with the service account email

**"File not found" error:**
- Double-check the folder/sheet IDs in .env

**"Invalid credentials" error:**
- Verify credentials.json is in the project root

---

## 📞 Need Help?

If something doesn't work, check:
1. Backend console for error messages
2. That all IDs are correct in .env
3. That service account has access to all resources
