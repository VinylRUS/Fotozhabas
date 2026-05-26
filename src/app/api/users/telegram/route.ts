import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/telegram - List telegram users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const users = await db.telegramUser.findMany({
      take: limit,
      skip: offset,
      orderBy: { postsCount: 'desc' },
      include: { moderator: true },
    });

    const total = await db.telegramUser.count();

    return NextResponse.json({ users, total });
  } catch (error) {
    console.error('Error fetching telegram users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
