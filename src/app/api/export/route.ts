import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') || 'json';
  const type = searchParams.get('type') || 'posts'; // posts, users, votes

  try {
    let data: unknown;
    let filename: string;

    switch (type) {
      case 'posts': {
        const posts = await db.post.findMany({
          include: {
            author: { select: { username: true, telegramId: true } },
            channel: { select: { name: true, telegramId: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        data = posts;
        filename = `streampost-posts-${new Date().toISOString().split('T')[0]}`;
        break;
      }
      case 'users': {
        const users = await db.telegramUser.findMany({
          orderBy: { createdAt: 'desc' },
        });
        data = users;
        filename = `streampost-users-${new Date().toISOString().split('T')[0]}`;
        break;
      }
      case 'votes': {
        const votes = await db.voteSession.findMany({
          include: {
            post: { select: { id: true, type: true, text: true } },
          },
          orderBy: { startedAt: 'desc' },
        });
        data = votes;
        filename = `streampost-votes-${new Date().toISOString().split('T')[0]}`;
        break;
      }
      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: posts, users, votes' },
          { status: 400 }
        );
    }

    if (format === 'csv') {
      // Convert to CSV
      const items = data as Record<string, unknown>[];
      if (items.length === 0) {
        return new NextResponse('', {
          headers: { 'Content-Type': 'text/csv' },
        });
      }

      const flatten = (
        obj: Record<string, unknown>,
        prefix = ''
      ): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(
              result,
              flatten(value as Record<string, unknown>, newKey)
            );
          } else {
            result[newKey] = String(value ?? '');
          }
        }
        return result;
      };

      const flatItems = items.map((item) => flatten(item));
      const headers = Object.keys(flatItems[0]);
      const csvRows = [
        headers.join(','),
        ...flatItems.map((item) =>
          headers
            .map((h) => `"${(item[h] || '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ];
      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
