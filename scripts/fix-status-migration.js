/**
 * One-time migration: normalize non-standard status values in the database.
 *
 * Fixes records where status matches /^contactado\//i (e.g. "Contactado/48h",
 * "contactado/24h") by setting them to "contactado".
 *
 * Usage:
 *   node scripts/fix-status-migration.js
 *
 * Requires DATABASE_URL to be set in the environment (or in .env).
 */

// Load .env if present (optional — works without it if DATABASE_URL is exported)
try { require('dotenv').config(); } catch { /* dotenv not installed — DATABASE_URL must be in env */ }

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTable(modelName, findMany, update) {
  const records = await findMany({
    where: { status: { contains: '/' } },
    select: { id: true, status: true },
  });

  const toFix = records.filter(r => /^contactado\//i.test(r.status));

  if (toFix.length === 0) {
    console.log(`${modelName}: no records to fix`);
    return 0;
  }

  for (const record of toFix) {
    await update({
      where: { id: record.id },
      data: { status: 'contactado' },
    });
  }

  console.log(`${modelName}: fixed ${toFix.length} record(s)`);
  return toFix.length;
}

async function main() {
  console.log('Starting status migration...');

  const ytFixed = await fixTable(
    'YouTubeProducer',
    (args) => prisma.youTubeProducer.findMany(args),
    (args) => prisma.youTubeProducer.update(args),
  );

  const plFixed = await fixTable(
    'PlacementProducer',
    (args) => prisma.placementProducer.findMany(args),
    (args) => prisma.placementProducer.update(args),
  );

  const total = ytFixed + plFixed;
  console.log(`Done. Total records fixed: ${total}`);
}

main()
  .catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
