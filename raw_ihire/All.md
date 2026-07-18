# Infinwork (iHire) - Developer Logic & Architecture

Last updated: 15 Jul 2026  
This is the source-of-truth doc for the current Infinwork smart-workspace codebase.

---

## 1) Product Scope (Current)

Active workspace modules in this repo:

1. **iTime** (`/itime`) - task timer + performance score engine
2. **Workers** (`/workers`) - user leaderboard and per-user task analytics
3. **Rank Politician** (`/rank-politician`) - Indian politician X communication focus rankings (seed + Firecrawl scrape/score pipeline + leaderboard)
4. **iChain** (`/ichain`) - collaborative chain timer with burst mechanics
5. **Ideas** (`/ideas`) - public/private idea board + replies
6. **SF Tracker** (`/sf-tracker`) - success/failure target tracking
7. **Settings** (`/settings`) - username + GitHub connect/sync

Legacy hiring/candidate APIs still exist in code, but the current product focus is the smart workspace features above.

---

## 2) Tech Stack

### Frontend App
- **Framework**: Next.js `16.1.1` (App Router)
- **UI**: React `19.2.3`, Tailwind CSS `v4`, Framer Motion
- **Charts**: `lightweight-charts` + custom daily heatmap renderer
- **Auth**: NextAuth `v4` (Google, GitHub, Credentials provider)
- **Mobile Packaging**: Capacitor (`@capacitor/android`)

### Backend Layer (inside same Next.js app)
- **API**: Next.js Route Handlers (`frontend/src/app/api/**`)
- **Database**: MongoDB via Mongoose
- **Email/Integrations**: Nodemailer, Resend, Google APIs (where required)

### Deployment
- Root `vercel.json` points to `frontend` as app root.
- Frontend has its own `vercel.json` build settings.

---

## 3) Core Data Models

### `User` (`frontend/src/models/User.ts`)
- Identity: `email`, `username`, `image`
- Authz: `isAdmin` (boolean, indexed) — source of truth for admin actions
- GitHub integration:
  - `githubId`, `githubUsername`, `githubAccessToken`
  - `githubConnectedAt`, `lastGithubSyncAt`, `githubSyncLockUntil`
  - `githubCommitsTotal`
  - `points` (authoritative GitHub points, rounded integer)
  - `githubPointsLastUpdatedAt`
  - `githubPointsHistory[]` = cumulative snapshots `{ timestamp, points }`

### `ITimeTask` (`frontend/src/models/ITimeTask.ts`)
- Task timing: `startTime`, `pausedElapsed`, `events[]`
- State: `enabled`, `completed`, `completedAt`
- Safety: `cancelledAt`, `cancelReason` (`runtime_limit`)
- Extras: `autoResumeAt`, `targetTime`, `isPublic`, `milestones`

### `IChain` (`frontend/src/models/IChain.ts`)
- Chain state: `status` (`Active|Idle|Burst`), `totalTime`, `maxTime`, `lastStartedAt`, `burstAt`
- Members: per-member `isWorking`, `contributionTime`, `lastStartedAt`, `lastVisitAt`, `parentId`, `isStarter`

### `Idea`, `Reply`, `SFTracker`
- Idea: title/details + public/private visibility
- Reply: text/image + public/private visibility + edit tracking
- SFTracker: target + success/failure + failure reason

### `Politician`, `PoliticianPost` (Rank Politician)
- Politician: name/slug, party, portfolio, `portfolioTopics[]`, X handle/url, scrape status, cached `stats`
- PoliticianPost: text, externalId, category, score, scoreReason
- Seed list: `frontend/src/lib/rank-politician/seed.ts` (~38 Indian leaders)
- Score helpers: `frontend/src/lib/rank-politician/score.ts`
  - Categories: `on_portfolio(+2)`, `related(+1)`, `off_topic(-1)`, `attack(-2)`, `personal(-1)`, `unknown(0)`
  - Leaderboard default sort: `% on-portfolio`, then net score
- Scrape pipeline: `frontend/src/lib/rank-politician/scrape.ts` + `pipeline.ts`
  - Firecrawl `POST /v2/scrape` with `markdown` + `links`
  - Parse `x.com/{handle}/status/{id}` URLs into posts (markdown-block fallback)
  - Classify + upsert posts, recompute politician `stats`
  - Batch size default: 10 oldest-`lastScrapedAt` politicians per run

---

## 4) iTime Score Logic (Exact)

Implemented in `frontend/src/lib/score.ts`.

### Base score
```text
CompletionRate = completedTasks / totalTasks
AvgTimePerCompletedTask = (completedTaskHours + runningTaskHours) / completedTasks
SpeedScore = 1 / max(AvgTimePerCompletedTask, 0.5)
VolumeBonus = log10(completedTasks + 1) * 2

BaseScore = CompletionRate * SpeedScore * VolumeBonus * 1000
```

### Idle penalty
```text
IdlePenalty accrues at 0.001 points / second
```
- Penalty starts from:
  - `max(1 Apr 2026 00:00 IST, first tracked task start)`
- If no tracked task exists, penalty is `0`.
- Penalty is computed from merged idle intervals between active task intervals.

### Total score
```text
TotalScore = BaseScore + GithubPointsAtTime + ChainPointsAtTime - IdlePenalty
```

Important: **penalty is deducted from total score, not from GitHub points**.

---

## 5) GitHub Sync + Points (Current Behavior)

Implemented in `frontend/src/lib/github-sync.ts`.

### Constants
- `COMMIT_REWARD_POINTS = 10`
- `DEFAULT_GITHUB_SYNC_INTERVAL_MS = 15000` (15s cooldown)
- `GITHUB_SYNC_LOCK_MS = 30000` (30s lock window)

### Sync flow
1. Validate user + GitHub connected.
2. Respect cooldown unless `force`.
3. Acquire DB lock (`githubSyncLockUntil`) to avoid race/double increments.
4. Query GitHub GraphQL contributions (`contributionsCollection`) from `githubConnectedAt` to now.
5. Compute:
   - `commitsSinceConnection`
   - `newCommits = max(0, commitsSinceConnection - githubCommitsTotal)`
   - `pointsEarned = newCommits * 10`
   - `authoritativeGithubPoints = commitsSinceConnection * 10`
6. Persist:
   - `points = authoritativeGithubPoints`
   - `githubCommitsTotal = commitsSinceConnection`
   - `lastGithubSyncAt = now`
   - `githubPointsHistory[]` rebuilt from contribution days

### Important fix (May 2026)
`githubPointsHistory` is rebuilt from **GitHub day-wise contributions** (IST day-end anchors) + current `now` snapshot, so daily score reflects the **actual contribution day**, not just sync timestamp.

This prevents the previous issue where one day looked negative and the next day got a large positive spike after late sync.

---

## 6) iTime Runtime Safety Rules

Implemented in `frontend/src/lib/itime-runtime.ts`.

- `ACTIVE_TASK_RUNTIME_LIMIT_SECONDS = 100 * 60 * 60` (100 hours)
- Any active task crossing 100h is auto-cancelled:
  - `enabled = false`
  - `pausedElapsed = 100h`
  - `cancelledAt = cutoff timestamp`
  - `cancelReason = "runtime_limit"`
  - pause event injected if needed for timeline consistency

Enforced by:
- `/api/itime`
- `/api/workers`
- `/api/workers/[userId]/tasks`
- `/api/cron/ping`

---

## 7) iChain Logic

Core logic: `frontend/src/lib/ichain.ts`, routes in `/api/ichain`.

### States
- `Active`: at least one member working
- `Idle`: no active member (intermediate)
- `Burst`: streak broken

### Visit enforcement
- `CHAIN_VISIT_WINDOW_MS = 3 * 60 * 60 * 1000` (3 hours)
- If a member is working but does not revisit chain detail page in 3h:
  - member auto-stopped
  - contribution time is finalized to timeout moment
- If no active members remain and chain was `Active`:
  - chain auto-bursts
  - `maxTime` updates if current run was highest

### Ranking
- Global ranking sorted by `maxTime` (with live active-chain adjustment in list fetch).

### Individual chain reward points
- Reward is based on **individual member contribution time**, not chain total.
- Contribution time is aggregated per user across all chains, then reward tiers are applied.
- Block size: **3 hours** (`10,800s`) per block.
- Progressive reward per completed block:
  - 1st 3h block: `+10`
  - 2nd 3h block: `+20`
  - 3rd 3h block: `+30`
  - ... and so on
- Total reward after `n` completed 3h blocks:
```text
ChainRewardPoints = 10 * (1 + 2 + ... + n) = 10 * n * (n + 1) / 2
```
- These points are persisted per user (`User.chainPoints`) and included in total score.

### Member invite behavior
- Add via email or username (case-insensitive exact username match via regex)
- Missing users are rejected with explicit error.

---

## 8) Performance Chart Modes

Component: `frontend/src/components/PerformanceChart.tsx`

Modes:
1. `Line`
2. `Candle`
3. `Daily score` (**default**)

### Daily score heatmap
- Year grid similar to GitHub contributions graph
- Positive days: green scale (intensity by magnitude)
- Negative days: red scale (intensity by magnitude)
- Neutral: gray
- Hover/tap tooltip shows exact `+/- points` and date
- Theme-aware colors for dark/light mode
- Mobile: auto-scrolls to latest/current month region for visibility

---

## 9) Polling / Refresh Strategy

- Settings: refresh user data every **15s**
- iTime: refresh profile/GitHub data every **15s**
- Workers list: refresh every **15s**
- iChain list/detail: refresh every **5s** (+ local 1s ticker on detail for smooth timers)
- Chart live update loop: **1s** for line/candle rendering

---

## 10) Main APIs (Smart Workspace)

### iTime / scoring
- `GET/POST/PUT/DELETE /api/itime`
- `GET /api/workers`
- `GET /api/workers/[userId]/tasks`

### GitHub/user settings
- `GET/POST /api/user/settings`
- `POST /api/user/sync-github`
- `POST /api/user/disconnect-github`
- `GET /api/user/search`
- `GET /api/user/lookup`
- `POST /api/user/profile`

### iChain
- `GET/POST /api/ichain`
- `GET/PUT/DELETE /api/ichain/[chainId]`

### Ideas
- `GET/POST /api/ideas`
- `GET/PATCH/DELETE /api/ideas/[ideaId]`
- `GET/POST /api/ideas/[ideaId]/replies`
- `PATCH/DELETE /api/replies/[replyId]`

### SF Tracker
- `GET/POST /api/sf-tracker`
- `PUT/DELETE /api/sf-tracker/[id]`
- `GET /api/sf-tracker/all`
- `GET /api/sf-tracker/user/[userId]` (privacy-scrubbed read-only view)

### Admin authz
- Canonical check: `User.isAdmin` via `frontend/src/lib/admin.ts` (`requireAdminSession`)
- Bootstrap: `POST /api/admin/claim-first` (only when zero admins exist)
- Grant/revoke: `PATCH /api/admin/users` body `{ email, isAdmin }` (admin-only; cannot remove last admin)
- Status: `GET /api/admin/status` → `{ hasAdmin, adminCount }`
- Settings exposes `isAdmin` for UI controls
- Do **not** hardcode admin emails in source

### Rank Politician
- `GET /api/rank-politician` (leaderboard; query: `party`, `q`, `scrapeStatus`, `sortBy=onPortfolioPct|netScore`; includes `meta` scrape health summary)
- `GET /api/rank-politician/[slug]` (detail + scored posts)
- `POST /api/rank-politician/seed` (admin-only upsert of starter politicians)
- `POST /api/rank-politician/scrape` (admin-only manual Firecrawl batch; body: `{ limit?, slugs? }`)
- `GET /api/cron/rank-politician` (scheduled scrape+score batch; auth via `CRON_SECRET`)
- UI polish: scrape-status badges, filter chips, category breakdown bars, admin Seed/Scrape buttons
- Env: `FIRECRAWL_API_KEY`, `CRON_SECRET` (plus existing `MONGODB_URI`)
- Vercel cron: daily at 03:00 UTC → `/api/cron/rank-politician` (Hobby plan limit: 1 run/day; may run anytime in that hour)
- Batch: 15 politicians/run, prioritized `never` → `error` → `partial` → `success`, then oldest `lastScrapedAt`
- Note: hitting the cron URL in a browser returns 401 unless `Authorization: Bearer $CRON_SECRET` is sent (Vercel adds this automatically for scheduled runs)

### Maintenance
- `GET /api/cron/ping` (DB wake + runtime auto-cancel sweep)

---

## 11) Clarification on “Why score can still be negative”

Even with new commits, total/live score can still be negative when:

1. Idle penalty accumulated over long duration is larger than gains.
2. Base score drops due completion/speed/volume dynamics.
3. GitHub sync has not run yet after new commits.

With current logic, once sync runs, commit gains are now attributed to the correct contribution day in daily mode.

---

## 12) Notes for New Developers

1. Use `score.ts` as the canonical source for score math.
2. Do not mutate GitHub points directly outside `github-sync.ts`.
3. Keep all chart score calculations routed through `getScoreAtTime(...)` for consistency.
4. If changing chain timer logic, update both `/api/ichain` list route and `/api/ichain/[chainId]` detail route behavior.
5. If product rules change, update this file in the same PR.
