import User from '@/models/User';

const DEFAULT_GITHUB_SYNC_INTERVAL_MS = 15 * 1000;
const GITHUB_SYNC_LOCK_MS = 30 * 1000;
const COMMIT_REWARD_POINTS = 10;

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

function normalizePointsHistory(rawHistory: unknown): GithubPointsHistoryEntry[] {
    if (!Array.isArray(rawHistory)) return [];

    return rawHistory
        .map((entry) => {
            const timestamp = new Date((entry as any)?.timestamp);
            const points = Math.max(0, Math.round(Number((entry as any)?.points || 0)));

            if (Number.isNaN(timestamp.getTime())) return null;

            return {
                timestamp,
                points,
            };
        })
        .filter((entry): entry is GithubPointsHistoryEntry => !!entry)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function appendPointsSnapshot(
    history: GithubPointsHistoryEntry[],
    timestamp: Date,
    points: number
): GithubPointsHistoryEntry[] {
    const normalizedPoints = Math.max(0, Math.round(points));
    const snapshots = [...history];
    const lastSnapshot = snapshots[snapshots.length - 1];

    if (!lastSnapshot || lastSnapshot.points !== normalizedPoints) {
        snapshots.push({ timestamp, points: normalizedPoints });
    }

    // Keep the most recent snapshots only
    return snapshots.slice(-2000);
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

        const existingHistory = normalizePointsHistory(lockedUser.githubPointsHistory);
        const seededHistory = existingHistory.length > 0
            ? existingHistory
            : [{
                timestamp: new Date(lockedUser.githubPointsLastUpdatedAt || lockedUser.githubConnectedAt || now),
                points: Math.max(0, Math.round(Number(lockedUser.points || 0))),
            }];
        const updatedHistory = appendPointsSnapshot(seededHistory, now, authoritativeGithubPoints);

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
