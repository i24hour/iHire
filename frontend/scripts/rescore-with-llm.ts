/**
 * Reclassify existing posts with Bedrock Kimi via the app's LLM classifier.
 *
 *   cd frontend && npx tsx scripts/rescore-with-llm.ts
 *   SLUG=devendra-fadnavis LIMIT=15 npx tsx scripts/rescore-with-llm.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { classifyPostWithLlm } from '../src/lib/rank-politician/classify-llm';
import { aggregatePoliticianStats } from '../src/lib/rank-politician/score';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path: string) {
    try {
        const text = readFileSync(path, 'utf8');
        for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq < 0) continue;
            const key = trimmed.slice(0, eq).trim();
            let value = trimmed.slice(eq + 1).trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            if (!process.env[key]) process.env[key] = value;
        }
    } catch {
        // optional
    }
}

loadEnv(resolve(__dirname, '../../.env.local'));
loadEnv(resolve(__dirname, '../.env.local'));
loadEnv(resolve(__dirname, '../../.vercel/.env.production.local'));

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
    if (!process.env.AWS_BEARER_TOKEN_BEDROCK && !process.env.LITELLM_API_KEY) {
        throw new Error('AWS_BEARER_TOKEN_BEDROCK (or LITELLM_API_KEY) missing');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const politicians = mongoose.connection.collection('politicians');
    const posts = mongoose.connection.collection('politicianposts');

    const slugFilter = (process.env.SLUG || '').trim().toLowerCase();
    const limit = Math.max(0, Number(process.env.LIMIT || 0) || 0);

    const query: Record<string, unknown> = { isActive: { $ne: false } };
    if (slugFilter) query.slug = slugFilter;

    const list = await politicians.find(query).toArray();
    console.log(`LLM rescoring ${list.length} politician(s)...`);

    for (const politician of list) {
        let politicianPosts = await posts
            .find({ politicianId: politician._id })
            .sort({ postedAt: -1 })
            .toArray();

        if (limit > 0) politicianPosts = politicianPosts.slice(0, limit);

        let llmOk = 0;
        let llmFail = 0;

        for (const post of politicianPosts) {
            try {
                const classified = await classifyPostWithLlm(String(post.text || ''), {
                    politicianName: String(politician.name || ''),
                    portfolio: String(politician.portfolio || ''),
                    portfolioTopics: (politician.portfolioTopics || []) as string[],
                });
                await posts.updateOne(
                    { _id: post._id },
                    {
                        $set: {
                            category: classified.category,
                            score: classified.score,
                            scoreReason: classified.scoreReason,
                            scoredBy: 'llm',
                            scoredAt: new Date(),
                            updatedAt: new Date(),
                        },
                    }
                );
                llmOk++;
                console.log(
                    `  [${politician.slug}] ${classified.category} (${classified.score}) :: ${String(post.text || '')
                        .slice(0, 70)
                        .replace(/\s+/g, ' ')}`
                );
            } catch (error: any) {
                llmFail++;
                console.error(`  [${politician.slug}] FAIL:`, error?.message || error);
            }
        }

        const all = await posts.find({ politicianId: politician._id }).toArray();
        const stats = aggregatePoliticianStats(
            all.map((p) => ({
                category: (p.category || 'unknown') as any,
                score: Number(p.score || 0),
            }))
        );

        await politicians.updateOne(
            { _id: politician._id },
            {
                $set: {
                    stats: { ...stats, lastScoredAt: new Date() },
                    updatedAt: new Date(),
                },
            }
        );

        console.log(
            `${politician.slug}: llm_ok=${llmOk} llm_fail=${llmFail} on=${stats.onPortfolioPct}% net=${stats.netScore}`
        );
    }

    await mongoose.disconnect();
    console.log('Done.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
