# Rank Politician external cron (GitHub Actions)

Vercel Hobby only allows **one cron run per day**. This workflow calls the same scrape endpoint every **4 hours**.

## Required GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same value as Vercel env `CRON_SECRET` (Production) |
| `RANK_POLITICIAN_CRON_URL` | `https://www.infinwork.app/api/cron/rank-politician` (optional; has default) |

## Schedule

- Automatic: `15 */4 * * *` (every 4 hours)
- Manual: Actions → **Rank Politician Cron** → **Run workflow**

## Verify

1. Run workflow manually once
2. Open https://www.infinwork.app/rank-politician
3. Confirm scrape timestamps move forward / error counts drop
