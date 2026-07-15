import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { claimFirstAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await claimFirstAdmin(session.user.email);
        if (!result.claimed) {
            return NextResponse.json(
                { error: result.reason || 'Could not claim first admin' },
                { status: 409 }
            );
        }

        return NextResponse.json({
            message: 'First admin claimed',
            email: session.user.email,
            isAdmin: true,
        });
    } catch (error: any) {
        console.error('claim-first admin failed:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to claim first admin' },
            { status: 500 }
        );
    }
}
