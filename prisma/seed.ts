/**
 * Development seed — creates a demo author, a demo reader and a few articles.
 * Run with: npm run db:seed
 */
import { PrismaClient, ArticleStatus } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Passw0rd!';

const longBody = (topic: string): string =>
  `${topic}. ` +
  'This is a demo article body written to comfortably exceed the fifty character ' +
  'minimum content requirement enforced by the validation layer.';

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const author = await prisma.user.upsert({
    where: { email: 'author@afrolink.dev' },
    update: {},
    create: {
      name: 'Ada Author',
      email: 'author@afrolink.dev',
      password: passwordHash,
      role: 'author',
    },
  });

  await prisma.user.upsert({
    where: { email: 'reader@afrolink.dev' },
    update: {},
    create: {
      name: 'Ray Reader',
      email: 'reader@afrolink.dev',
      password: passwordHash,
      role: 'reader',
    },
  });

  const existing = await prisma.article.count({ where: { authorId: author.id } });
  if (existing === 0) {
    await prisma.article.createMany({
      data: [
        {
          title: 'The Future of African Tech',
          content: longBody('African startups are reshaping global technology'),
          category: 'Tech',
          status: ArticleStatus.Published,
          authorId: author.id,
        },
        {
          title: 'Elections 2026: What To Expect',
          content: longBody('A look ahead at the upcoming election cycle'),
          category: 'Politics',
          status: ArticleStatus.Published,
          authorId: author.id,
        },
        {
          title: 'Wellness Trends Worth Watching',
          content: longBody('Draft notes on the health trends of the year'),
          category: 'Health',
          status: ArticleStatus.Draft,
          authorId: author.id,
        },
      ],
    });
  }

  console.log('✅ Seed complete.');
  console.log(`   Author -> author@afrolink.dev  (password: ${DEMO_PASSWORD})`);
  console.log(`   Reader -> reader@afrolink.dev  (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
