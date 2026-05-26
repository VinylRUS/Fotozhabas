import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/stats - Dashboard statistics
export async function GET() {
  try {
    const [
      totalPosts,
      pendingPosts,
      approvedPosts,
      rejectedPosts,
      postedPosts,
      deferredPosts,
      totalChannels,
      totalModerators,
      totalUsers,
      recentVotes,
    ] = await Promise.all([
      db.post.count(),
      db.post.count({ where: { status: 'PENDING' } }),
      db.post.count({ where: { status: 'APPROVED' } }),
      db.post.count({ where: { status: 'REJECTED' } }),
      db.post.count({ where: { status: 'POSTED' } }),
      db.post.count({ where: { status: 'DEFERRED' } }),
      db.channel.count(),
      db.moderator.count(),
      db.telegramUser.count(),
      db.voteSession.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          post: { include: { author: true } },
          _count: { select: { votes: true } },
        },
      }),
    ]);

    // Top submitters
    const topSubmitters = await db.telegramUser.findMany({
      take: 5,
      orderBy: { acceptedCount: 'desc' },
      where: { postsCount: { gt: 0 } },
    });

    // Posts by type
    const photoPosts = await db.post.count({ where: { type: 'PHOTO' } });
    const youtubePosts = await db.post.count({ where: { type: 'YOUTUBE' } });
    const textPosts = await db.post.count({ where: { type: 'TEXT' } });

    return NextResponse.json({
      posts: {
        total: totalPosts,
        pending: pendingPosts,
        approved: approvedPosts,
        rejected: rejectedPosts,
        posted: postedPosts,
        deferred: deferredPosts,
      },
      postsByType: {
        photo: photoPosts,
        youtube: youtubePosts,
        text: textPosts,
      },
      channels: totalChannels,
      moderators: totalModerators,
      users: totalUsers,
      topSubmitters,
      recentVotes,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
