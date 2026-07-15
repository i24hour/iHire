import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Politician from '@/models/Politician';
import { sortPoliticiansForLeaderboard } from '@/lib/rank-politician/score';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const party = searchParams.get('party')?.trim();
        const q = searchParams.get('q')?.trim();
        const sortByParam = searchParams.get('sortBy');
        const sortBy = sortByParam === 'netScore' ? 'netScore' : 'onPortfolioPct';

        const filter: Record<string, unknown> = { isActive: true };
        if (party && party.toLowerCase() !== 'all') {
            filter.party = new RegExp(`^${party.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        }
        if (q) {
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { portfolio: { $regex: escaped, $options: 'i' } },
                { xHandle: { $regex: escaped, $options: 'i' } },
                { state: { $regex: escaped, $options: 'i' } },
            ];
        }

        const politicians = await Politician.find(filter).lean();
        const sorted = sortPoliticiansForLeaderboard(politicians as any[], sortBy);

        const parties = await Politician.distinct('party', { isActive: true });

        return NextResponse.json({
            politicians: sorted.map((p: any, index: number) => ({
                id: String(p._id),
                name: p.name,
                slug: p.slug,
                party: p.party,
                state: p.state || null,
                portfolio: p.portfolio,
                xHandle: p.xHandle,
                xProfileUrl: p.xProfileUrl,
                avatarUrl: p.avatarUrl || null,
                lastScrapedAt: p.lastScrapedAt || null,
                lastScrapeStatus: p.lastScrapeStatus || 'never',
                stats: p.stats || {
                    netScore: 0,
                    onPortfolioPct: 0,
                    postCount: 0,
                    scoredPostCount: 0,
                },
                rank: index + 1,
            })),
            total: sorted.length,
            parties: (parties as string[]).sort((a, b) => a.localeCompare(b)),
            sortBy,
        });
    } catch (error: any) {
        console.error('Error fetching rank-politician leaderboard:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to fetch politician rankings' },
            { status: 500 }
        );
    }
}
