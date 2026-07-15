import connectDB from '@/lib/mongodb';
import Politician, { type IPolitician } from '@/models/Politician';
import PoliticianPost from '@/models/PoliticianPost';
import {
    aggregatePoliticianStats,
    classifyPost,
    type PostCategory,
} from '@/lib/rank-politician/score';
import {
    parsePostsFromFirecrawl,
    scrapeXProfileWithFirecrawl,
} from '@/lib/rank-politician/scrape';

export const RANK_POLITICIAN_BATCH_SIZE = 10;

export interface PoliticianScrapeSummary {
    slug: string;
    xHandle: string;
    status: 'success' | 'error' | 'skipped';
    postsFound: number;
    postsUpserted: number;
    error?: string;
}

export interface RankPoliticianRunResult {
    ranAt: string;
    firecrawlConfigured: boolean;
    processed: number;
    successCount: number;
    errorCount: number;
    skippedCount: number;
    results: PoliticianScrapeSummary[];
}

async function recomputePoliticianStats(politicianId: string) {
    const posts = await PoliticianPost.find({ politicianId })
        .select('category score')
        .lean();

    const stats = aggregatePoliticianStats(
        posts.map((post: any) => ({
            category: (post.category || 'unknown') as PostCategory,
            score: Number(post.score || 0),
        }))
    );

    await Politician.findByIdAndUpdate(politicianId, {
        $set: {
            stats: {
                ...stats,
                lastScoredAt: new Date(),
            },
        },
    });

    return stats;
}

async function upsertScoredPosts(
    politician: IPolitician & { _id: any },
    candidates: ReturnType<typeof parsePostsFromFirecrawl>
): Promise<number> {
    let upserted = 0;
    const topics = politician.portfolioTopics || [];

    for (const candidate of candidates) {
        const classification = classifyPost(candidate.text, topics);

        await PoliticianPost.findOneAndUpdate(
            { externalId: candidate.externalId },
            {
                $set: {
                    politicianId: politician._id,
                    text: candidate.text,
                    postedAt: candidate.postedAt,
                    postUrl: candidate.postUrl,
                    rawMarkdown: candidate.rawMarkdown,
                    category: classification.category,
                    score: classification.score,
                    scoreReason: classification.scoreReason,
                    scoredAt: new Date(),
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        upserted++;
    }

    return upserted;
}

export async function scrapeAndScorePolitician(
    politician: IPolitician & { _id: any }
): Promise<PoliticianScrapeSummary> {
    const summary: PoliticianScrapeSummary = {
        slug: politician.slug,
        xHandle: politician.xHandle,
        status: 'success',
        postsFound: 0,
        postsUpserted: 0,
    };

    try {
        const scraped = await scrapeXProfileWithFirecrawl(politician.xProfileUrl);
        const candidates = parsePostsFromFirecrawl(
            politician.xHandle,
            scraped.markdown,
            scraped.links
        );
        summary.postsFound = candidates.length;

        if (candidates.length === 0) {
            await Politician.findByIdAndUpdate(politician._id, {
                $set: {
                    lastScrapedAt: new Date(),
                    lastScrapeStatus: 'partial',
                    lastScrapeError: 'No posts parsed from Firecrawl response',
                },
            });
            summary.status = 'error';
            summary.error = 'No posts parsed from Firecrawl response';
            return summary;
        }

        summary.postsUpserted = await upsertScoredPosts(politician, candidates);
        await recomputePoliticianStats(String(politician._id));

        await Politician.findByIdAndUpdate(politician._id, {
            $set: {
                lastScrapedAt: new Date(),
                lastScrapeStatus: 'success',
            },
            $unset: { lastScrapeError: 1 },
        });

        return summary;
    } catch (error: any) {
        const message = error?.message || 'Unknown scrape error';
        await Politician.findByIdAndUpdate(politician._id, {
            $set: {
                lastScrapedAt: new Date(),
                lastScrapeStatus: 'error',
                lastScrapeError: message.slice(0, 500),
            },
        });
        summary.status = 'error';
        summary.error = message;
        return summary;
    }
}

export async function runRankPoliticianScrapeBatch(
    options: { limit?: number; slugs?: string[] } = {}
): Promise<RankPoliticianRunResult> {
    await connectDB();

    const firecrawlConfigured = Boolean(process.env.FIRECRAWL_API_KEY);
    const limit = Math.max(1, Math.min(options.limit || RANK_POLITICIAN_BATCH_SIZE, 25));

    if (!firecrawlConfigured) {
        return {
            ranAt: new Date().toISOString(),
            firecrawlConfigured: false,
            processed: 0,
            successCount: 0,
            errorCount: 0,
            skippedCount: 0,
            results: [
                {
                    slug: '-',
                    xHandle: '-',
                    status: 'skipped',
                    postsFound: 0,
                    postsUpserted: 0,
                    error: 'FIRECRAWL_API_KEY is not configured',
                },
            ],
        };
    }

    const filter: Record<string, unknown> = { isActive: true };
    if (options.slugs?.length) {
        filter.slug = { $in: options.slugs.map((s) => s.toLowerCase()) };
    }

    const politicians = await Politician.find(filter)
        .sort({ lastScrapedAt: 1, createdAt: 1 })
        .limit(limit)
        .lean();

    const results: PoliticianScrapeSummary[] = [];

    for (const politician of politicians as any[]) {
        const result = await scrapeAndScorePolitician(politician);
        results.push(result);
    }

    return {
        ranAt: new Date().toISOString(),
        firecrawlConfigured: true,
        processed: results.length,
        successCount: results.filter((r) => r.status === 'success').length,
        errorCount: results.filter((r) => r.status === 'error').length,
        skippedCount: results.filter((r) => r.status === 'skipped').length,
        results,
    };
}

export { recomputePoliticianStats };
