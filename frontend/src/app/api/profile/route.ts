import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { ensureUserHasDefaultUsername } from '@/lib/username';
import { sanitizeProjects, serializeProject, serializePublicProfile } from '@/lib/profile-utils';
import type { ProfileUpdatePayload } from '@/types/profile';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const user = await ensureUserHasDefaultUsername(session.user.email);
        const profile = serializePublicProfile(user as Parameters<typeof serializePublicProfile>[0]);

        return NextResponse.json({
            profile,
            email: session.user.email,
        });
    } catch (error) {
        console.error('Error fetching own profile:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json()) as ProfileUpdatePayload;
        await connectDB();
        await ensureUserHasDefaultUsername(session.user.email);

        const update: Record<string, unknown> = {};

        if (typeof body.headline === 'string') {
            update.headline = body.headline.trim().slice(0, 120);
        }
        if (typeof body.bio === 'string') {
            update.bio = body.bio.trim().slice(0, 500);
        }
        if (Array.isArray(body.projects)) {
            const sanitized = sanitizeProjects(body.projects);
            for (const project of sanitized) {
                if (project.siteUrl && !project.siteUrl.startsWith('http')) {
                    return NextResponse.json({ error: 'Invalid site URL' }, { status: 400 });
                }
                if (project.githubUrl && !project.githubUrl.startsWith('http')) {
                    return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
                }
            }
            update.projects = sanitized.map((p) => ({
                title: p.title,
                description: p.description,
                siteUrl: p.siteUrl,
                githubUrl: p.githubUrl,
                technologies: p.technologies,
                createdAt: new Date(),
            }));
        }
        if (typeof body.showGithubContributions === 'boolean') {
            update.showGithubContributions = body.showGithubContributions;
        }

        const updatedUser = await User.findOneAndUpdate(
            { email: session.user.email },
            { $set: update },
            { new: true, upsert: true }
        ).lean();

        const profile = serializePublicProfile(updatedUser as Parameters<typeof serializePublicProfile>[0]);

        return NextResponse.json({
            success: true,
            profile,
            projects: (updatedUser?.projects || []).map(serializeProject),
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
