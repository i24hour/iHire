import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Politician from '@/models/Politician';
import PoliticianPost from '@/models/PoliticianPost';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        await connectDB();
        const { slug } = await params;

        const politician = await Politician.findOne({
            slug: slug.toLowerCase(),
            isActive: true,
        }).lean() as any;

        if (!politician) {
            return NextResponse.json({ error: 'Politician not found' }, { status: 404 });
        }

        const posts = await PoliticianPost.find({ politicianId: politician._id })
            .sort({ postedAt: -1, createdAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({
            politician: {
                id: String(politician._id),
                name: politician.name,
                slug: politician.slug,
                party: politician.party,
                state: politician.state || null,
                portfolio: politician.portfolio,
                portfolioTopics: politician.portfolioTopics || [],
                xHandle: politician.xHandle,
                xProfileUrl: politician.xProfileUrl,
                avatarUrl: politician.avatarUrl || null,
                lastScrapedAt: politician.lastScrapedAt || null,
                lastScrapeStatus: politician.lastScrapeStatus || 'never',
                lastScrapeError: politician.lastScrapeError || null,
                stats: politician.stats || {
                    netScore: 0,
                    onPortfolioPct: 0,
                    postCount: 0,
                    scoredPostCount: 0,
                },
            },
            posts: posts.map((post: any) => ({
                id: String(post._id),
                externalId: post.externalId,
                text: post.text,
                postedAt: post.postedAt || null,
                postUrl: post.postUrl || null,
                category: post.category,
                score: post.score,
                scoreReason: post.scoreReason || null,
                scoredAt: post.scoredAt || null,
            })),
        });
    } catch (error: any) {
        console.error('Error fetching politician detail:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to fetch politician' },
            { status: 500 }
        );
    }
}
