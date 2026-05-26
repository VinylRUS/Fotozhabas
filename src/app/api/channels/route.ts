import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/channels
export async function GET() {
  try {
    const channels = await db.channel.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

// POST /api/channels
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, name, isDefault } = body;

    if (!telegramId || !name) {
      return NextResponse.json({ error: 'telegramId and name are required' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.channel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const channel = await db.channel.create({
      data: { telegramId, name, isDefault: isDefault || false },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
  }
}
