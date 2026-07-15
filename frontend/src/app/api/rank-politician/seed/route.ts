import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Politician from '@/models/Politician';
import { POLITICIAN_SEEDS, toPoliticianDocument } from '@/lib/rank-politician/seed';

export const dynamic = 'force-dynamic';

const ALLOWED_ADMINS = ['priyanshu85953@gmail.com', 'admin@infinwork.app'];

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !ALLOWED_ADMINS.includes(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        let upserted = 0;
        const results: Array<{ slug: string; status: string }> = [];

        for (const seed of POLITICIAN_SEEDS) {
            const doc = toPoliticianDocument(seed);
            await Politician.findOneAndUpdate(
                { slug: doc.slug },
                {
                    $set: {
                        name: doc.name,
                        party: doc.party,
                        state: doc.state,
                        portfolio: doc.portfolio,
                        portfolioTopics: doc.portfolioTopics,
                        xHandle: doc.xHandle,
                        xProfileUrl: doc.xProfileUrl,
                        isActive: true,
                    },
                    $setOnInsert: {
                        lastScrapeStatus: 'never',
                        stats: doc.stats,
                    },
                },
                { upsert: true, new: true }
            );
            upserted++;
            results.push({ slug: doc.slug, status: 'upserted' });
        }

        const total = await Politician.countDocuments({ isActive: true });

        return NextResponse.json({
            message: `Seeded ${upserted} politicians`,
            upserted,
            totalActive: total,
            results,
        });
    } catch (error: any) {
        console.error('Error seeding politicians:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to seed politicians' },
            { status: 500 }
        );
    }
}
