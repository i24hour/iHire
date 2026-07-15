import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
    RANK_POLITICIAN_BATCH_SIZE,
    runRankPoliticianScrapeBatch,
} from '@/lib/rank-politician/pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ALLOWED_ADMINS = ['priyanshu85953@gmail.com', 'admin@infinwork.app'];

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !ALLOWED_ADMINS.includes(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const limit = Number(body?.limit) > 0 ? Number(body.limit) : RANK_POLITICIAN_BATCH_SIZE;
        const slugs = Array.isArray(body?.slugs)
            ? body.slugs.filter((s: unknown) => typeof s === 'string')
            : undefined;

        const result = await runRankPoliticianScrapeBatch({ limit, slugs });

        return NextResponse.json({
            message: 'Scrape batch completed',
            ...result,
        });
    } catch (error: any) {
        console.error('Manual rank-politician scrape failed:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to scrape politicians' },
            { status: 500 }
        );
    }
}
