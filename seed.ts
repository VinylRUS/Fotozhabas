// Seed script for demo data
// Run with: bun run seed

import { db } from './src/lib/db';

async function seed() {
  console.log('🌱 Seeding demo data...');

  // Create a default channel
  const channel = await db.channel.upsert({
    where: { telegramId: '@streampost_demo' },
    update: {},
    create: {
      telegramId: '@streampost_demo',
      name: 'StreamPost Demo Channel',
      isDefault: true,
    },
  });
  console.log(`✅ Channel: ${channel.name}`);

  // Create telegram users
  const users = await Promise.all([
    db.telegramUser.upsert({
      where: { telegramId: '100001' },
      update: {},
      create: { telegramId: '100001', username: 'cat_meme_lord', firstName: 'Meme', postsCount: 3, acceptedCount: 1 },
    }),
    db.telegramUser.upsert({
      where: { telegramId: '100002' },
      update: {},
      create: { telegramId: '100002', username: 'video_fan_42', firstName: 'Video', postsCount: 2, acceptedCount: 0 },
    }),
    db.telegramUser.upsert({
      where: { telegramId: '100003' },
      update: {},
      create: { telegramId: '100003', username: 'deep_thinker', firstName: 'Deep', postsCount: 1, acceptedCount: 0 },
    }),
    db.telegramUser.upsert({
      where: { telegramId: '99999' },
      update: {},
      create: { telegramId: '99999', username: 'streamer_admin', firstName: 'Streamer', trustLevel: 2, postsCount: 0, acceptedCount: 0 },
    }),
  ]);
  console.log(`✅ Users: ${users.length} created`);

  // Create demo posts
  const posts = await Promise.all([
    db.post.create({
      data: {
        type: 'PHOTO',
        status: 'PENDING',
        text: 'Мой кот только что сделал ЭТО 😂',
        mediaUrl: 'https://placecats.com/800/600',
        authorId: users[0].id,
        channelId: channel.id,
      },
    }),
    db.post.create({
      data: {
        type: 'YOUTUBE',
        status: 'PENDING',
        text: null,
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        youtubeTitle: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
        youtubeThumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        authorId: users[1].id,
        channelId: channel.id,
      },
    }),
    db.post.create({
      data: {
        type: 'TEXT',
        status: 'PENDING',
        text: 'Если вы смотрите этот стрим, знайте — вы лучшие! 💜 Спасибо за поддержку, без вас я бы не справился с этим проектом.',
        authorId: users[2].id,
        channelId: channel.id,
      },
    }),
    db.post.create({
      data: {
        type: 'PHOTO',
        status: 'PENDING',
        text: 'Вид из окна сегодня — красота! 🌅',
        mediaUrl: 'https://picsum.photos/800/600?random=1',
        authorId: users[0].id,
        channelId: channel.id,
      },
    }),
  ]);
  console.log(`✅ Posts: ${posts.length} created`);

  // Create admin moderator
  const mod = await db.moderator.upsert({
    where: { userId: users[3].id },
    update: {},
    create: {
      userId: users[3].id,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Moderator: ${mod.role}`);

  // Create default settings
  const settings = [
    { key: 'voteDuration', value: '30' },
    { key: 'voteThreshold', value: '3' },
    { key: 'autoPostThreshold', value: '70' },
    { key: 'voteMessageTemplate', value: '🎬 Голосование начинается! Напиши 1 ЗА или 2 ПРОТИВ в чате!' },
    { key: 'postPrefix', value: '📢' },
    { key: 'postSuffix', value: '' },
  ];

  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`✅ Settings: ${settings.length} created`);

  console.log('\n🎉 Demo data seeded successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
