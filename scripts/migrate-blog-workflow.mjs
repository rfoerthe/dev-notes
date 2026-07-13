import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { exitWithKnownSetupError, initializeAdminApp } from './firebase-admin-utils.mjs';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const confirmed = args.has('--yes');

const asTimestamp = (value) => {
  if (value instanceof Timestamp) return value;
  if (value && typeof value.toDate === 'function') return Timestamp.fromDate(value.toDate());
  const date = new Date(value || Date.now());
  return Timestamp.fromDate(Number.isNaN(date.getTime()) ? new Date() : date);
};

const main = async () => {
  if (!dryRun && !confirmed) {
    console.error('Run with --dry-run to inspect the migration or --yes to apply it.');
    process.exit(1);
  }

  initializeAdminApp();
  const db = getFirestore();
  const snapshot = await db.collection('blogs').get();
  const migrations = snapshot.docs.filter(document => {
    const data = document.data();
    return !data.status || !data.updatedAt ||
      (data.status !== 'draft' && !data.publishedAt) ||
      typeof data.createdAt === 'string';
  });

  console.log(`${migrations.length} of ${snapshot.size} blog post(s) require workflow migration.`);
  if (dryRun || migrations.length === 0) return;

  for (let index = 0; index < migrations.length; index += 450) {
    const batch = db.batch();
    migrations.slice(index, index + 450).forEach(document => {
      const data = document.data();
      const createdAt = asTimestamp(data.createdAt);
      batch.update(document.ref, {
        createdAt,
        updatedAt: asTimestamp(data.updatedAt || createdAt),
        publishedAt: data.status === 'draft' ? null : asTimestamp(data.publishedAt || createdAt),
        status: data.status || 'published'
      });
    });
    await batch.commit();
  }

  console.log(`Migrated ${migrations.length} blog post(s) to the release 1 workflow schema.`);
};

try {
  await main();
} catch (error) {
  try {
    exitWithKnownSetupError(error);
  } catch (unknownError) {
    console.error(unknownError?.message || unknownError);
    process.exit(1);
  }
}
