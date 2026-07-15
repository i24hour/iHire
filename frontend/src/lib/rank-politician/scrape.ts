export interface ScrapedPostCandidate {
    externalId: string;
    text: string;
    postUrl?: string;
    postedAt?: Date;
    rawMarkdown?: string;
}

export interface FirecrawlScrapeResult {
    markdown: string;
    links: string[];
    raw?: unknown;
}

const STATUS_URL_RE =
    /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)\/status\/(\d+)/gi;

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2/scrape';
const DEFAULT_TIMEOUT_MS = 45000;

function cleanPostText(text: string): string {
    return text
        .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/https?:\/\/t\.co\/\S+/gi, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_`>~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isNoiseLine(line: string): boolean {
    const normalized = line.toLowerCase().trim();
    if (!normalized) return true;
    if (normalized.length < 8) return true;
    if (/^(home|explore|notifications|messages|profile|repost|reply|like|share|follow|following|followers)$/i.test(normalized)) {
        return true;
    }
    if (/^\d+\s+(replies|reposts|likes|views|quotes)$/i.test(normalized)) return true;
    if (/^@\w+$/.test(normalized)) return true;
    return false;
}

export function parsePostsFromFirecrawl(
    handle: string,
    markdown: string,
    links: string[] = []
): ScrapedPostCandidate[] {
    const normalizedHandle = handle.replace(/^@/, '').toLowerCase();
    const candidates = new Map<string, ScrapedPostCandidate>();

    const allUrls = new Set<string>();
    for (const link of links) {
        if (link) allUrls.add(link);
    }
    for (const match of markdown.matchAll(STATUS_URL_RE)) {
        allUrls.add(match[0]);
    }

    for (const url of allUrls) {
        STATUS_URL_RE.lastIndex = 0;
        const match = STATUS_URL_RE.exec(url);
        if (!match) continue;

        const statusHandle = match[1].toLowerCase();
        const statusId = match[2];
        if (statusHandle !== normalizedHandle) continue;

        const externalId = `x:${normalizedHandle}:${statusId}`;
        const postUrl = `https://x.com/${normalizedHandle}/status/${statusId}`;

        // Prefer text in the paragraph preceding the status URL in markdown.
        const urlIndex = markdown.search(
            new RegExp(`https?:\\/\\/(?:www\\.)?(?:x\\.com|twitter\\.com)\\/${normalizedHandle}\\/status\\/${statusId}`, 'i')
        );
        let nearby = '';
        if (urlIndex >= 0) {
            const start = Math.max(0, urlIndex - 500);
            nearby = markdown.slice(start, urlIndex);
        } else {
            const idIndex = markdown.indexOf(statusId);
            if (idIndex >= 0) {
                nearby = markdown.slice(Math.max(0, idIndex - 500), idIndex);
            }
        }

        const text = cleanPostText(nearby.replace(STATUS_URL_RE, ' '));
        if (!text || text.length < 16) continue;

        candidates.set(externalId, {
            externalId,
            text,
            postUrl,
            rawMarkdown: nearby.slice(0, 2000),
        });
    }

    // Fallback: split markdown into blocks when status URLs are missing/incomplete.
    if (candidates.size === 0 && markdown.trim()) {
        const blocks = markdown
            .split(/\n{2,}/)
            .map((block) => cleanPostText(block))
            .filter((block) => block.length >= 40 && !isNoiseLine(block));

        for (const text of blocks.slice(0, 20)) {
            const externalId = `x:${normalizedHandle}:block:${hashText(text)}`;
            if (candidates.has(externalId)) continue;
            candidates.set(externalId, {
                externalId,
                text: text.slice(0, 2000),
                postUrl: `https://x.com/${normalizedHandle}`,
                rawMarkdown: text.slice(0, 2000),
            });
        }
    }

    return Array.from(candidates.values()).slice(0, 40);
}

function hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
}

export async function scrapeXProfileWithFirecrawl(
    profileUrl: string,
    apiKey: string = process.env.FIRECRAWL_API_KEY || ''
): Promise<FirecrawlScrapeResult> {
    if (!apiKey) {
        throw new Error('FIRECRAWL_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const response = await fetch(FIRECRAWL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                url: profileUrl,
                formats: ['markdown', 'links'],
                onlyMainContent: true,
                waitFor: 2000,
                timeout: 40000,
            }),
            signal: controller.signal,
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                payload?.error ||
                payload?.message ||
                `Firecrawl scrape failed (${response.status})`;
            throw new Error(message);
        }

        if (payload?.success === false) {
            throw new Error(payload?.error || 'Firecrawl returned success=false');
        }

        const data = payload?.data || {};
        return {
            markdown: typeof data.markdown === 'string' ? data.markdown : '',
            links: Array.isArray(data.links) ? data.links.filter((l: unknown) => typeof l === 'string') : [],
            raw: payload,
        };
    } finally {
        clearTimeout(timeout);
    }
}
