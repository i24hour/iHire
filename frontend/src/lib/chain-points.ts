import Chain from '@/models/IChain';
import User from '@/models/User';

export const CHAIN_REWARD_BLOCK_SECONDS = 3 * 60 * 60;
export const CHAIN_REWARD_STEP_POINTS = 10;
const MAX_HISTORY_SNAPSHOTS = 2000;

function normalizePointsHistory(rawHistory: unknown): Array<{ timestamp: Date; points: number }> {
    if (!Array.isArray(rawHistory)) return [];

    return rawHistory
        .map((entry) => {
            const safeEntry = (entry && typeof entry === 'object')
                ? (entry as { timestamp?: unknown; points?: unknown })
                : {};
            const rawTimestamp = safeEntry.timestamp;
            const timestamp = rawTimestamp instanceof Date
                ? rawTimestamp
                : typeof rawTimestamp === 'string' || typeof rawTimestamp === 'number'
                    ? new Date(rawTimestamp)
                    : new Date(Number.NaN);
            const points = Math.max(0, Math.round(Number(safeEntry.points || 0)));
            if (Number.isNaN(timestamp.getTime())) return null;
            return { timestamp, points };
        })
        .filter((entry): entry is { timestamp: Date; points: number } => !!entry)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function rewardPointsFromContributionSeconds(contributionSeconds: number): number {
    const safeSeconds = Math.max(0, Math.floor(Number(contributionSeconds || 0)));
    const completedBlocks = Math.floor(safeSeconds / CHAIN_REWARD_BLOCK_SECONDS);
    if (completedBlocks <= 0) return 0;

    // 10 + 20 + 30 + ... + (completedBlocks * 10)
    return Math.round((CHAIN_REWARD_STEP_POINTS * completedBlocks * (completedBlocks + 1)) / 2);
}

export async function recomputeChainPointsForUsers(userIds: string[]): Promise<void> {
    const normalizedUserIds = [...new Set(
        (userIds || [])
            .map((id) => String(id || '').trim().toLowerCase())
            .filter(Boolean)
    )];

    if (normalizedUserIds.length === 0) return;

    const aggregateRows = await Chain.aggregate([
        { $unwind: '$members' },
        { $match: { 'members.userId': { $in: normalizedUserIds } } },
        {
            $project: {
                userId: '$members.userId',
                contributionTime: { $ifNull: ['$members.contributionTime', 0] },
            },
        },
    ]);

    const contributionSecondsByUser = new Map<string, number>();
    for (const row of aggregateRows) {
        const userId = String(row?.userId || '').trim().toLowerCase();
        if (!userId) continue;

        const chainContributionSeconds = Number(row?.contributionTime || 0);
        contributionSecondsByUser.set(
            userId,
            (contributionSecondsByUser.get(userId) || 0) + Math.max(0, Math.floor(chainContributionSeconds))
        );
    }

    const totalsByUser = new Map<string, number>();
    for (const [userId, totalContributionSeconds] of contributionSecondsByUser.entries()) {
        totalsByUser.set(userId, rewardPointsFromContributionSeconds(totalContributionSeconds));
    }

    const users = await User.find({ email: { $in: normalizedUserIds } });
    const now = new Date();

    for (const user of users) {
        const targetPoints = Math.max(0, Math.round(totalsByUser.get(String(user.email).toLowerCase()) || 0));
        const currentPoints = Math.max(0, Math.round(Number(user.chainPoints || 0)));

        if (targetPoints === currentPoints) continue;

        user.chainPoints = targetPoints;
        user.chainPointsLastUpdatedAt = now;

        const history = normalizePointsHistory(user.chainPointsHistory);
        const lastSnapshot = history[history.length - 1];
        if (!lastSnapshot || lastSnapshot.points !== targetPoints) {
            history.push({ timestamp: now, points: targetPoints });
        }

        user.chainPointsHistory = history.slice(-MAX_HISTORY_SNAPSHOTS);
        await user.save();
    }
}
