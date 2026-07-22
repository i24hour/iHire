import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
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

const UPDATES = [
    {
        slug: 'narendra-modi',
        portfolio: 'Personnel / Atomic Energy / Space',
        portfolioTopics: [
            'personnel', 'public grievances', 'pensions', 'administrative reforms',
            'department of personnel', 'dopt', 'lokpal', 'cvc',
            'atomic energy', 'nuclear energy', 'nuclear power', 'dae',
            'space programme', 'space program', 'space mission', 'space research',
            'indian space', 'isro', 'department of space', 'satellite launch',
            'satellite', 'gslv', 'pslv',
            'परमाणु', 'अंतरिक्ष', 'कार्मिक', 'पेंशन',
        ],
    },
    {
        slug: 'amit-shah',
        portfolio: 'Home Affairs / Cooperation',
        portfolioTopics: [
            'home affairs', 'internal security', 'police', 'border', 'naxal',
            'terrorism', 'citizenship', 'law and order', 'suraksha', 'gribh',
            'cooperation', 'cooperative', 'sahkar', 'सहकारिता',
        ],
    },
    {
        slug: 'ashwini-vaishnaw',
        portfolio: 'Railways / Electronics & IT / Information & Broadcasting',
        portfolioTopics: [
            'railway', 'rail', 'vande bharat', 'station', 'it', 'telecom',
            '5g', 'digital india', 'semiconductor', 'railways', 'sanchar',
            'electronics', 'information technology', 'broadcasting', 'media',
            'information and broadcasting',
        ],
    },
];

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');

    const { classifyPost, aggregatePoliticianStats } = await import(
        '../src/lib/rank-politician/score.ts'
    );

    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const politicians = db.collection('politicians');
    const posts = db.collection('politicianposts');

    for (const update of UPDATES) {
        const topics = update.portfolioTopics.map((t) => t.toLowerCase());
        const pol = await politicians.findOneAndUpdate(
            { slug: update.slug },
            {
                $set: {
                    portfolio: update.portfolio,
                    portfolioTopics: topics,
                    updatedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        const doc = pol?.value || pol;
        if (!doc?._id) {
            console.log('missing politician', update.slug);
            continue;
        }

        const existingPosts = await posts.find({ politicianId: doc._id }).toArray();
        for (const post of existingPosts) {
            const classified = classifyPost(post.text || '', topics);
            await posts.updateOne(
                { _id: post._id },
                {
                    $set: {
                        category: classified.category,
                        score: classified.score,
                        scoreReason: classified.scoreReason,
                        scoredAt: new Date(),
                    },
                }
            );
        }

        const refreshed = await posts
            .find({ politicianId: doc._id })
            .project({ category: 1, score: 1 })
            .toArray();
        const stats = aggregatePoliticianStats(
            refreshed.map((p) => ({
                category: p.category || 'unknown',
                score: Number(p.score || 0),
            }))
        );

        await politicians.updateOne(
            { _id: doc._id },
            {
                $set: {
                    stats: {
                        ...stats,
                        lastScoredAt: new Date(),
                    },
                },
            }
        );

        console.log(
            JSON.stringify(
                {
                    slug: update.slug,
                    portfolio: update.portfolio,
                    postsRescored: existingPosts.length,
                    stats,
                },
                null,
                2
            )
        );
    }

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
