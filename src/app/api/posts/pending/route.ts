import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/posts/pending - Get all pending posts for moderation
export async function GET() {
  try {
    const posts = await db.post.findMany({
      where: { status: 'PENDING' },
      include: {
        author: true,
        channel: true,
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching pending posts:', error);
    return NextResponse.json({ error: 'Failed to fetch pending posts' }, { status: 500 });
  }
}
