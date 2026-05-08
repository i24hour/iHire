import User from '@/models/User';

const DEFAULT_GITHUB_SYNC_INTERVAL_MS = 15 * 1000;
const GITHUB_SYNC_LOCK_MS = 30 * 1000;
const COMMIT_REWARD_POINTS = 10;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type SyncSkipReason = 'missing_user' | 'not_connected' | 'cooldown' | 'locked';

export interface GithubSyncResult {
    status: 'synced' | 'skipped';
    reason?: SyncSkipReason;
    isFirstSync: boolean;
    newCommits: number;
    pointsEarned: number;
    totalPoints: number;
    lastGithubSyncAt: Date | null;
    githubPointsLastUpdatedAt: Date | null;
}

interface SyncGithubOptions {
    force?: boolean;
    minIntervalMs?: number;
}

interface GithubPointsHistoryEntry {
    timestamp: Date;
    points: number;
}

function isWithinInterval(value: Date | string | undefined, intervalMs: number) {
    if (!value) return false;

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return false;

    return Date.now() - timestamp < intervalMs;
}

function getIstDayEndFromGithubDate(dateString: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (!match) return null;

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);

    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) {
        return null;
    }

    const istMidnightUtcMs = Date.UTC(year, monthIndex, day, 0, 0, 0, 0) - IST_OFFSET_MS;
    return new Date(istMidnightUtcMs + DAY_MS - 1);
}

function buildPointsHistoryFromContributionDays(
    contributionDays: Array<{ date: string; commits: number }>,
    connectionDate: Date,
    now: Date
): GithubPointsHistoryEntry[] {
    const pointsByTimestamp = new Map<number, number>();

    const connectionAt = connectionDate.getTime();
    if (Number.isFinite(connectionAt)) {
        pointsByTimestamp.set(connectionAt, 0);
    }

    let cumulativeCommits = 0;
    const normalizedDays = contributionDays
        .filter((day) => typeof day.date === 'string')
        .map((day) => ({
            date: day.date,
            commits: Math.max(0, Math.round(Number(day.commits || 0))),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    for (const day of normalizedDays) {
        cumulativeCommits += day.commits;
        const dayEnd = getIstDayEndFromGithubDate(day.date);
        if (!dayEnd) continue;

        const dayEndMs = dayEnd.getTime();
        if (!Number.isFinite(dayEndMs)) continue;

        const dayPoints = cumulativeCommits * COMMIT_REWARD_POINTS;
        const existing = pointsByTimestamp.get(dayEndMs);
        if (existing === undefined || dayPoints > existing) {
            pointsByTimestamp.set(dayEndMs, dayPoints);
        }
    }

    const authoritativePoints = cumulativeCommits * COMMIT_REWARD_POINTS;
    pointsByTimestamp.set(now.getTime(), authoritativePoints);

    return Array.from(pointsByTimestamp.entries())
        .map(([timestamp, points]) => ({
            timestamp: new Date(timestamp),
            points: Math.max(0, Math.round(points)),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(-2000);
}

async function releaseGithubSyncLock(userId: string) {
    await User.updateOne({ _id: userId }, { $unset: { githubSyncLockUntil: '' } });
}

export async function syncGithubForUserByEmail(
    email: string,
    options: SyncGithubOptions = {}
): Promise<GithubSyncResult> {
    const user = await User.findOne({ email });

    if (!user) {
        return {
            status: 'skipped',
            reason: 'missing_user',
            isFirstSync: false,
            newCommits: 0,
            pointsEarned: 0,
            totalPoints: 0,
            lastGithubSyncAt: null,
            githubPointsLastUpdatedAt: null,
        };
    }

    return syncGithubForUser(user, options);
}

export async function syncGithubForUser(
    user: any,
    options: SyncGithubOptions = {}
): Promise<GithubSyncResult> {
    const minIntervalMs = options.minIntervalMs ?? DEFAULT_GITHUB_SYNC_INTERVAL_MS;
    const currentPoints = Math.max(0, Math.round(user.points || 0));
    const currentLastSyncAt = user.lastGithubSyncAt ? new Date(user.lastGithubSyncAt) : null;

    if (!user.githubUsername) {
        return {
            status: 'skipped',
            reason: 'not_connected',
            isFirstSync: !user.lastGithubSyncAt,
            newCommits: 0,
            pointsEarned: 0,
            totalPoints: currentPoints,
            lastGithubSyncAt: currentLastSyncAt,
            githubPointsLastUpdatedAt: user.githubPointsLastUpdatedAt ? new Date(user.githubPointsLastUpdatedAt) : null,
        };
    }

    if (!options.force && isWithinInterval(user.lastGithubSyncAt, minIntervalMs)) {
        return {
            status: 'skipped',
            reason: 'cooldown',
            isFirstSync: !user.lastGithubSyncAt,
            newCommits: 0,
            pointsEarned: 0,
            totalPoints: currentPoints,
            lastGithubSyncAt: currentLastSyncAt,
            githubPointsLastUpdatedAt: user.githubPointsLastUpdatedAt ? new Date(user.githubPointsLastUpdatedAt) : null,
        };
    }

    const now = new Date();
    const lockedUser = await User.findOneAndUpdate(
        {
            _id: user._id,
            $or: [
                { githubSyncLockUntil: { $exists: false } },
                { githubSyncLockUntil: null },
                { githubSyncLockUntil: { $lte: now } },
            ],
        },
        {
            $set: {
                githubSyncLockUntil: new Date(now.getTime() + GITHUB_SYNC_LOCK_MS),
            },
        },
        { new: true }
    );

    if (!lockedUser) {
        const latestUser = await User.findById(user._id).lean();

        return {
            status: 'skipped',
            reason: 'locked',
            isFirstSync: !latestUser?.lastGithubSyncAt,
            newCommits: 0,
            pointsEarned: 0,
            totalPoints: latestUser?.points || currentPoints,
            lastGithubSyncAt: latestUser?.lastGithubSyncAt ? new Date(latestUser.lastGithubSyncAt) : currentLastSyncAt,
            githubPointsLastUpdatedAt: latestUser?.githubPointsLastUpdatedAt ? new Date(latestUser.githubPointsLastUpdatedAt) : null,
        };
    }

    let shouldReleaseLock = true;

    try {
        if (!options.force && isWithinInterval(lockedUser.lastGithubSyncAt, minIntervalMs)) {
            return {
                status: 'skipped',
                reason: 'cooldown',
                isFirstSync: !lockedUser.lastGithubSyncAt,
                newCommits: 0,
                pointsEarned: 0,
                totalPoints: lockedUser.points || 0,
                lastGithubSyncAt: lockedUser.lastGithubSyncAt ? new Date(lockedUser.lastGithubSyncAt) : null,
                githubPointsLastUpdatedAt: lockedUser.githubPointsLastUpdatedAt ? new Date(lockedUser.githubPointsLastUpdatedAt) : null,
            };
        }

        const isFirstSync = !lockedUser.lastGithubSyncAt;
        const connectionDate = lockedUser.githubConnectedAt
            ? new Date(lockedUser.githubConnectedAt)
            : now;
        const previousCommitCheckpoint = Math.max(0, Number(lockedUser.githubCommitsTotal || 0));

        const query = `
          query($login: String!, $connectionDate: DateTime!, $now: DateTime!) {
            user(login: $login) {
              commitsSinceConnection: contributionsCollection(from: $connectionDate, to: $now) {
                contributionCalendar {
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                    }
                  }
                }
              }
            }
          }
        `;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (lockedUser.githubAccessToken) {
            headers.Authorization = `Bearer ${lockedUser.githubAccessToken}`;
        }

        const githubRes = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query,
                variables: {
                    login: lockedUser.githubUsername,
                    connectionDate: connectionDate.toISOString(),
                    now: now.toISOString(),
                },
            }),
            cache: 'no-store',
        });

        if (!githubRes.ok) {
            const errorText = await githubRes.text();
            console.error('GitHub GraphQL API error:', errorText);
            throw new Error(`Failed to fetch from GitHub: ${githubRes.status}`);
        }

        const jsonRes = await githubRes.json();

        if (jsonRes.errors) {
            console.error('GitHub GraphQL errors:', jsonRes.errors);
            throw new Error('Failed to query GitHub profile.');
        }

        const contributionDays = jsonRes.data?.user?.commitsSinceConnection?.contributionCalendar?.weeks
            ?.flatMap((week: any) => week?.contributionDays || [])
            ?.filter((day: any) => typeof day?.date === 'string')
            ?.map((day: any) => ({
                date: day.date,
                commits: Math.max(0, Number(day.contributionCount || 0)),
            })) || [];

        const commitsSinceConnection = contributionDays.reduce((sum: number, day: { commits: number }) => sum + day.commits, 0);
        const newCommits = isFirstSync
            ? commitsSinceConnection
            : Math.max(0, commitsSinceConnection - previousCommitCheckpoint);
        const pointsEarned = newCommits * COMMIT_REWARD_POINTS;
        const authoritativeGithubPoints = commitsSinceConnection * COMMIT_REWARD_POINTS;

        const updatedHistory = buildPointsHistoryFromContributionDays(
            contributionDays,
            connectionDate,
            now
        );

        if (lockedUser.points !== authoritativeGithubPoints) {
            lockedUser.points = authoritativeGithubPoints;
            lockedUser.githubPointsLastUpdatedAt = now;
        }

        if (!lockedUser.githubConnectedAt) {
            lockedUser.githubConnectedAt = connectionDate;
        }

        lockedUser.githubCommitsTotal = Math.max(0, commitsSinceConnection);
        lockedUser.githubPointsHistory = updatedHistory;
        lockedUser.lastGithubSyncAt = now;
        lockedUser.githubSyncLockUntil = undefined;
        await lockedUser.save();
        shouldReleaseLock = false;

        return {
            status: 'synced',
            isFirstSync,
            newCommits,
            pointsEarned,
            totalPoints: Math.max(0, Math.round(lockedUser.points || 0)),
            lastGithubSyncAt: lockedUser.lastGithubSyncAt ? new Date(lockedUser.lastGithubSyncAt) : null,
            githubPointsLastUpdatedAt: lockedUser.githubPointsLastUpdatedAt ? new Date(lockedUser.githubPointsLastUpdatedAt) : null,
        };
    } finally {
        if (shouldReleaseLock) {
            await releaseGithubSyncLock(String(user._id));
        }
    }
}
