import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/votes - List vote sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;

    const sessions = await db.voteSession.findMany({
      where,
      include: {
        post: { include: { author: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching vote sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch vote sessions' }, { status: 500 });
  }
}
