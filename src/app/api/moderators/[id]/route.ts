import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/moderators/[id] - Update moderator role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    const moderator = await db.moderator.update({
      where: { id },
      data: { role },
      include: { user: true },
    });

    return NextResponse.json(moderator);
  } catch (error) {
    console.error('Error updating moderator:', error);
    return NextResponse.json({ error: 'Failed to update moderator' }, { status: 500 });
  }
}

// DELETE /api/moderators/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.moderator.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting moderator:', error);
    return NextResponse.json({ error: 'Failed to delete moderator' }, { status: 500 });
  }
}
