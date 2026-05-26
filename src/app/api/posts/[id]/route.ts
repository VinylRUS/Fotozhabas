import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await db.post.findUnique({
      where: { id },
      include: {
        author: true,
        channel: true,
        voteSessions: { include: { votes: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PATCH /api/posts/[id] - Update post (approve/reject/post/defer)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reviewerId } = body;

    const existing = await db.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const updateData: any = { status };
    if (reviewerId) updateData.reviewerId = reviewerId;

    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.reviewedAt = new Date();
    }

    if (status === 'POSTED') {
      updateData.postedAt = new Date();
    }

    const post = await db.post.update({
      where: { id },
      data: updateData,
      include: {
        author: true,
        channel: true,
      },
    });

    // Update author stats
    if (status === 'APPROVED' || status === 'POSTED') {
      await db.telegramUser.update({
        where: { id: post.authorId },
        data: { acceptedCount: { increment: 1 } },
      });
    } else if (status === 'REJECTED') {
      await db.telegramUser.update({
        where: { id: post.authorId },
        data: { rejectedCount: { increment: 1 } },
      });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
