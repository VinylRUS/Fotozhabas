import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/moderators
export async function GET() {
  try {
    const moderators = await db.moderator.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(moderators);
  } catch (error) {
    console.error('Error fetching moderators:', error);
    return NextResponse.json({ error: 'Failed to fetch moderators' }, { status: 500 });
  }
}

// POST /api/moderators
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, username, firstName, lastName, role, addedById } = body;

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    // Find or create the telegram user
    let user = await db.telegramUser.findUnique({
      where: { telegramId: String(telegramId) },
    });

    if (!user) {
      user = await db.telegramUser.create({
        data: {
          telegramId: String(telegramId),
          username,
          firstName,
          lastName,
        },
      });
    }

    // Check if already a moderator
    const existing = await db.moderator.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already a moderator' }, { status: 409 });
    }

    const moderator = await db.moderator.create({
      data: {
        userId: user.id,
        role: role || 'MODERATOR',
        addedById,
      },
      include: { user: true },
    });

    return NextResponse.json(moderator, { status: 201 });
  } catch (error) {
    console.error('Error creating moderator:', error);
    return NextResponse.json({ error: 'Failed to create moderator' }, { status: 500 });
  }
}
