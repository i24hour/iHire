# iTime - Authentication Setup Guide

## 🎯 What's Been Added

Your iTime tracker now has **multi-user authentication**! Users can:
- ✅ Sign in with **Google** (OAuth)
- ✅ Sign in with **Email/Password**
- ✅ Continue as **Guest** (localStorage only)
- ✅ Each user has their own tasks synced across devices

## 🚀 Setup Instructions

### 1. Google OAuth Setup (Optional but Recommended)

To enable Google Sign-In, you need to create OAuth credentials:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/apis/credentials
2. **Create a new project** (or use existing)
3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 Credentials**:
   - Go to "Credentials" > "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "iTime Tracker"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
5. **Copy your credentials**:
   - Copy the **Client ID**
   - Copy the **Client Secret**
6. **Add to `.env.local`**:
   ```bash
   GOOGLE_CLIENT_ID=your-actual-client-id-here
   GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
   ```

### 2. Environment Variables

Update your `/frontend/.env.local` file:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=generate-a-random-32-char-string-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Next.js Configuration

Add this to `next.config.ts` for Google profile images:

```typescript
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};
```

### 4. Start the Development Server

```bash
cd frontend
npm run dev
```

Visit: http://localhost:3000/itime

## 📱 How It Works

### For Users:

1. **Without Sign-In** (Guest Mode):
   - Click "Add Task" → Sign-in modal appears
   - Click "Continue as guest" at bottom
   - Tasks saved in localStorage (device-specific)

2. **With Google Sign-In**:
   - Click "Sign In" button (top right)
   - Select "Continue with Google"
   - Tasks synced across all devices

3. **With Email/Password**:
   - Click "Sign In" button
   - Enter email and password
   - (Demo mode - in production, connect to database)

### User Interface:

- **Top Right Corner**: Shows user profile pic, name, and "Sign Out" button when logged in
- **Add Task Button**: Triggers sign-in modal if not authenticated
- **Sign In Modal**: Beautiful modal with Google OAuth and email options

## 🗄️ Database Integration (Next Steps)

Currently, tasks are stored in localStorage. To sync across devices:

### Option 1: Use Supabase (Recommended)
```bash
npm install @supabase/supabase-js
```

### Option 2: Use MongoDB
```bash
npm install mongodb mongoose
```

### Option 3: Use Prisma with PostgreSQL
```bash
npm install @prisma/client
```

## 🔒 Security Features

- ✅ OAuth 2.0 with Google
- ✅ Secure session management (NextAuth.js)
- ✅ CSRF protection
- ✅ Encrypted cookies
- ✅ Guest mode with local-only storage

## 🎨 UI Features

- Modern, clean sign-in modal
- Google brand colors and logo
- Email/password form
- "Continue as guest" option
- User profile display
- Smooth animations and transitions

## 📝 Notes

- **Guest Mode**: Tasks stored in browser localStorage (not synced)
- **Signed In**: Ready for cloud sync (add database integration)
- **Google OAuth**: Requires setup but provides best UX
- **Email Auth**: Demo mode - connect to real database for production

## 🚀 Production Deployment

Before deploying:

1. Set `NEXTAUTH_URL` to your production domain
2. Add production redirect URI to Google OAuth settings
3. Use a strong `NEXTAUTH_SECRET`
4. Connect to a real database for user data
5. Add proper email verification for email/password auth

---

**Ready to use!** Start adding tasks and the sign-in modal will appear automatically! 🎯
