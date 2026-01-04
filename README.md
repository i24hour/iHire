# Hiring Intelligence System

A production-grade multi-agent AI system for resume screening and candidate ranking.

## 🚀 Deployment

### Backend (Railway)

1. **Push to GitHub** (if not already)
2. **Connect Railway to GitHub:**
   - Go to [railway.app](https://railway.app)
   - Create new project → Deploy from GitHub
   - Select this repo

3. **Set Environment Variables in Railway:**
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64 encoded credentials.json>
   GOOGLE_DRIVE_RESUMES_FOLDER_ID=<your folder id>
   GOOGLE_DRIVE_JD_FOLDER_ID=<your folder id>
   GOOGLE_SHEETS_OUTPUT_ID=<your sheet id>
   LITELLM_PROVIDER=gemini
   LITELLM_MODEL=gemini-2.0-flash
   LITELLM_API_KEY=<your gemini api key>
   ```

   **To encode credentials.json as base64:**
   ```bash
   cat credentials.json | base64 -w 0
   ```

4. **Deploy** - Railway will auto-build and run

### Frontend (Vercel)

1. **Go to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Deploy to Vercel:**
   ```bash
   npx vercel
   ```

3. **Set Environment Variables in Vercel Dashboard:**
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<same as Railway>
   GOOGLE_SHEETS_OUTPUT_ID=<your sheet id>
   ```

---

## 🔧 Local Development

```bash
# Backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
├── src/
│   ├── agents/         # AI agents (JD Reality, Technical, etc.)
│   ├── integrations/   # Google Drive, Sheets, LLM clients
│   ├── synthesis/      # Score synthesis and verdicts
│   └── workflow/       # Orchestration
├── frontend/           # Next.js dashboard
├── Dockerfile          # Railway deployment
└── railway.json        # Railway config
```

## 🔄 How It Works

1. **Upload PDF** to Google Drive Resumes folder
2. **Backend detects** new file (polls every 30s)
3. **AI processes** through 6 specialized agents
4. **Results saved** to Google Sheet
5. **Frontend displays** ranked candidates
